/**
 * `GET /api/org-logo?v={version}` - the workspace logo, for an `<img>` (ADR-0048).
 *
 * A route handler because an `<img src>` cannot carry the Clerk bearer: this forwards the caller's
 * own session to `api-gateway` (`GET /api/v1/org/logo/image?v=`, where identity-tenant-service
 * reads the logo of the token's workspace, so another workspace's logo is unreachable) and relays
 * the bytes. The URL is versioned (every upload is a new version), so the browser may keep it
 * for good: `private, max-age=31536000, immutable`. `private` keeps it out of shared caches; it is
 * one workspace's image. ETag passes through so a revalidation is a 304.
 */

import { fetchOrgLogoImage } from "@/lib/api/org-logo";

export const dynamic = "force-dynamic";

const IMAGE = /^image\/(png|jpeg|webp)$/;

export async function GET(request: Request): Promise<Response> {
  const v = new URL(request.url).searchParams.get("v") ?? "";
  if (!/^\d{1,9}$/.test(v)) return new Response(null, { status: 404 });
  const upstream = await fetchOrgLogoImage(v, request.headers.get("if-none-match"));
  const etag = upstream.headers.get("etag");
  if (upstream.status === 304) {
    return new Response(null, { status: 304, headers: etag ? { ETag: etag } : {} });
  }
  if (!upstream.ok) {
    const status = [401, 403, 404].includes(upstream.status) ? upstream.status : 502;
    return new Response(null, { status, headers: { "Cache-Control": "private, no-store" } });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!IMAGE.test(type)) return new Response(null, { status: 502 });
  const headers = new Headers({
    "Content-Type": type,
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (etag) headers.set("ETag", etag);
  return new Response(upstream.body, { status: 200, headers });
}
