/**
 * "Should this be a meeting?" (only-Mytheus wave, contract section 3).
 *
 *   POST /bff/meetings/precheck   {title, agenda, participant_ids?} -> what was already decided,
 *                                 which agenda items are only status updates, recent related
 *                                 meetings. Read-only and fast; it never blocks scheduling.
 *   POST /api/v1/status-requests  {action_ids} -> ask each task's owner for a status instead of
 *                                 holding a meeting for it (core-api).
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`. The new-meeting dialog reaches the precheck
 * through `app/api/meeting-precheck/route.ts` (so a stale request can be aborted) and the ask
 * through a Server Action.
 */

import { api } from "@/lib/api/client";
import type { MeetingPrecheck, PrecheckRequest, StatusRequestsAsked } from "@/lib/api/only-mytheus-types";

export async function postMeetingPrecheck(body: PrecheckRequest): Promise<MeetingPrecheck> {
  // A read with a body: the server answers within about a second and a half, and the dialog
  // treats anything slower as "no hints", so this keeps a short budget of its own.
  return api<MeetingPrecheck>("/bff/meetings/precheck", { method: "POST", body });
}

export async function postStatusRequests(actionIds: string[]): Promise<StatusRequestsAsked> {
  return api<StatusRequestsAsked>("/api/v1/status-requests", { method: "POST", body: { action_ids: actionIds } });
}
