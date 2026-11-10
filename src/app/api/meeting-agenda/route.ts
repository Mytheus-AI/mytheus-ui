/**
 * `GET /api/meeting-agenda?meeting_id=…` - the re-hydrate source for the room's shared agenda
 * (mytheus-docs ADR-0038 D9: "a client re-hydrates the agenda from GET /api/v1/meetings/{id}").
 *
 * A route handler, like `meeting-candidates`, because `lib/api/client.ts` is server-only and the
 * room is a client island. Only the agenda, the host and the wrap-up start leave this handler. An unconfigured or
 * unreachable gateway answers 503 so the room keeps what it has and says it may be stale.
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { fetchMeeting } from "@/lib/api/meeting";
import { toCallMeeting } from "@/lib/api/meetings";

export async function GET(request: Request): Promise<NextResponse> {
  const meetingId = new URL(request.url).searchParams.get("meeting_id");
  if (!meetingId) {
    return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
  }
  try {
    const raw = await fetchMeeting(meetingId);
    if (!raw) return NextResponse.json({ code: "DEPENDENCY_UNAVAILABLE" }, { status: 503 });
    const meeting = toCallMeeting(raw);
    return NextResponse.json({
      host_user_id: meeting.hostUserId,
      items: meeting.agenda,
      // The close-out wrap-up's stored start (polish program), so a reconnect agrees with live.
      wrap_up_started_at: meeting.wrapUpStartedAt ?? null,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    return NextResponse.json({ code: "DEPENDENCY_UNAVAILABLE" }, { status: 503 });
  }
}
