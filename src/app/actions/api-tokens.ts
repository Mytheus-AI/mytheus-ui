"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { createApiToken, revokeApiToken, type ApiToken } from "@/lib/api/api-tokens";
import { validateTokenInput, type TokenScope } from "@/lib/api-access";

/* Create and revoke personal access tokens (Settings > API access). The token text comes back
   from identity once, in the create response, and goes straight to the dialog that shows it; it
   is never logged, stored, or put in a URL. The user and tenant come from the session. */

const PATH = "/settings/api";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateTokenResult =
  | { ok: true; token: string; item: ApiToken }
  | { ok: false; message: string; field?: "name" | "scope" | "expiry" };

export async function createToken(input: { name: string; scope: TokenScope; expiresInDays: number }): Promise<CreateTokenResult> {
  const problem = validateTokenInput(input);
  if (problem) return { ok: false, message: problem.message, field: problem.field };
  try {
    const created = await createApiToken({ name: input.name.trim(), scope: input.scope, expires_in_days: input.expiresInDays });
    revalidatePath(PATH);
    const { token, ...item } = created;
    return { ok: true, token, item };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 409) return { ok: false, message: "You already have 20 active tokens. Revoke one you no longer use first." };
      if (err.status === 422) return { ok: false, message: "The token could not be created as entered. Check the name.", field: "name" };
      if (err.status === 403) return { ok: false, message: "Your account cannot create tokens in this workspace." };
    }
    return { ok: false, message: "The token could not be created just now. Try again in a moment." };
  }
}

export type RevokeTokenResult = { ok: true } | { ok: false; message: string };

export async function revokeToken(id: string): Promise<RevokeTokenResult> {
  if (!UUID.test(id)) return { ok: false, message: "That token does not exist." };
  try {
    await revokeApiToken(id);
  } catch (err) {
    // Already gone: the goal state holds.
    if (!(err instanceof ApiError && err.status === 404)) {
      if (err instanceof ApiError && err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      return { ok: false, message: "The token could not be revoked just now. Try again." };
    }
  }
  revalidatePath(PATH);
  return { ok: true };
}
