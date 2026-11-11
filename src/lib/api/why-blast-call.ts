/**
 * The one request path for "decisions that know why", blast radius and settle threads: a request
 * from the pure route tables (`lib/decision-why.ts`, `lib/blast-radius.ts`, `lib/settlements.ts`)
 * sent through `api()`, which attaches the session token and an Idempotency-Key. SERVER-ONLY,
 * inherited from `client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import type { ActFailure, Load } from "@/lib/api/why-blast-types";

export type WireReq = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string>;
};

export function send<T>(req: WireReq): Promise<T> {
  return api<T>(req.path, { method: req.method, body: req.body, query: req.query });
}

/** A read that never throws: the panel draws `none`, `forbidden` and `error` differently. */
export async function load<T>(req: WireReq, shape: (raw: unknown) => T | null): Promise<Load<T>> {
  try {
    const data = shape(await send<unknown>(req));
    return data === null ? { ok: false, reason: "error" } : { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return { ok: false, reason: "none" };
      if (err.status === 403) return { ok: false, reason: "forbidden" };
    }
    return { ok: false, reason: "error" };
  }
}

/** A failed write in plain words. `what` names the thing ("That reason", "This thread"). */
export function failure(err: unknown, what: string, invalid = "That wasn't accepted. Check it and try again."): ActFailure {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, code: "auth", message: "Your session expired. Sign in again." };
    if (err.status === 403) return { ok: false, code: "forbidden", message: "Only the decision's owner can do that." };
    if (err.status === 404) return { ok: false, code: "gone", message: `${what} is no longer here.` };
    if (err.status === 409) return { ok: false, code: "conflict", message: `${what} was already settled another way.` };
    if (err.status === 422) return { ok: false, code: "invalid", message: invalid };
  }
  return { ok: false, code: "error", message: "That couldn't be saved just now. Try again in a moment." };
}
