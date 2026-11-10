/**
 * `GET /api/capture/session/status`: is the extension's link still good? 200 when it is, 401
 * `LINK_EXPIRED` when the user must connect again, 503 `CAPTURE_NOT_CONFIGURED` when Capture is
 * not switched on for this deployment.
 */

import { NextResponse } from "next/server";

import { captureCaller } from "../../_lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const caller = await captureCaller(request);
  if (caller instanceof NextResponse) return caller;
  return NextResponse.json({ linked: true, configured: true }, { headers: { "Cache-Control": "no-store" } });
}
