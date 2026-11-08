/**
 * `GET /api/meeting-worklogs?meeting_id=…` - the My Notes re-hydrate source.
 *
 * `realtime-gateway` buffers and replays nothing, so after every (re)connect the agent sidebar
 * re-reads the caller's durable notes from `core-api` and merges them by window. A route
 * handler for the same reason as `meeting-transcript`: `lib/api/client.ts` is server-only and
 * the meeting room is a client island. It forwards the caller's Clerk session and holds nothing.
 *
 * Reshaped to the socket's `agent-note` payload so the reducer takes either source through one
 * path. An unconfigured gateway answers an empty list rather than an error.
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { fetchMyWorklogs } from "@/lib/api/worklogs";

export async function GET(request: Request): Promise<NextResponse> {
  const meetingId = new URL(request.url).searchParams.get("meeting_id");
  if (!meetingId) {
    return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
  }
  try {
    const notes = await fetchMyWorklogs(meetingId);
    return NextResponse.json({
      items: notes.map((n) => ({ windowId: n.window_id, content: n.content })),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    return NextResponse.json({ items: [] });
  }
}
