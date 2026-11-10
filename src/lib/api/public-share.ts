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

const TIMEOUT_MS = 6000;

function baseUrl(): string | null {
  const url = process.env.API_GATEWAY_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  return url ? url.replace(/\/+$/, "") : null;
}

export async function fetchPublicShare(token: string): Promise<PublicShareRead> {
  if (!plausibleToken(token)) return { kind: "not_found" };
  const base = baseUrl();
  if (!base) return { kind: "error" };
  try {
    const response = await fetch(`${base}/api/v1/public/shares/${encodeURIComponent(token)}`, {
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
    return publicShareRead(response.status, body);
  } catch {
    return { kind: "error" };
  }
}
