/**
 * The single server-side fetch wrapper to `api-gateway`. Plan 1-2 section 3.10 step 7.
 *
 * It knows one address, `API_GATEWAY_URL`, and one credential, the Clerk session token.
 *
 * IT NEVER SENDS `org_id`. There is deliberately no parameter for one. `api-gateway` derives
 * the tenant from the verified JWT and resolves it through `organizations.clerk_org_id`; a
 * client-supplied tenant is a value the server must either ignore or trust, and trusting it is
 * a cross-tenant read.
 *
 * SERVER-ONLY, and that is a security property rather than a style choice. `auth()` and
 * `getToken()` come from `@clerk/nextjs/server`, so importing this from a client component
 * fails the build instead of shipping a token-fetching path into the browser bundle. Screens
 * fetch in a Server Component and pass plain data down.
 *
 * Errors are RFC 7807. Callers branch on the stable `code`, never on a message string: `403`
 * (wrong role) and `404` (another tenant's resource, which is confidential) mean genuinely
 * different things and must not be collapsed.
 */

import { auth } from "@clerk/nextjs/server";

import type { components as CoreApiSchemas } from "./generated/core-api";

/**
 * The frozen program-wide error enum, taken from the emitted spec rather than restated.
 *
 * This union used to be hand-kept, and it had already drifted: it listed 15 of the 17 codes
 * the server emits, missing `CONSENT_REQUIRED` and `NOT_A_PARTICIPANT` - which are precisely
 * the two outcomes `app/api/livekit-token/route.ts` exists to keep apart. A hand-written union
 * cannot fail when the server adds a code; it just stops covering the branch you needed.
 *
 * Every service emits the identical enum, so any one document is authoritative for it.
 */
export type ErrorCode = CoreApiSchemas["schemas"]["ErrorCode"];

/** RFC 7807. Callers branch on `code`, never on `title` or `detail`, which are prose. */
export type Problem = CoreApiSchemas["schemas"]["Problem"];

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  get isAuthFailure(): boolean {
    return this.code === "AUTH_REQUIRED" || this.code === "TOKEN_EXPIRED";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | undefined>;
  /** Next fetch cache. Defaults to no-store: tenant data must never be cached across
   *  requests, because the cache key does not include the tenant. */
  revalidate?: number | false;
}

const MUTATING = new Set(["POST", "PATCH", "PUT"]);

function baseUrl(): string {
  const url = process.env.API_GATEWAY_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  if (!url) {
    throw new Error(
      "API_GATEWAY_URL is not set. There is no default on purpose: a wrong default would " +
        "send real session tokens to an unintended host.",
    );
  }
  return url.replace(/\/+$/, "");
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // `undefined` means "unspecified" and is omitted, not sent as the string "undefined",
    // which the server would reject as a validation error.
    if (value !== undefined) params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const parsed = (await response.json()) as Partial<Problem>;
    if (parsed && typeof parsed.code === "string") {
      return new ApiError(
        response.status,
        parsed.code as ErrorCode,
        parsed.detail ?? parsed.title ?? `HTTP ${response.status}`,
      );
    }
  } catch {
    // A proxy error page or a truncated body. The request still failed, and the caller needs
    // a usable code rather than a JSON parse error stacked on top of the real one.
  }
  const fallback: ErrorCode =
    response.status === 401
      ? "AUTH_REQUIRED"
      : response.status === 403
        ? "FORBIDDEN_ROLE"
        : response.status === 404
          ? "NOT_FOUND"
          : response.status >= 500
            ? "INTERNAL"
            : "MALFORMED_BODY";
  return new ApiError(response.status, fallback, `HTTP ${response.status}`);
}

function idempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Call the gateway with the current request's Clerk session token.
 *
 * Throws `ApiError` on any non-2xx. Callers that want a degraded panel instead of a thrown
 * page should use `apiSafe`.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const { getToken } = await auth();
  const token = await getToken();

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (MUTATING.has(method)) {
    headers["Idempotency-Key"] = options.idempotencyKey ?? idempotencyKey();
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    // Tenant-scoped responses are never shared across requests. The Next data cache keys on
    // the URL, which is identical for every tenant, so caching here would serve one tenant's
    // dashboard to the next visitor.
    cache: options.revalidate === undefined ? "no-store" : undefined,
    next: options.revalidate === undefined ? undefined : { revalidate: options.revalidate },
  });

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * `api` that returns a result union instead of throwing.
 *
 * For a screen assembled from several panels: one failing read should degrade its own panel,
 * not replace the whole page with an error boundary. Mirrors how `bff` already reports a
 * per-arm status.
 */
export async function apiSafe<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  try {
    return { ok: true, data: await api<T>(path, options) };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error };
    return {
      ok: false,
      error: new ApiError(0, "DEPENDENCY_UNAVAILABLE", "Gateway unreachable"),
    };
  }
}
