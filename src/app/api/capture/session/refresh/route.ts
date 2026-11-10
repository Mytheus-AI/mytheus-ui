/**
 * `POST /api/capture/session/refresh`: a fresh 15-minute capture token for a capture already
 * running (the extension asks when a channel reconnects after its token expired).
 *
 * Body: `{ meeting_id, source, consent_at }`. The meeting must still be visible to the user
 * through core-api (404 otherwise, existence being tenant-confidential) and not cancelled.
 */

import { NextResponse } from "next/server";

import { gateway } from "../../_lib/gateway";
import { UUID_RE, captureCaller, gatewayProblem, problem, readJson } from "../../_lib/session";
import { isCaptureSource } from "../../_lib/source";
import { normalizeConsentAt, signCaptureToken } from "../../_lib/tokens";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const caller = await captureCaller(request);
  if (caller instanceof NextResponse) return caller;

  const body = await readJson(request);
  if (!body) return problem(400, "MALFORMED_BODY");
  const meetingId = typeof body.meeting_id === "string" && UUID_RE.test(body.meeting_id) ? body.meeting_id : null;
  const consentAt = normalizeConsentAt(body.consent_at);
  if (!meetingId || !isCaptureSource(body.source) || !consentAt) return problem(422, "VALIDATION_FAILED");

  let who: { user_id: string; org_id: string };
  try {
    const meeting = await gateway<{ status: string }>(caller.bearer, `/api/v1/meetings/${meetingId}`);
    if (meeting.status === "cancelled") return problem(409, "MEETING_ENDED");
    who = await gateway(caller.bearer, `/api/v1/meetings/${meetingId}/participants/${encodeURIComponent(caller.link.sub)}`);
  } catch (error) {
    return gatewayProblem(error);
  }
  if (!UUID_RE.test(who.user_id ?? "") || !UUID_RE.test(who.org_id ?? "")) return problem(502, "INTERNAL");

  const minted = signCaptureToken(
    { userId: who.user_id, orgId: who.org_id, meetingId, source: body.source, consentAt },
    caller.config.secret,
  );
  return NextResponse.json(
    {
      meeting_id: meetingId,
      meeting_url: "",
      title: "",
      capture_token: minted.token,
      expires_at: minted.expiresAt,
      ingest_url: caller.config.ingestUrl,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
