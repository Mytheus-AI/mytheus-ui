/**
 * `GET /api/late-contributions/{id}/audio` - a recorded late contribution, for the browser's
 * <audio> element (the last word, a3 room signals).
 *
 * A route handler because an <audio src> cannot carry the Clerk bearer: this handler forwards the
 * caller's own session to `api-gateway` (`GET /api/v1/late-contributions/{id}/audio`, where
 * core-api checks the person took part in the meeting) and relays the bytes. It holds no
 * credential of its own, caches nothing across people (`private, no-store`), and passes `Range`
 * through so the player can seek. Anything the server refuses stays a plain status, never a body.
 */

import { fetchLateAudio } from "@/lib/api/room-signals";
import { isId } from "@/lib/room-signals";

export const dynamic = "force-dynamic";

const PASS = ["content-type", "content-length", "content-range", "accept-ranges"];

export async function GET(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  if (!isId(params.id)) return new Response(null, { status: 404 });
  const upstream = await fetchLateAudio(params.id, request.headers.get("range"));
  if (!upstream.ok && upstream.status !== 206) {
    const status = upstream.status === 401 || upstream.status === 403 || upstream.status === 404 ? upstream.status : 502;
    return new Response(null, { status });
  }
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  for (const h of PASS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.get("content-type")?.startsWith("audio/")) headers.set("content-type", "audio/webm");
  return new Response(upstream.body, { status: upstream.status, headers });
}
