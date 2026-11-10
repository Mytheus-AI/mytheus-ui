/**
 * Calls to `api-gateway` as the capturing user, for the capture routes.
 *
 * `lib/api/client.ts` takes its bearer from the current request's Clerk cookie. The capture
 * routes are called by the extension, which has no cookie: they re-mint a short Clerk session
 * token from the session the link token names (`session.ts`) and pass it here explicitly. Same
 * single origin (`API_GATEWAY_URL`), same rule: never an `org_id`, the gateway derives it.
 */

export class GatewayError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(`api-gateway ${status} ${code}`);
    this.name = "GatewayError";
    this.status = status;
    this.code = code;
  }
}

function baseUrl(): string {
  const url = process.env.API_GATEWAY_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  if (!url) throw new GatewayError(503, "DEPENDENCY_UNAVAILABLE");
  return url.replace(/\/+$/, "");
}

export async function gateway<T>(
  bearer: string,
  path: string,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${bearer}` };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["Idempotency-Key"] = options.idempotencyKey ?? crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: method === "GET" ? AbortSignal.timeout(6000) : AbortSignal.timeout(15000),
    });
  } catch {
    throw new GatewayError(503, "DEPENDENCY_UNAVAILABLE");
  }
  if (!response.ok) {
    let code = response.status === 404 ? "NOT_FOUND" : response.status === 401 ? "AUTH_REQUIRED" : "INTERNAL";
    try {
      const body = (await response.json()) as { code?: unknown };
      if (typeof body.code === "string") code = body.code;
    } catch {
      // keep the status-derived code
    }
    throw new GatewayError(response.status, code);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
