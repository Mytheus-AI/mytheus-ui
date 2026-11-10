/**
 * The shared front half of every `/api/capture/session/*` route: configuration check, the link
 * token, and a fresh Clerk session token for the user behind it.
 *
 * These routes are public in `middleware.ts` because the extension carries no Clerk cookie; they
 * authenticate themselves here instead, and fail closed: no secret, no route; no valid link,
 * 401; a Clerk session that has ended (signed out, expired, revoked), 401 `LINK_EXPIRED`.
 */

import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { captureConfig, captureConfigured, type CaptureConfig } from "./config";
import { GatewayError } from "./gateway";
import { verifyLinkToken, type LinkClaims } from "./tokens";

export const LINK_HEADER = "x-mytheus-capture-link";

export interface CaptureCaller {
  config: CaptureConfig & { secret: string; ingestUrl: string };
  link: LinkClaims;
  /** A Clerk session token for the user, valid for two minutes. */
  bearer: string;
}

export function problem(status: number, code: string): NextResponse {
  return NextResponse.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export function gatewayProblem(error: unknown): NextResponse {
  if (error instanceof GatewayError) {
    if (error.status === 401) return problem(401, "LINK_EXPIRED");
    // 403 and 404 stay distinct, as everywhere else in this app.
    if (error.status === 403 || error.status === 404 || error.status === 409 || error.status === 422) {
      return problem(error.status, error.code);
    }
    return problem(502, error.code);
  }
  throw error;
}

export async function captureCaller(request: Request): Promise<CaptureCaller | NextResponse> {
  const config = captureConfig();
  if (!captureConfigured(config)) return problem(503, "CAPTURE_NOT_CONFIGURED");

  // Its own header, not `Authorization: Bearer`: Clerk's middleware parses any bearer token as a
  // Clerk JWT before the route runs, and a token of ours is not one.
  const token = (request.headers.get(LINK_HEADER) ?? "").trim();
  const link = token ? verifyLinkToken(token, config.secret) : null;
  if (!link || !config.extensionIds.includes(link.ext)) return problem(401, "LINK_EXPIRED");

  try {
    const clerk = await clerkClient();
    const session = await clerk.sessions.getSession(link.sid);
    if (session.status !== "active" || session.userId !== link.sub) return problem(401, "LINK_EXPIRED");
    const minted = await clerk.sessions.getToken(link.sid, "", 120);
    return { config, link, bearer: minted.jwt };
  } catch (error) {
    // Clerk said no (the session or user is gone): reconnect. Clerk unreachable: try later,
    // without throwing away a link that is still good.
    const status = (error as { status?: unknown })?.status;
    if (typeof status === "number" && status >= 400 && status < 500) return problem(401, "LINK_EXPIRED");
    return problem(503, "DEPENDENCY_UNAVAILABLE");
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Where people open the meeting in Mytheus: the app host, as the request reached us. */
export function appOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_HOST;
  if (configured) return `https://${configured.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return host ? `${proto}://${host.split(",")[0].trim()}` : new URL(request.url).origin;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
