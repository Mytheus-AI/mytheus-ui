"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import { fetchCommitments, patchCommitment } from "@/lib/api/commitments";
import type { CommitmentStatus } from "@/lib/api/personal-types";

/* Mark a promise done, dismiss it, or put it back to open (the undo of either). Promises are the
   caller's own (ADR-0039 B6): core-api answers 404 to anyone else, and nothing about the user or
   the tenant is taken from the input. The client applies the change at once and rolls back on a
   refusal. */

export type CommitmentResult = { ok: true } | { ok: false; message: string; gone?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = new Set<CommitmentStatus>(["open", "done", "dismissed"]);

export async function setCommitmentStatus(id: string, status: CommitmentStatus): Promise<CommitmentResult> {
  if (!UUID.test(id)) return { ok: false, message: "That promise no longer exists.", gone: true };
  if (!STATUSES.has(status)) return { ok: false, message: "That change is not possible." };
  try {
    await patchCommitment(id, status);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 404) return { ok: false, message: "That promise no longer exists.", gone: true };
      if (err.status === 422) return { ok: false, message: "That change is not possible for this promise." };
    }
    return { ok: false, message: "Your promise could not be updated just now. Try again in a moment." };
  }
  revalidatePath("/work/promises");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type FindPromiseResult = { ok: true; id: string; status: CommitmentStatus } | { ok: false; message: string; pending?: boolean };

/* The room shows a promise the moment your agent hears it, from the live note; core-api writes the
   row a moment later from the same record. To act on it the room finds that row: yours, in this
   meeting, from that agent window, with that text. Not there yet means core-api is still writing
   it (`pending`), never that it is gone. */
export async function findMeetingPromise(meetingId: string, windowId: string, content: string): Promise<FindPromiseResult> {
  if (!UUID.test(meetingId) || !windowId) return { ok: false, message: "That promise could not be found." };
  try {
    const rows = await fetchCommitments();
    const wanted = content.trim().toLowerCase();
    const mine = rows.filter((r) => r.meeting_id === meetingId && r.status !== "dismissed");
    const row =
      mine.find((r) => r.source_window_id === windowId && r.content.trim().toLowerCase() === wanted) ??
      mine.find((r) => r.content.trim().toLowerCase() === wanted);
    if (!row) return { ok: false, pending: true, message: "Your promise is still being saved. Try again in a moment." };
    return { ok: true, id: row.id, status: row.status };
  } catch (err) {
    if (err instanceof ApiError && err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    return { ok: false, message: "Your promises could not be read just now. Try again in a moment." };
  }
}
