/**
 * `POST /api/capture/session/start`: the extension starts capturing a call held elsewhere.
 *
 * Authenticated by the link token (`_lib/session.ts`), as the user behind it. Creates the
 * "external meeting" through core-api's ordinary create endpoint (no backend schema change: the
 * source rides in the title, "Google Meet: ...", see `_lib/source.ts`), marks it live, resolves
 * the caller's internal user and org ids through core-api's participant check, and signs a
 * 15-minute capture token for transcription-service's `/capture/audio`.
 *
 * Body: `{ source: "meet" | "teams" | "zoom", title: string, consent: true, consent_at?: ISO,
 * client_request_id?: uuid }`. `consent: true` is the user's confirmation that they told everyone
 * on the call; without it nothing is created (422 `CONSENT_REQUIRED`). It travels in the token
 * and transcription-service writes it to `audit_logs` before any audio is accepted.
 */

import { NextResponse } from "next/server";

import { gateway } from "../../_lib/gateway";
import {
  UUID_RE,
  appOrigin,
  captureCaller,
  gatewayProblem,
  problem,
  readJson,
} from "../../_lib/session";
import { capturedTitle, cleanCaptureTitle, isCaptureSource, parseCapturedTitle } from "../../_lib/source";
import { normalizeConsentAt, signCaptureToken } from "../../_lib/tokens";

export const dynamic = "force-dynamic";

interface CreatedMeeting {
  id: string;
  title: string | null;
}

interface ParticipantCheck {
  user_id: string;
  org_id: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const caller = await captureCaller(request);
  if (caller instanceof NextResponse) return caller;

  const body = await readJson(request);
  if (!body) return problem(400, "MALFORMED_BODY");
  if (!isCaptureSource(body.source)) return problem(422, "VALIDATION_FAILED");
  if (body.consent !== true) return problem(422, "CONSENT_REQUIRED");
  const consentAt =
    body.consent_at === undefined ? new Date().toISOString() : normalizeConsentAt(body.consent_at);
  if (!consentAt) return problem(422, "VALIDATION_FAILED");
  const requestId =
    typeof body.client_request_id === "string" && UUID_RE.test(body.client_request_id)
      ? body.client_request_id
      : undefined;
  const source = body.source;
  const title = capturedTitle(source, cleanCaptureTitle(body.title));

  let meeting: CreatedMeeting;
  let who: ParticipantCheck;
  try {
    meeting = await gateway<CreatedMeeting>(caller.bearer, "/api/v1/meetings", {
      method: "POST",
      body: { title },
      idempotencyKey: requestId ? `capture-start:${requestId}` : undefined,
    });
    // Live while the capture runs, so the meeting reads as happening now. Best effort: the
    // transcript does not depend on the status.
    await gateway(caller.bearer, `/api/v1/meetings/${encodeURIComponent(meeting.id)}`, {
      method: "PATCH",
      body: { status: "live" },
    }).catch(() => undefined);
    who = await gateway<ParticipantCheck>(
      caller.bearer,
      `/api/v1/meetings/${encodeURIComponent(meeting.id)}/participants/${encodeURIComponent(caller.link.sub)}`,
    );
  } catch (error) {
    return gatewayProblem(error);
  }
  if (!UUID_RE.test(who.user_id ?? "") || !UUID_RE.test(who.org_id ?? "")) {
    return problem(502, "INTERNAL");
  }

  const minted = signCaptureToken(
    { userId: who.user_id, orgId: who.org_id, meetingId: meeting.id, source, consentAt },
    caller.config.secret,
  );
  return NextResponse.json(
    {
      meeting_id: meeting.id,
      meeting_url: `${appOrigin(request)}/meetings/${meeting.id}`,
      title: parseCapturedTitle(meeting.title ?? title)?.title ?? title,
      capture_token: minted.token,
      expires_at: minted.expiresAt,
      ingest_url: caller.config.ingestUrl,
      consent_at: consentAt,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
