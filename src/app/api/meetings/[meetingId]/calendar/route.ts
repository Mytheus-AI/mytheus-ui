/**
 * `GET /api/meetings/{meetingId}/calendar` - the meeting as an `.ics` file (ADR-0043), for the
 * "Download .ics" button on the meeting page.
 *
 * A route handler because a download needs the raw `text/calendar` body and a file name, which a
 * Server Action cannot hand the browser. It forwards the caller's own session to core-api's
 * `GET /api/v1/meetings/{id}/calendar.ics` and passes the file through; it holds no credential
 * and decides nothing about who may read it (core-api answers 403/404).
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, message: string) {
  return new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(_request: Request, { params }: { params: { meetingId: string } }): Promise<Response> {
  if (!UUID.test(params.meetingId)) return fail(404, "That meeting is no longer here.");
  const base = (process.env.API_GATEWAY_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "").replace(/\/+$/, "");
  if (!base) return fail(503, "The calendar file isn't available right now.");
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return fail(401, "Sign in to download the calendar file.");
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/v1/meetings/${params.meetingId}/calendar.ics`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/calendar" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return fail(503, "The calendar file isn't available right now. Try again in a moment.");
  }
  if (upstream.status === 409) return fail(409, "This meeting has no time yet, so there's nothing to add to a calendar.");
  if (upstream.status === 403 || upstream.status === 404) return fail(404, "That meeting isn't available to you.");
  if (!upstream.ok) return fail(502, "The calendar file isn't available right now. Try again in a moment.");
  const body = await upstream.text();
  const disposition = upstream.headers.get("content-disposition") ?? 'attachment; filename="meeting.ics"';
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
