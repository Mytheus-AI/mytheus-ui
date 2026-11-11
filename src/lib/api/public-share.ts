/**
 * The public read of a share link, `GET /api/v1/public/shares/{token}`, for the `/s/{token}`
 * page. Server-only.
 *
 * NO SESSION TOKEN, on purpose. The signed token in the path is the credential (api-gateway
 * routes `/api/v1/public/` without a bearer), and whoever opens the page may not be a user at all.
 * Sending the viewer's Clerk token would be pointless and would tie a public page to a session.
 * Same single origin as `client.ts`: `API_GATEWAY_URL`, never a default.
 */

import { plausibleToken, publicShareRead, type PublicShareRead } from "@/components/minutes/minutes-model";
import { isClipShareRedirect, publicClipRead, type PublicClipRead } from "@/components/recording/recording-model";

const TIMEOUT_MS = 6000;

function baseUrl(): string | null {
  const url = process.env.API_GATEWAY_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  return url ? url.replace(/\/+$/, "") : null;
}

async function getJson(path: string): Promise<{ status: number; body: unknown } | null> {
  const base = baseUrl();
  if (!base) return null;
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { status: response.status, body };
  } catch {
    return null;
  }
}

export async function fetchPublicShare(token: string): Promise<PublicShareRead> {
  if (!plausibleToken(token)) return { kind: "not_found" };
  const res = await getJson(`/api/v1/public/shares/${encodeURIComponent(token)}`);
  return res ? publicShareRead(res.status, res.body) : { kind: "error" };
}

/** What a `/s/{token}` link shows: a recap or decision record, or (recording playback, wave 3) a
 *  clip. The generic read answers a clip's token with 404 `reason: clip_share`, and the page then
 *  reads `GET /api/v1/public/clips/{token}`. */
export type PublicPage = { type: "share"; read: PublicShareRead } | { type: "clip"; read: PublicClipRead };

export async function fetchPublicPage(token: string): Promise<PublicPage> {
  if (!plausibleToken(token)) return { type: "share", read: { kind: "not_found" } };
  const encoded = encodeURIComponent(token);
  const res = await getJson(`/api/v1/public/shares/${encoded}`);
  if (!res) return { type: "share", read: { kind: "error" } };
  if (!isClipShareRedirect(res.status, res.body)) return { type: "share", read: publicShareRead(res.status, res.body) };
  const clip = await getJson(`/api/v1/public/clips/${encoded}`);
  return { type: "clip", read: clip ? publicClipRead(clip.status, clip.body) : { kind: "error" } };
}
