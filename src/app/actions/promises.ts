"use server";

import { revalidatePath } from "next/cache";

import { api, ApiError } from "@/lib/api/client";
import {
  fetchCapacity,
  fetchCapacityCheck,
  fetchLedger,
  patchPromise,
  postConfirm,
  postDateProposal,
  postHandOff,
  postPromise,
  postProposalDecision,
  postUndoHandOff,
  putCapturePreferences,
} from "@/lib/api/promises";
import {
  LEDGER_LIMITS,
  isIsoDate,
  type Capacity,
  type CapacityCheck,
  type CaptureSettings,
  type DateProposal,
  type LedgerPromise,
  type PromiseLedgerBody,
  type PromiseStatus,
  type RenegotiateResult,
} from "@/lib/promises/ledger";

/* The promise ledger's writes and its client-side reads (the capacity in the viewer's own zone,
   the live check while a date is picked). Everything is the caller's own: core-api answers 404 to
   anyone else, and nothing about the user or the tenant is taken from the input. Each answers a
   plain result; the client applies changes at once and rolls back on a refusal. */

type Fail = { ok: false; message: string; gone?: boolean };
export type LedgerResult<T extends object = object> = ({ ok: true } & T) | Fail;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = new Set<PromiseStatus>(["open", "done", "dismissed"]);
const ZONE = /^[A-Za-z0-9_+\-/]{1,64}$/;

const zone = (tz?: string | null) => (tz && ZONE.test(tz) ? tz : undefined);

function failure(err: unknown, fallback: string): Fail {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 404) return { ok: false, message: "That promise is no longer here.", gone: true };
    if (err.status === 403 && err.reason === "read_only_token") return { ok: false, message: "This session can only read." };
    if (err.status === 409) {
      if (err.reason === "handoff_settled") return { ok: false, message: "They already confirmed or dismissed it, so it stays with them." };
      if (err.reason === "decided") return { ok: false, message: "That was already decided.", gone: true };
      return { ok: false, message: err.message || "That change is no longer possible." };
    }
    if (err.status === 422) return { ok: false, message: err.message && !err.message.startsWith("HTTP") ? err.message : "Some details weren't accepted. Check them and try again." };
  }
  return { ok: false, message: fallback };
}

function refresh() {
  revalidatePath("/work/promises");
  revalidatePath("/work/tasks");
  revalidatePath("/dashboard");
}

/* ---------------- reads the client asks for ---------------- */

export async function loadLedger(): Promise<LedgerResult<{ ledger: PromiseLedgerBody }>> {
  try {
    return { ok: true, ledger: await fetchLedger() };
  } catch (err) {
    return failure(err, "Your promises could not be read just now.");
  }
}

export async function loadCapacity(tz: string | null): Promise<LedgerResult<{ capacity: Capacity }>> {
  try {
    return { ok: true, capacity: await fetchCapacity(zone(tz)) };
  } catch (err) {
    return failure(err, "Your week could not be read just now.");
  }
}

export async function checkCapacity(
  dueDate: string,
  tz: string | null,
  exclude?: { kind: "commitment" | "action"; id: string },
): Promise<LedgerResult<{ check: CapacityCheck }>> {
  if (!isIsoDate(dueDate)) return { ok: false, message: "Pick a valid date." };
  if (exclude && !UUID.test(exclude.id)) exclude = undefined;
  try {
    return { ok: true, check: await fetchCapacityCheck(dueDate, zone(tz), exclude) };
  } catch (err) {
    return failure(err, "Your agent could not check that day just now.");
  }
}

/** After an action was accepted in the app (a confirmed card, a task you gave yourself): if it is
    yours and has a date, what it does to that day. `check: null` when there is nothing to say. */
export async function checkAcceptedAction(
  actionId: string,
  tz: string | null,
): Promise<LedgerResult<{ check: CapacityCheck | null }>> {
  if (!UUID.test(actionId)) return { ok: true, check: null };
  try {
    const mine = await api<{ items?: { id: string; due_date: string | null }[] }>("/api/v1/actions/mine", {
      query: { status: "confirmed" },
    });
    const task = mine.items?.find((t) => t.id === actionId);
    if (!task?.due_date) return { ok: true, check: null };
    const check = await fetchCapacityCheck(task.due_date, zone(tz), { kind: "action", id: actionId });
    return { ok: true, check: check.warn ? check : null };
  } catch {
    return { ok: true, check: null }; // a heads-up only; never block the accept it follows
  }
}

/* ---------------- writes ---------------- */

export async function setPromiseStatus(id: string, status: PromiseStatus): Promise<LedgerResult<{ promise: LedgerPromise }>> {
  if (!UUID.test(id)) return { ok: false, message: "That promise no longer exists.", gone: true };
  if (!STATUSES.has(status)) return { ok: false, message: "That change is not possible." };
  try {
    const promise = await patchPromise(id, { status });
    refresh();
    return { ok: true, promise };
  } catch (err) {
    return failure(err, "Your promise could not be updated just now. Try again in a moment.");
  }
}

export async function setPromiseDue(id: string, due: string | null): Promise<LedgerResult<{ promise: LedgerPromise }>> {
  if (!UUID.test(id)) return { ok: false, message: "That promise no longer exists.", gone: true };
  if (due !== null && !isIsoDate(due)) return { ok: false, message: "Pick a valid date." };
  try {
    const promise = await patchPromise(id, due ? { due_at: due } : { clear_due: true });
    refresh();
    return { ok: true, promise };
  } catch (err) {
    return failure(err, "The date could not be changed just now.");
  }
}

