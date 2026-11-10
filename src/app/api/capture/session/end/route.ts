/**
 * `POST /api/capture/session/end`: the capture stopped. Marks the external meeting ended through
 * core-api, which emits `meeting-events` `ended` and so starts its post-meeting processing
 * (notes, decisions, minutes), and records the real start and end so the meeting shows how long
 * the call was.
 *
 * Body: `{ meeting_id }`.
 */

import { NextResponse } from "next/server";

import { gateway } from "../../_lib/gateway";
import { UUID_RE, captureCaller, gatewayProblem, problem, readJson } from "../../_lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const caller = await captureCaller(request);
  if (caller instanceof NextResponse) return caller;

  const body = await readJson(request);
  const meetingId = body && typeof body.meeting_id === "string" && UUID_RE.test(body.meeting_id) ? body.meeting_id : null;
  if (!meetingId) return problem(422, "VALIDATION_FAILED");

  try {
    const meeting = await gateway<{ status: string; created_at: string; scheduled_start: string | null }>(
      caller.bearer,
      `/api/v1/meetings/${meetingId}`,
    );
    if (meeting.status !== "cancelled") {
      await gateway(caller.bearer, `/api/v1/meetings/${meetingId}`, {
        method: "PATCH",
        body: {
          status: "ended",
          scheduled_start: meeting.scheduled_start ?? meeting.created_at,
          scheduled_end: new Date().toISOString(),
        },
        idempotencyKey: `capture-end:${meetingId}`,
      });
    }
  } catch (error) {
    return gatewayProblem(error);
  }
  return NextResponse.json({ meeting_id: meetingId, status: "ended" }, { headers: { "Cache-Control": "no-store" } });
}
