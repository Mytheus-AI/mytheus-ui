/**
 * Personal access tokens, identity-tenant-service (Phase 4):
 *
 *   GET    /api/v1/api-tokens          the caller's own tokens (never the token text)
 *   POST   /api/v1/api-tokens          {name, scope, expires_in_days} -> the token text, ONCE
 *   DELETE /api/v1/api-tokens/{id}     revoke; repeating it is a 204 that writes nothing
 *
 * These routes take a signed-in session only, so a token can neither mint nor revoke tokens.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import type { components as IdentitySchemas } from "@/lib/api/generated/identity-tenant-service";

export type ApiToken = IdentitySchemas["schemas"]["ApiToken"];
export type ApiTokenCreated = IdentitySchemas["schemas"]["ApiTokenCreated"];
type ApiTokenList = IdentitySchemas["schemas"]["ApiTokenList"];
type ApiTokenCreate = IdentitySchemas["schemas"]["ApiTokenCreate"];

export type TokensLoad = { kind: "live"; items: ApiToken[] } | { kind: "unavailable" };

export async function loadApiTokens(): Promise<TokensLoad> {
  try {
    return { kind: "live", items: (await api<ApiTokenList>("/api/v1/api-tokens")).items };
  } catch (error) {
    if (error instanceof ApiError && error.isAuthFailure) throw error;
    return { kind: "unavailable" };
  }
}

export async function createApiToken(body: ApiTokenCreate): Promise<ApiTokenCreated> {
  return api<ApiTokenCreated>("/api/v1/api-tokens", { method: "POST", body });
}

export async function revokeApiToken(id: string): Promise<void> {
  await api<void>(`/api/v1/api-tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
}
