"use server";

import { listMembers } from "@/lib/api/members";
import {
  deleteAssumption,
  fetchDecisionWhy,
  fetchRevisitSlot,
  patchAssumption,
  postAssumption,
  postBookRevisit,
  postReconfirm,
  postReopen,
} from "@/lib/api/decision-why";
import { failure } from "@/lib/api/why-blast-call";
import type { Act, Assumption, BookedMeeting, DecisionWhy, Load, SlotProposal } from "@/lib/api/why-blast-types";
import { LIMITS, checkDraft, checkNote, isUuid, type AssumptionDraft } from "@/lib/decision-why";
import type { MemberOption } from "@/components/ui/MemberPicker";

/* "Decisions that know why": the re-read the section polls while the agent reads the decision, and
   the owner's writes. core-api decides who the owner is (403 to anyone else) and who may see the
   decision at all (404); nothing about the tenant or the person is taken from the input. */

const gone = { ok: false as const, code: "gone" as const, message: "That reason is no longer here." };
const LIMIT_MSG = `A decision can hold ${LIMITS.perDecision} reasons. Remove one before adding another.`;

export async function readDecisionWhy(decisionId: string): Promise<Load<DecisionWhy>> {
  if (!isUuid(decisionId)) return { ok: false, reason: "none" };
  return fetchDecisionWhy(decisionId);
}

export async function addAssumption(decisionId: string, draft: AssumptionDraft): Promise<Act<Assumption>> {
  if (!isUuid(decisionId)) return { ...gone, message: "This decision is no longer here." };
  const check = checkDraft(draft);
  if (!check.ok) return { ok: false, code: "invalid", message: check.message };
  try {
    return { ok: true, data: await postAssumption(decisionId, check.body) };
  } catch (err) {
    return failure(err, "This decision", LIMIT_MSG);
  }
}

export async function editAssumption(id: string, draft: AssumptionDraft): Promise<Act<Assumption>> {
  if (!isUuid(id)) return gone;
  const check = checkDraft(draft);
  if (!check.ok) return { ok: false, code: "invalid", message: check.message };
  try {
    return { ok: true, data: await patchAssumption(id, check.body) };
  } catch (err) {
    return failure(err, "That reason");
  }
}

/** Shaped for `graceful()` (`lib/toast.ts`): a reason already gone counts as removed. */
export async function removeAssumption(id: string): Promise<{ ok: true } | { ok: false; message: string; gone?: boolean }> {
  if (!isUuid(id)) return { ok: false, message: gone.message, gone: true };
  try {
    await deleteAssumption(id);
    return { ok: true };
  } catch (err) {
    const f = failure(err, "That reason");
    return { ok: false, message: f.message, gone: f.code === "gone" };
  }
}

export async function reconfirmAssumption(id: string, note: string): Promise<Act<Assumption>> {
  if (!isUuid(id)) return gone;
  const check = checkNote(note);
  if (!check.ok) return { ok: false, code: "invalid", message: check.message };
  try {
    return { ok: true, data: await postReconfirm(id, check.note) };
  } catch (err) {
    return failure(err, "That reason");
  }
}

export async function reopenDecision(id: string, note: string | null): Promise<Act<DecisionWhy>> {
  if (!isUuid(id)) return gone;
  const clean = note?.replace(/\s+/g, " ").trim().slice(0, LIMITS.note) || null;
  try {
    return { ok: true, data: await postReopen(id, clean) };
  } catch (err) {
    return failure(err, "That reason");
  }
}

export async function readRevisitSlot(id: string): Promise<Act<SlotProposal>> {
  if (!isUuid(id)) return gone;
  try {
    return { ok: true, data: await fetchRevisitSlot(id) };
  } catch (err) {
    const f = failure(err, "That reason");
    return f.code === "error" ? { ...f, message: "Your agent couldn't find a time just now. Try again in a moment." } : f;
  }
}

export async function bookRevisit(id: string, start: string | null): Promise<Act<BookedMeeting>> {
  if (!isUuid(id)) return gone;
  if (start !== null && Number.isNaN(Date.parse(start))) return { ok: false, code: "invalid", message: "Pick a time for the revisit." };
  try {
    return { ok: true, data: await postBookRevisit(id, start) };
  } catch (err) {
    return failure(err, "That reason", "That time doesn't work. Pick a time at least two hours from now.");
  }
}

/** The people the owner can name as having said a reason. */
export async function loadWhyMembers(): Promise<Act<MemberOption[]>> {
  const members = await listMembers();
  if (!members) return { ok: false, code: "error", message: "We couldn't load your workspace's people just now." };
  return {
    ok: true,
    data: members.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.imageUrl, isYou: m.isYou })),
  };
}
