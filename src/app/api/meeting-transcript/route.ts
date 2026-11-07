/**
 * `GET /api/meeting-transcript?meeting_id=…` - the caption strip's re-hydrate source.
 *
 * This closes the gap the live-caption work disclosed. `realtime-gateway` deliberately buffers
 * and replays nothing to a reconnecting client ("finals are re-hydrated from core-api's REST
 * read model, never from this socket"), so a socket drop silently loses every caption spoken
 * during it unless the client re-reads the durable record. `lib/realtime/captions.ts` has had
 * `hydrate()` for exactly this since the caption strip landed; it had nothing to call, because
 * `GET /meetings/:id/transcript` did not exist until `mytheus-backend` `f6c9466`.
 *
 * A route handler rather than a direct client fetch, for the same reason `livekit-token` is
 * one: `lib/api/client.ts` is server-only by construction, and the meeting room is a client
 * island. It holds no credential of its own and forwards the caller's Clerk session.
 *
 * Only finals come back, because only finals exist in `transcript_chunks` - interims are never
 * persisted, which is the rule the whole transcription service is built around. So a re-hydrate
 * can restore the settled record and nothing provisional, which is the correct outcome: an
 * interim that was superseded during the disconnect should not reappear.
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { fetchTranscript } from "@/lib/api/transcript";

export async function GET(request: Request): Promise<NextResponse> {
  const meetingId = new URL(request.url).searchParams.get("meeting_id");
  if (!meetingId) {
    return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 });
  }

  try {
    const chunks = await fetchTranscript(meetingId);
    // Reshaped to the socket's `caption` payload so the reducer can take either source through
    // one code path. `chunkId` is the transcript row's `id`, which is the same identity the
    // producer minted it under, so a final that arrives from both here and the socket dedupes
    // instead of rendering twice.
    return NextResponse.json({
      items: chunks.map((c) => ({
        chunkId: c.id,
        speakerId: c.speaker_id,
        startMs: c.start_ms,
        endMs: c.end_ms,
        text: c.text,
        isFinal: true,
        confidence: c.confidence ?? undefined,
      })),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    // No gateway configured, which is every environment today. An empty hydrate is the honest
    // answer: the strip keeps whatever the socket gave it rather than showing an error for a
    // backend that was never expected to be there.
    return NextResponse.json({ items: [] });
  }
}
