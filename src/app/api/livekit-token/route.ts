/**
 * `POST /api/livekit-token` - mints a LiveKit join token for one meeting, for the browser.
 *
 * Why a route handler rather than a client fetch: `lib/api/client.ts` is server-only by
 * construction (it imports `auth()` from `@clerk/nextjs/server`, so importing it from a client
 * component fails the build rather than shipping a token-fetching path into the bundle). The
 * meeting room is a client island that needs a token at connect time and again on every
 * reconnect, so it needs a same-origin endpoint it can call. This is that endpoint, and it is
 * the whole reason `app/api/` exists per this repo's CLAUDE.md.
 *
 * It holds NO LiveKit secret. `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` live in `meeting-service`
 * and never leave the backend; this handler only forwards the caller's own Clerk session to
 * `api-gateway` and passes the minted token back. The browser therefore never holds anything
 * that could mint a token for a meeting it was not admitted to.
 *
 * PATH CORRECTION, deliberate and load-bearing. Plan 3-4 §3.4 step 2 and this repo's own
 * CLAUDE.md both say to call `POST /api/v1/meetings/:id/token`. That path does not mint
 * tokens: `api-gateway`'s ROUTE_MAP (`services/api_gateway/edge.py`) sends `/api/v1/meetings`
 * to `core-api`, which owns meeting CRUD, while the token mint is `meeting-service` at
 * `/api/meetings` - the two differ only by the version segment, and the gateway's own comment
 * calls the near-collision deliberate. The shipped route decorator
 * (`services/meeting_service/routes.py:154`) is `/api/meetings/{meeting_id}/token`. Following
 * the documented path would have produced a client that never mints a token at all, so the
 * shipped route wins and the docs are recorded as the bug.
 */

import { NextResponse } from "next/server";
import { ApiError, api } from "@/lib/api/client";

/** Mirrors `meeting-service`'s token-mint response. */
interface TokenResponse {
  token: string;
  room: string;
  livekit_url?: string | null;
  consented_at?: string | null;
  consent_version?: string | null;
  started_at?: string | null;
}

/** The notice version label meeting-service stores (`ConsentAck.version`). */
const CONSENT_VERSION = /^[A-Za-z0-9._-]{1,64}$/;

/*
 * CONSENT THAT IS REAL (polish program, Phase 0; ADR-0018). The pre-join (and the room, if the
 * server still asks) sends `{ meeting_id, consent: { version } }`: the person read the notice
 * with that version label and agreed. It is forwarded as meeting-service's optional token-request
 * body, which stamps `meeting_participants.consented_at` / `consent_version` once, before the 428
 * gate. Nothing else from the browser is forwarded: identity comes from the session.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let meetingId: unknown;
  let consent: unknown;
  try {
    ({ meeting_id: meetingId, consent } = (await request.json()) as { meeting_id?: unknown; consent?: unknown });
  } catch {
    return NextResponse.json({ code: "MALFORMED_BODY" }, { status: 400 });
  }

  if (typeof meetingId !== "string" || meetingId.length === 0) {
    return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
  }
  let version: string | null = null;
  if (consent !== undefined && consent !== null) {
    const v = (consent as { version?: unknown }).version;
    if (typeof v !== "string" || !CONSENT_VERSION.test(v)) {
      return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
    }
    version = v;
  }

  try {
    const minted = await api<TokenResponse>(
      `/api/meetings/${encodeURIComponent(meetingId)}/token`,
      version ? { method: "POST", body: { consent: { version } } } : { method: "POST" },
    );
    return NextResponse.json(minted);
  } catch (error) {
    if (error instanceof ApiError) {
      // Pass the server's own status and stable code through unchanged. 403 (not a
      // participant), 404 (another tenant's meeting, whose existence is confidential) and 428
      // (consent required) mean genuinely different things to the UI, and collapsing them into
      // one failure would lose exactly the distinction the backend went to trouble to make.
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    throw error;
  }
}
