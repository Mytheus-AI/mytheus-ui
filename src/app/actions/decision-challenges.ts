"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import {
  fetchReopenRequest,
  postChallengeDismiss,
  postReopenAccept,
  postReopenDecline,
  postReopenRequest,
  postReopenWithdraw,
} from "@/lib/api/decision-challenges";
import type { DecisionChallenge, ReopenAcceptBody, ReopenRequest } from "@/lib/api/decision-challenges-types";
import { REOPEN_LIMITS, isUuid } from "@/lib/decision-challenges";

/* "Decisions that follow you": dismissing a challenge, asking to reopen a decision, and the
   owner's answer. core-api answers 404 to anyone who may not see the row (any tenant); a request
   that was already settled is 409, and then the server's current row is read back so the screen
   shows what actually happened. Every write revalidates the decision page and the Inbox. */

export type ChallengeResult = { ok: true; challenge: DecisionChallenge } | { ok: false; message: string; gone?: boolean };
export type ReopenResult =
  | { ok: true; request: ReopenRequest }
  | { ok: false; message: string; gone?: boolean; current?: ReopenRequest; field?: "when" | "due" | "note" | "reason" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh(meetingId?: string, decisionId?: string) {
  if (meetingId && decisionId && isUuid(meetingId) && isUuid(decisionId)) {
    revalidatePath(`/meetings/${meetingId}/decisions/${decisionId}`);
  }
  revalidatePath("/inbox");
}

function failure(err: unknown, what: string): { ok: false; message: string; gone?: boolean } {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 404) return { ok: false, message: `That ${what} is no longer here.`, gone: true };
    if (err.status === 422) return { ok: false, message: "That wasn't accepted. Check what you entered." };
    if (err.status === 429) return { ok: false, message: "Too many requests just now. Try again in a minute." };
  }
  return { ok: false, message: "That couldn't be saved just now. Try again in a moment." };
}

export async function dismissChallenge(id: string, meetingId?: string, decisionId?: string): Promise<ChallengeResult> {
  if (!isUuid(id)) return { ok: false, message: "That challenge is no longer here.", gone: true };
  try {
    const challenge = await postChallengeDismiss(id);
    refresh(meetingId, decisionId);
    return { ok: true, challenge };
  } catch (err) {
    return failure(err, "challenge");
  }
}

export async function askToReopen(decisionId: string, meetingId: string, reason: string): Promise<ReopenResult> {
  if (!isUuid(decisionId)) return { ok: false, message: "That decision is no longer here.", gone: true };
  const clean = reason.replace(/\s+/g, " ").trim();
  if (clean.length > REOPEN_LIMITS.reasonMax) {
    return { ok: false, message: `Keep the reason to ${REOPEN_LIMITS.reasonMax} characters.`, field: "reason" };
  }
  try {
    const request = await postReopenRequest(decisionId, { source: "app", ...(clean ? { reason: clean } : {}) });
    refresh(meetingId, decisionId);
    return { ok: true, request };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { ok: false, message: "This decision has already been replaced, so it cannot be reopened." };
    }
    return failure(err, "decision");
  }
}

async function settled(id: string, err: unknown, what: string): Promise<ReopenResult> {
  if (err instanceof ApiError && err.status === 409) {
    const current = await fetchReopenRequest(id).catch(() => undefined);
    return { ok: false, message: "This request was already answered.", current };
  }
  return failure(err, what);
}

export async function withdrawReopen(id: string, meetingId?: string, decisionId?: string): Promise<ReopenResult> {
  if (!isUuid(id)) return { ok: false, message: "That request is no longer here.", gone: true };
  try {
    const request = await postReopenWithdraw(id);
    refresh(meetingId ?? request.meeting_id, decisionId ?? request.decision_id);
    return { ok: true, request };
  } catch (err) {
    return settled(id, err, "request");
  }
}

export async function acceptReopen(id: string, body: ReopenAcceptBody): Promise<ReopenResult> {
  if (!isUuid(id)) return { ok: false, message: "That request is no longer here.", gone: true };
  if (body.outcome !== "revisit" && body.outcome !== "follow_up") {
    return { ok: false, message: "Choose a revisit or a follow-up task." };
  }
  const clean: ReopenAcceptBody = { outcome: body.outcome };
  if (body.note) {
    const note = body.note.replace(/\s+/g, " ").trim();
    if (note.length > REOPEN_LIMITS.noteMax) return { ok: false, message: "Keep the note shorter.", field: "note" };
    if (note) clean.note = note;
  }
  if (body.outcome === "revisit") {
    if (!body.scheduled_start || Number.isNaN(Date.parse(body.scheduled_start))) {
      return { ok: false, message: "Pick when the revisit starts.", field: "when" };
    }
    clean.scheduled_start = new Date(body.scheduled_start).toISOString();
    clean.duration_minutes = Math.min(120, Math.max(15, body.duration_minutes ?? 30));
  } else {
    if (!body.due_date || !DATE.test(body.due_date)) return { ok: false, message: "Pick a due date.", field: "due" };
    clean.due_date = body.due_date;
  }
  try {
    const request = await postReopenAccept(id, clean);
    refresh(request.meeting_id, request.decision_id);
    return { ok: true, request };
  } catch (err) {
    return settled(id, err, "request");
  }
}

export async function declineReopen(id: string, note?: string): Promise<ReopenResult> {
  if (!isUuid(id)) return { ok: false, message: "That request is no longer here.", gone: true };
  const clean = (note ?? "").replace(/\s+/g, " ").trim();
  if (clean.length > REOPEN_LIMITS.noteMax) return { ok: false, message: "Keep the note shorter.", field: "note" };
  try {
    const request = await postReopenDecline(id, clean || undefined);
    refresh(request.meeting_id, request.decision_id);
    return { ok: true, request };
  } catch (err) {
    return settled(id, err, "request");
  }
}
