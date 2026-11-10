/**
 * The two tokens behind Mytheus Capture, both compact HS256 JWS signed from
 * `CAPTURE_TOKEN_SECRET` (server-only, at least 32 characters):
 *
 * - The LINK token (`typ: "capture-link"`), held by the extension for up to 7 days. Minted on
 *   /capture/connect for the signed-in user. It names their Clerk session (`sid`), so it dies
 *   the moment they sign out of Mytheus or the session expires: every use re-mints a Clerk
 *   token from that session server-side and fails if the session is gone. Signed with a key
 *   derived from the secret, so it can never pass as a capture token.
 * - The CAPTURE token (`typ: "capture"`), 15 minutes, one meeting. Verified by
 *   transcription-service's `/capture/audio` (`capture_auth.py` there, which must accept exactly
 *   what `signCaptureToken` writes).
 *
 * Node `crypto` only, no local imports: `tests/capture.test.ts` imports this file directly.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const CAPTURE_TOKEN_TTL_SECONDS = 15 * 60;
export const LINK_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const MIN_SECRET_LENGTH = 32;

const ISSUER = "mytheus-ui";
const CAPTURE_AUDIENCE = "transcription-service";
const LINK_AUDIENCE = "mytheus-capture-extension";

export interface LinkClaims {
  typ: "capture-link";
  iss: string;
  aud: string;
  /** Clerk session id */
  sid: string;
  /** Clerk user id */
  sub: string;
  /** the extension the link was handed to */
  ext: string;
  iat: number;
  exp: number;
}

export interface CaptureTokenInput {
  userId: string;
  orgId: string;
  meetingId: string;
  source: string;
  consentAt: string;
}

export function secretUsable(secret: string | undefined | null): secret is string {
  return typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: object, key: Buffer | string): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signature = createHmac("sha256", key).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verify(token: string, key: Buffer | string): Record<string, unknown> | null {
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  try {
    const parsedHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as { alg?: unknown };
    if (parsedHeader.alg !== "HS256") return null;
    const expected = createHmac("sha256", key).update(`${header}.${body}`).digest();
    const presented = Buffer.from(signature, "base64url");
    if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) return null;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
    return claims && typeof claims === "object" ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** A different key for link tokens, so one can never be presented as a capture token. */
function linkKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("mytheus-capture-link-v1").digest();
}

export function signLinkToken(
  input: { sessionId: string; clerkUserId: string; extensionId: string },
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): { token: string; expiresAt: number } {
  const claims: LinkClaims = {
    typ: "capture-link",
    iss: ISSUER,
    aud: LINK_AUDIENCE,
    sid: input.sessionId,
    sub: input.clerkUserId,
    ext: input.extensionId,
    iat: now,
    exp: now + LINK_TOKEN_TTL_SECONDS,
  };
  return { token: sign(claims, linkKey(secret)), expiresAt: claims.exp };
}

export function verifyLinkToken(
  token: string,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): LinkClaims | null {
  const c = verify(token, linkKey(secret));
  if (!c) return null;
  if (c.typ !== "capture-link" || c.iss !== ISSUER || c.aud !== LINK_AUDIENCE) return null;
  for (const key of ["sid", "sub", "ext"] as const) {
    if (typeof c[key] !== "string" || !(c[key] as string)) return null;
  }
  if (typeof c.iat !== "number" || typeof c.exp !== "number") return null;
  if (c.exp - c.iat > LINK_TOKEN_TTL_SECONDS || c.exp < now || c.iat > now + 30) return null;
  return c as unknown as LinkClaims;
}

export function signCaptureToken(
  input: CaptureTokenInput,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): { token: string; expiresAt: number } {
  const exp = now + CAPTURE_TOKEN_TTL_SECONDS;
  const claims = {
    typ: "capture",
    iss: ISSUER,
    aud: CAPTURE_AUDIENCE,
    sub: input.userId,
    org: input.orgId,
    mid: input.meetingId,
    src: input.source,
    consent_at: input.consentAt,
    iat: now,
    exp,
  };
  return { token: sign(claims, secret), expiresAt: exp };
}

/** An ISO time the user confirmed consent: parseable, not in the future, not older than a day. */
export function normalizeConsentAt(raw: unknown, nowMs: number = Date.now()): string | null {
  if (typeof raw !== "string" || raw.length > 40) return null;
  const at = Date.parse(raw);
  if (Number.isNaN(at) || at > nowMs + 60_000 || at < nowMs - 24 * 3600_000) return null;
  return new Date(at).toISOString();
}
