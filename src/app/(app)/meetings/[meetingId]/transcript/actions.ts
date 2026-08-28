"use server";

/**
 * The speaker-mapping write. Plan 3-4 §3.8 step 3.
 *
 * A Server Action, per this repo's rule that mutations are the write chokepoint and terminate
 * at `api-gateway`. It carries an `Idempotency-Key` because the endpoint is a mutation and the
 * house rule puts one on every mutating POST/PATCH; `lib/api/client.ts` generates one when the
 * caller does not supply it.
 *
 * `assignment` is deliberately NOT a parameter. `core-api`'s route sets `assignment = 'manual'`
 * as a SQL literal and never from the request body, so there is no value this action could send
 * that would downgrade a row to 'suggested'. R7 says manual is authoritative, and a database
 * trigger (`meeting_speakers_manual_is_authoritative`) is the second guard behind that. Passing
 * an assignment from here would invent a client-controlled path into a property the backend
 * deliberately does not expose.
 */

import { revalidatePath } from "next/cache";
import { ApiError, api } from "@/lib/api/client";

export interface AssignResult {
  ok: boolean;
  error?: string;
}

export async function assignSpeaker(
  meetingId: string,
  speakerId: string,
  userId: string,
): Promise<AssignResult> {
  try {
    await api(
      `/api/v1/meetings/${encodeURIComponent(meetingId)}/speakers/${encodeURIComponent(speakerId)}`,
      { method: "PATCH", body: { user_id: userId } },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      // 422 is the one a user can actually act on: the chosen user is not in this organization.
      // 404 means the meeting is not theirs, and its existence is tenant-confidential, so it is
      // reported as not-found rather than explained.
      return { ok: false, error: error.code };
    }
    return { ok: false, error: "DEPENDENCY_UNAVAILABLE" };
  }

  // Re-read the transcript screen so the relabelled turns appear: §3.8's acceptance check is
  // "assigning a speaker updates `meeting_speakers` AND the transcript view relabels that
  // speaker's turns", and the second half is this line.
  revalidatePath(`/meetings/${meetingId}/transcript`);
  return { ok: true };
}
