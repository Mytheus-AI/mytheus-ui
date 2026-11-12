"use server";

import { ApiError } from "@/lib/api/client";
import { putDelegatedAnswers } from "@/lib/api/delegated-answers";
import type { DelegatedAnswers } from "@/lib/api/only-mytheus-types";
import { checkStatements } from "@/lib/delegated-answers";
import { isUuid } from "@/lib/reversals";

/* Save the statements your Myte may answer from when it attends for you (only-Mytheus wave,
   contract section 2). Self only: the server takes the person from the session. The same limits
   as the editor run here, so a hand-made call cannot send past them. */

export type DelegatedResult = { ok: true; saved: DelegatedAnswers } | { ok: false; message: string; locked?: boolean };

export async function saveDelegatedAnswers(meetingId: string, statements: string[]): Promise<DelegatedResult> {
  if (!isUuid(meetingId)) return { ok: false, message: "That meeting no longer exists." };
  const checked = checkStatements(statements);
  if (!checked.ok) return { ok: false, message: checked.message };
  try {
    return { ok: true, saved: await putDelegatedAnswers(meetingId, checked.statements) };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 403 || err.status === 404) return { ok: false, message: "Only people invited to this meeting can do this." };
      if (err.status === 409) return { ok: false, message: "This meeting is over, so its answers can no longer change.", locked: true };
      if (err.status === 422) return { ok: false, message: "Some statements weren't accepted. Keep each to 300 characters." };
    }
    return { ok: false, message: "Your statements couldn't be saved just now. Try again in a moment." };
  }
}
