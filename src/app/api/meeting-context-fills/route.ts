/**
 * `GET /api/meeting-context-fills?meeting_id=…` - the re-hydrate source for this participant's
 * ContextGapAgent context fills (Phase P10, plan 3.5).
 *
 * `realtime-gateway` replays nothing, so after every (re)connect the sidebar re-reads the caller's
 * surfaced, non-dismissed fills for this meeting and merges them by id. A route handler, like
 * `meeting-suggestions`, because `lib/api/client.ts` is server-only and the room is a client
 * island. `core-api` decides whose fills these are from the session; nothing about the user or
 * the tenant is taken from the request. An unconfigured gateway answers an empty list.
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { fetchMeetingContextFills } from "@/lib/api/context-fills";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request): Promise<NextResponse> {
  const meetingId = new URL(request.url).searchParams.get("meeting_id");
  if (!meetingId || !UUID.test(meetingId)) {
    return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
  }
  try {
    const body = await fetchMeetingContextFills(meetingId);
    return NextResponse.json({ items: Array.isArray(body?.items) ? body.items : [] });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    return NextResponse.json({ items: [] });
  }
}
