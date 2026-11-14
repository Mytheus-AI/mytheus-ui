/**
 * `POST /api/voice/transcribe?language=en`: the words in one recording, for Talk mode and the
 * composer's dictation (mytheus-backend PR #39: self-hosted faster-whisper).
 *
 * A route handler because the body is raw audio, which `lib/api/client.ts` (JSON only) does not
 * carry. It holds no secret: it forwards the caller's own Clerk session token and the recording,
 * unchanged, to `POST /api/v1/voice/transcribe` through the gateway and answers `{text}`. The
 * Content-Type must be one the server takes (`audio/webm`, `audio/ogg`, `audio/mp4`,
 * `audio/mpeg`, `audio/wav`; codecs parameters are dropped) and the clip at most 10 MB.
 *
 * Every failure is JSON `{reason}` (`signed_out` 401, `too_long` 413, `unsupported` 415,
 * `rate_limited` 429, `listening_not_connected` 503 when the transcriber is off or the gateway
 * cannot be reached, `listening_failed` 502). The very first call can take a while (the model is
 * downloaded once), so the timeout is generous. When the browser goes away the upstream request
 * is aborted.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { gatewayUrl } from "@/lib/api/client";
import { MAX_CLIP_BYTES, listenFailureFor, listenLanguage, uploadType } from "@/lib/voice/listen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRANSCRIBE_TIMEOUT_MS = 180_000;

const fail = (status: number, reason: string) => NextResponse.json({ reason }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const { userId, getToken } = await auth();
  if (!userId) return fail(401, "signed_out");

  const type = uploadType(req.headers.get("content-type"));
  if (!type) return fail(415, "unsupported");
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_CLIP_BYTES) return fail(413, "too_long");

  let body: ArrayBuffer;
  try {
    body = await req.arrayBuffer();
  } catch {
    return fail(422, "listening_failed");
  }
  if (!body.byteLength) return fail(422, "listening_failed");
  if (body.byteLength > MAX_CLIP_BYTES) return fail(413, "too_long");

  const language = listenLanguage(new URL(req.url).searchParams.get("language"));
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": type, Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${gatewayUrl()}/api/v1/voice/transcribe?language=${language}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS)]),
    });
  } catch {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    return fail(503, "listening_not_connected");
  }

  const json = (await upstream.json().catch(() => null)) as unknown;
  if (!upstream.ok) {
    const reason = listenFailureFor(upstream.status, json);
    const status = reason === "signed_out" ? 401 : reason === "too_long" ? 413 : reason === "unsupported" ? 415 : reason === "rate_limited" ? 429 : reason === "listening_not_connected" ? 503 : 502;
    return fail(status, reason);
  }
  const text = json && typeof json === "object" && typeof (json as { text?: unknown }).text === "string" ? (json as { text: string }).text : "";
  return NextResponse.json({ text: text.slice(0, 5000) }, { headers: { "Cache-Control": "no-store" } });
}
