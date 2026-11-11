"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import { fetchBetHints, postBetResolve, postBetTransition, putDecisionBet, type BetTransition } from "@/lib/api/bets";
import type { BetHints, BetUpsert, DecisionBetView, Outcome } from "@/lib/api/bets-types";

/* Decisions as bets: what a decision expects to happen, and the owner's call on it. Every write
   is the server's to allow (the bet's owner, the meeting's host or the decision's confirmer);
   a 403 here says so plainly, a 404 means the decision is not one you can see. Nothing is ever
   resolved for a person: resolving is always this action, from their click. */

export type BetResult = { ok: true; view: DecisionBetView } | { ok: false; message: string; gone?: boolean; field?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OUTCOMES: Outcome[] = ["hit", "partly", "missed"];

function failed(err: unknown, fallback: string): { ok: false; message: string; gone?: boolean } {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 404) return { ok: false, message: "This decision is no longer here.", gone: true };
    if (err.status === 403) return { ok: false, message: "Only the bet's owner, the meeting's host or whoever confirmed the decision can change it." };
    if (err.status === 409) return { ok: false, message: "This bet changed since you opened it. Reload to see where it stands." };
    if (err.status === 422) return { ok: false, message: err.message || "Check the expectation and try again." };
  }
  return { ok: false, message: fallback };
}

function refresh(meetingId: string | undefined, decisionId: string) {
  if (meetingId && UUID.test(meetingId)) revalidatePath(`/meetings/${meetingId}/decisions/${decisionId}`);
  revalidatePath("/decisions/calls");
}

export async function saveBet(decisionId: string, body: BetUpsert, meetingId?: string): Promise<BetResult> {
  if (!UUID.test(decisionId)) return { ok: false, message: "This decision is no longer here.", gone: true };
  try {
    const view = await putDecisionBet(decisionId, body);
    refresh(meetingId, decisionId);
    return { ok: true, view };
  } catch (err) {
    return failed(err, "The expectation couldn't be saved just now. Try again in a moment.");
  }
}

export async function stepBet(decisionId: string, step: BetTransition, meetingId?: string): Promise<BetResult> {
  if (!UUID.test(decisionId)) return { ok: false, message: "This decision is no longer here.", gone: true };
  if (!["accept", "dismiss", "restore", "reopen"].includes(step)) return { ok: false, message: "That isn't something a bet can do." };
  try {
    const view = await postBetTransition(decisionId, step);
    refresh(meetingId, decisionId);
    return { ok: true, view };
  } catch (err) {
    return failed(err, "That couldn't be saved just now. Try again in a moment.");
  }
}

export async function resolveBet(
  decisionId: string,
  input: { outcome: Outcome; assumption_held: boolean | null; lesson: string },
  meetingId?: string,
): Promise<BetResult> {
  if (!UUID.test(decisionId)) return { ok: false, message: "This decision is no longer here.", gone: true };
  if (!OUTCOMES.includes(input.outcome)) return { ok: false, message: "Choose hit, partly or missed.", field: "outcome" };
  const lesson = (input.lesson ?? "").replace(/\s+/g, " ").trim();
  if (lesson.length > 500) return { ok: false, message: "Keep the lesson to 500 characters.", field: "lesson" };
  const held = input.assumption_held === true || input.assumption_held === false ? input.assumption_held : null;
  try {
    const view = await postBetResolve(decisionId, { outcome: input.outcome, assumption_held: held, lesson: lesson || null });
    refresh(meetingId, decisionId);
    return { ok: true, view };
  } catch (err) {
    return failed(err, "Your call couldn't be saved just now. Try again in a moment.");
  }
}

export async function loadBetHints(q: string, category: string | null): Promise<BetHints | null> {
  const query = (q ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (query.length < 3) return null;
  try {
    return await fetchBetHints(query, category);
  } catch {
    return null;
  }
}
