"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import { postStatusRequests } from "@/lib/api/meeting-precheck";
import type { StatusRequestsAsked } from "@/lib/api/only-mytheus-types";
import { PRECHECK_LIMITS } from "@/lib/meeting-precheck";
import { isUuid } from "@/lib/reversals";

/* "Send status requests instead" from the new-meeting hint (only-Mytheus wave, contract section
   3): ask each task's owner how it is going rather than holding a meeting for it. Owners see it in
   Updates you owe; the asker hears back in their Inbox. */

export type AskResult = { ok: true; asked: StatusRequestsAsked } | { ok: false; message: string };

export async function askForStatusInstead(actionIds: string[]): Promise<AskResult> {
  const ids = Array.from(new Set((Array.isArray(actionIds) ? actionIds : []).filter(isUuid))).slice(0, PRECHECK_LIMITS.askMax);
  if (ids.length === 0) return { ok: false, message: "There is no task to ask about." };
  try {
    const asked = await postStatusRequests(ids);
    revalidatePath("/work/updates");
    return { ok: true, asked };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 422) return { ok: false, message: "Those tasks couldn't be asked about." };
    }
    return { ok: false, message: "The status requests couldn't be sent just now. Try again in a moment." };
  }
}
