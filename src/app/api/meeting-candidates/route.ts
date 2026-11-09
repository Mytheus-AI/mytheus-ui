/**
 * `GET /api/meeting-candidates?meeting_id=…` - the re-hydrate source for decision and action
 * candidates in the room.
 *
 * `realtime-gateway` replays nothing, so after every (re)connect the sidebar re-reads the
 * meeting's still-proposed candidates from `core-api` and merges them by id. A route handler,
 * like `meeting-worklogs`, because `lib/api/client.ts` is server-only and the room is a client
 * island. An unconfigured gateway answers empty lists rather than an error.
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { fetchMeetingCandidates } from "@/lib/api/candidates";

export async function GET(request: Request): Promise<NextResponse> {
  const meetingId = new URL(request.url).searchParams.get("meeting_id");
  if (!meetingId) {
    return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
  }
  try {
    const body = await fetchMeetingCandidates(meetingId);
    return NextResponse.json({ decisions: body.decisions, actions: body.actions });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    return NextResponse.json({ decisions: [], actions: [] });
  }
}
