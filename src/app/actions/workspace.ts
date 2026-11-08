"use server";

import { api, ApiError } from "@/lib/api/client";

export type ProvisionOutcome = { ok: true } | { ok: false; reason: "not_admin" | "unavailable" };

/**
 * Make sure the caller's ACTIVE Clerk organization has a Mytheus tenant behind it.
 *
 * `POST /orgs/self-serve` creates it the first time (the caller must be that org's Clerk admin,
 * which the backend checks with Clerk itself) and returns the existing one every time after, so
 * onboarding calls this unconditionally, whether the visitor created a workspace or joined one.
 * Without it a new workspace exists in Clerk only, and every API call is refused with "Token
 * carries no usable organization". The org and user come from the session token; nothing is
 * taken from the request.
 */
export async function provisionActiveWorkspace(): Promise<ProvisionOutcome> {
  try {
    await api("/orgs/self-serve", { method: "POST" });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { ok: false, reason: "not_admin" };
    return { ok: false, reason: "unavailable" };
  }
}
