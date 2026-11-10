/**
 * `GET /api/meeting-alerts?meeting_id=…` - the re-hydrate source for this participant's
 * ProactiveAgent alerts (Phase P11, plan 3.9).
 *
 * `realtime-gateway` drains an alert to the socket once, so after every (re)connect the sidebar
 * re-reads the caller's notification-service rows for this meeting and merges them by id; a row
 * dismissed anywhere never comes back. A route handler, like `meeting-context-fills`, because
 * `lib/api/client.ts` is server-only and the room is a client island. notification-service
 * decides whose rows these are from the session; nothing about the user or the tenant is taken
 * from the request. An unconfigured gateway, or a notification-service that is not deployed yet,
 * answers an empty list rather than an error.
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { fetchMeetingAlerts } from "@/lib/api/notifications";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request): Promise<NextResponse> {
  const meetingId = new URL(request.url).searchParams.get("meeting_id");
  if (!meetingId || !UUID.test(meetingId)) {
    return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
  }
  try {
    const body = await fetchMeetingAlerts(meetingId);
    const items = Array.isArray(body?.items) ? body.items.filter((r) => r?.source !== "notification") : [];
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof ApiError && (error.isAuthFailure || error.status === 403)) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    return NextResponse.json({ items: [] });
  }
}
