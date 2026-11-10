"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import { patchCommitment } from "@/lib/api/commitments";
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