export async function confirmPromise(
  id: string,
  dueAt: string | null,
  tz: string | null,
): Promise<LedgerResult<{ promise: LedgerPromise; capacity: CapacityCheck | null }>> {
  if (!UUID.test(id)) return { ok: false, message: "That promise no longer exists.", gone: true };
  if (dueAt !== null && !isIsoDate(dueAt)) return { ok: false, message: "Pick a valid date." };
  try {
    const out = await postConfirm(id, dueAt, zone(tz));
    refresh();
    return { ok: true, promise: out.promise, capacity: out.capacity };
  } catch (err) {
    return failure(err, "The promise could not be confirmed just now.");
  }
}

export type AddPromiseInput = {
  content: string;
  dueAt: string | null;
  recipientUserId: string | null;
  recipientLabel: string | null;
  sourceLink: string | null;
};

export async function addPromise(
  input: AddPromiseInput,
  tz: string | null,
): Promise<LedgerResult<{ promise: LedgerPromise; capacity: CapacityCheck | null }>> {
  const content = input.content.trim();
  if (!content) return { ok: false, message: "Say what you promised." };
  if (content.length > LEDGER_LIMITS.content) return { ok: false, message: `Keep it under ${LEDGER_LIMITS.content} characters.` };
  if (input.dueAt && !isIsoDate(input.dueAt)) return { ok: false, message: "Pick a valid date." };
  if (input.recipientUserId && !UUID.test(input.recipientUserId)) return { ok: false, message: "Pick someone from your workspace." };
  const label = input.recipientLabel?.trim() || null;
  if (label && label.length > LEDGER_LIMITS.recipient) return { ok: false, message: "That name is too long." };
  const link = input.sourceLink?.trim() || null;
  if (link && (!/^https?:\/\//i.test(link) || link.length > LEDGER_LIMITS.link)) {
    return { ok: false, message: "The link must start with https://." };
  }
  try {
    const out = await postPromise(
      {
        content,
        due_at: input.dueAt || null,
        recipient_user_id: input.recipientUserId,
        recipient_label: input.recipientUserId ? null : label,
        source_link: link,
      },
      zone(tz),
    );
    refresh();
    return { ok: true, promise: out.promise, capacity: out.capacity };
  } catch (err) {
    return failure(err, "Your promise could not be added just now. Try again in a moment.");
  }
}

export async function handOffPromise(
  id: string,
  toUserId: string,
  note: string | null,
): Promise<LedgerResult<{ promise: LedgerPromise; name: string | null }>> {
  if (!UUID.test(id)) return { ok: false, message: "That promise no longer exists.", gone: true };
  if (!UUID.test(toUserId)) return { ok: false, message: "Pick someone from your workspace." };
  const trimmed = note?.trim() || null;
  if (trimmed && trimmed.length > LEDGER_LIMITS.note) return { ok: false, message: `Keep the note under ${LEDGER_LIMITS.note} characters.` };
  try {
    const out = await postHandOff(id, toUserId, trimmed);
    refresh();
    return { ok: true, promise: out.promise, name: out.handed_to_name };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404 && err.message.includes("user")) {
      return { ok: false, message: "That person is no longer in this workspace." };
    }
    return failure(err, "The promise could not be handed off just now.");
  }
}

export async function undoHandOff(id: string): Promise<LedgerResult<{ promise: LedgerPromise }>> {
  if (!UUID.test(id)) return { ok: false, message: "That promise no longer exists.", gone: true };
  try {
    const promise = await postUndoHandOff(id);
    refresh();
    return { ok: true, promise };
  } catch (err) {
    return failure(err, "The promise could not be taken back just now.");
  }
}

export async function renegotiateDate(input: {
  target: "commitment" | "action";
  targetId: string;
  proposedDue: string;
  note: string | null;
}): Promise<LedgerResult<{ result: RenegotiateResult }>> {
  if (!UUID.test(input.targetId)) return { ok: false, message: "That promise no longer exists.", gone: true };
  if (input.target !== "commitment" && input.target !== "action") return { ok: false, message: "That change is not possible." };
  if (!isIsoDate(input.proposedDue)) return { ok: false, message: "Pick a valid date." };
  const note = input.note?.trim() || null;
  if (note && note.length > LEDGER_LIMITS.note) return { ok: false, message: `Keep the note under ${LEDGER_LIMITS.note} characters.` };
  try {
    const result = await postDateProposal({
      target: input.target,
      target_id: input.targetId,
      proposed_due: input.proposedDue,
      note,
    });
    refresh();
    return { ok: true, result };
  } catch (err) {
    return failure(err, "The new date could not be sent just now.");
  }
}

export async function decideProposal(
  id: string,
  verb: "accept" | "decline" | "withdraw",
): Promise<LedgerResult<{ proposal: DateProposal }>> {
  if (!UUID.test(id)) return { ok: false, message: "That request is no longer here.", gone: true };
  if (!["accept", "decline", "withdraw"].includes(verb)) return { ok: false, message: "That change is not possible." };
  try {
    const proposal = await postProposalDecision(id, verb);
    refresh();
    return { ok: true, proposal };
  } catch (err) {
    return failure(err, "That could not be saved just now.");
  }
}

export async function saveCapturePreferences(prefs: {
  slack_enabled: boolean;
  email_enabled: boolean;
}): Promise<LedgerResult<{ capture: CaptureSettings }>> {
  try {
    const capture = await putCapturePreferences({
      slack_enabled: Boolean(prefs.slack_enabled),
      email_enabled: Boolean(prefs.email_enabled),
    });
    revalidatePath("/work/promises");
    return { ok: true, capture };
  } catch (err) {
    return failure(err, "Your choice could not be saved just now.");
  }
}
