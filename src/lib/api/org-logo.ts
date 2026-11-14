/**
 * The workspace logo on identity-tenant-service (ADR-0047).
 *
 *   GET    /api/v1/org/logo          {logo_url, logo_updated_at, ...}; logo_url null when none (member)
 *   PUT    /api/v1/org/logo          the image bytes as the body, with their Content-Type (admin)
 *   DELETE /api/v1/org/logo          removes it (admin)
 *   GET    /api/v1/org/logo/image    the bytes, versioned by ?v= (member); relayed by app/api/org-logo
 *
 * The workspace comes from the session token; nothing here names one. SERVER-ONLY: it imports
 * `auth()` from `@clerk/nextjs/server`, like `client.ts`.
 */

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { apiSafe } from "@/lib/api/client";

export type OrgLogo = {
  logo_url: string | null;
  logo_updated_at?: string | null;
  logo_version?: number;
  content_type?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
};

/** Once per request: the shell (sidebar) and a page can both ask. Null when it cannot be read. */
export const fetchOrgLogo = cache(async function fetchOrgLogo(): Promise<OrgLogo | null> {
  const res = await apiSafe<OrgLogo>("/api/v1/org/logo");
  if (!res.ok) return null;
  return typeof res.data?.logo_url === "string" || res.data?.logo_url === null ? res.data : null;
});

function gateway(): string {
  return (process.env.API_GATEWAY_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "").replace(/\/+$/, "");
}

async function bearer(): Promise<Record<string, string>> {
  const { getToken } = await auth();
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** The image bytes for the same-origin relay. A plain status on any failure, never a body. */
export async function fetchOrgLogoImage(version: string, ifNoneMatch: string | null): Promise<Response> {
  const base = gateway();
  if (!base) return new Response(null, { status: 503 });
  const headers: Record<string, string> = { Accept: "image/*", ...(await bearer()) };
  if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch;
  try {
    return await fetch(`${base}/api/v1/org/logo/image?v=${encodeURIComponent(version)}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

export type LogoWrite =
  | { ok: true; logo: OrgLogo | null }
  | { ok: false; status: number; reason: string | null; message: string | null };

/** PUT the bytes. The response body is the saved logo, or an RFC 7807 problem. */
export async function putOrgLogo(bytes: ArrayBuffer, contentType: string): Promise<LogoWrite> {
  return write("PUT", bytes, contentType);
}

export async function deleteOrgLogo(): Promise<LogoWrite> {
  return write("DELETE");
}

async function write(method: "PUT" | "DELETE", body?: ArrayBuffer, contentType?: string): Promise<LogoWrite> {
  const base = gateway();
  if (!base) return { ok: false, status: 503, reason: null, message: null };
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Idempotency-Key": `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
    ...(await bearer()),
  };
  if (contentType) headers["Content-Type"] = contentType;
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/org/logo`, { method, headers, body, cache: "no-store" });
  } catch {
    return { ok: false, status: 0, reason: null, message: null };
  }
  if (res.ok) {
    if (res.status === 204) return { ok: true, logo: null };
    try {
      return { ok: true, logo: (await res.json()) as OrgLogo };
    } catch {
      return { ok: true, logo: null };
    }
  }
  try {
    const problem = (await res.json()) as { reason?: unknown; detail?: unknown };
    return {
      ok: false,
      status: res.status,
      reason: typeof problem.reason === "string" ? problem.reason : null,
      message: typeof problem.detail === "string" ? problem.detail : null,
    };
  } catch {
    return { ok: false, status: res.status, reason: null, message: null };
  }
}
