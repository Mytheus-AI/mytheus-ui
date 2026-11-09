/**
 * `GET /api/meeting-suggestions?meeting_id=…` - the re-hydrate source for this participant's
 * QuestionAgent suggestions.
 *
 * `realtime-gateway` replays nothing, so after every (re)connect the sidebar re-reads the
 * caller's open suggestions for this meeting and their saved ones from earlier meetings, and
 * merges them by id. A route handler, like `meeting-candidates`, because `lib/api/client.ts` is
 * server-only and the room is a client island. `core-api` decides whose suggestions these are
 * from the session; nothing about the user is taken from the request. An unconfigured gateway
 * answers empty lists rather than an error.
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { fetchMeetingSuggestions } from "@/lib/api/suggestions";

export async function GET(request: Request): Promise<NextResponse> {
  const meetingId = new URL(request.url).searchParams.get("meeting_id");
  if (!meetingId) {
    return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
  }
  try {
    const body = await fetchMeetingSuggestions(meetingId);
    return NextResponse.json({ open: body.open, saved: body.saved });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    return NextResponse.json({ open: [], saved: [] });
  }
}
