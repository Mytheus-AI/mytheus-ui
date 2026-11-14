/**
 * `POST /api/voice/speech`: one chunk of a Myte's speech (ADR-0050 D3, D4), for the browser.
 *
 * A route handler because the answer is streamed audio, which `lib/api/client.ts` (JSON only)
 * does not carry. It holds no secret: it forwards the caller's own Clerk session token to
 * core-api's `POST /api/v1/voice/speech` through the gateway and streams `audio/mpeg` back as it
 * arrives. The body is checked first (text 1..1500, a Kokoro-shaped voice id, speed 0.7..1.4);
 * anything else the browser sent is dropped.
 *
 * Every failure is JSON `{reason}` (`signed_out` 401, `invalid` 422, `rate_limited` 429,
 * `voice_not_connected` 503 when the voice server is off or the gateway cannot be reached,
 * `voice_failed` 502), so the speaker has one way to read it. When the browser goes away
 * (stop, a new answer, a closed tab) the upstream request is aborted.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { gatewayUrl } from "@/lib/api/client";
import { checkSpeechBody, speechFailure } from "@/lib/voice/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPEECH_TIMEOUT_MS = 30_000;

const fail = (status: number, reason: string) => NextResponse.json({ reason }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const { userId, getToken } = await auth();
  if (!userId) return fail(401, "signed_out");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(422, "invalid");
  }
  const checked = checkSpeechBody(raw);
  if (!checked.ok) return fail(422, "invalid");

  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "audio/mpeg" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${gatewayUrl()}/api/v1/voice/speech`, {
      method: "POST",
      headers,
      body: JSON.stringify(checked.body),
      cache: "no-store",
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(SPEECH_TIMEOUT_MS)]),
    });
  } catch {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    return fail(503, "voice_not_connected");
  }

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.json().catch(() => null);
    const f = speechFailure(upstream.status, body);
    return fail(f.status, f.reason);
  }

  const out = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
    "Cache-Control": "no-store",
  });
  const voice = upstream.headers.get("x-myte-voice");
  if (voice && /^[a-z]{2}_[a-z0-9]{1,40}$/.test(voice)) out.set("X-Myte-Voice", voice);
  return new Response(upstream.body, { status: 200, headers: out });
}
