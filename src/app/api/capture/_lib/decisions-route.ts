/**
 * The shared tail of the `/api/capture/decisions/*` routes: turn a gateway failure into the
 * extension's answer (`_lib/decisions.ts` decides the mapping).
 */

import { NextResponse } from "next/server";

import { decisionsProblem } from "./decisions";
import { GatewayError } from "./gateway";

export function decisionsFailure(error: unknown): NextResponse {
  if (!(error instanceof GatewayError)) throw error;
  const p = decisionsProblem(error.status, error.code, error.reason, error.retryAfter);
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (p.retryAfter) headers["Retry-After"] = String(p.retryAfter);
  return NextResponse.json(p.body, { status: p.status, headers });
}

export function noStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
