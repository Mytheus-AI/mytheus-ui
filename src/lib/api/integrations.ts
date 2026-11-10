/**
 * integration-service, the tenant-facing routes (Phase P12, P12 contract section 1). Owner and
 * admin only; the tenant comes from the session at the edge.
 *
 *   GET    /integrations                      one row per R8 provider; never token material
 *   POST   /integrations/{provider}/connect   -> {authorize_url}; 409 PROVIDER_NOT_CONFIGURED,
 *                                             409 PM_ALREADY_CONNECTED
 *   DELETE /integrations/{provider}           revoke, mark disconnected, delete tokens
 *   POST   /oauth/{provider}                  {code, state} from the provider's redirect, sent by
 *                                             the signed-in callback page; 409
 *                                             ACCOUNT_CONNECTED_ELSEWHERE / PM_ALREADY_CONNECTED
 *
 * HAND-WRITTEN TYPES from the contract: re-run `npm run generate:api` once the backend PR merges
 * and switch these to the generated schema.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import { normalizeIntegrations, type IntegrationItem, type ProviderKey } from "@/lib/integrations";

export interface IntegrationList {
  items: IntegrationItem[];
}

export interface ConnectResponse {
  authorize_url: string;
}

export type IntegrationsLoad =
  | { kind: "live"; items: Map<ProviderKey, IntegrationItem> }
  | { kind: "forbidden" }
  | { kind: "unavailable" };

/**
 * The connections, or why there are none. A 404 or 5xx means integration-service is not
 * deployed or not reachable; the page says so instead of showing every card as disconnected.
 */
export async function loadIntegrations(): Promise<IntegrationsLoad> {
  try {
    return { kind: "live", items: normalizeIntegrations(await api<unknown>("/integrations")) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { kind: "forbidden" };
    return { kind: "unavailable" };
  }
}

export async function connectIntegration(provider: ProviderKey): Promise<ConnectResponse> {
  return api<ConnectResponse>(`/integrations/${encodeURIComponent(provider)}/connect`, { method: "POST" });
}

export async function disconnectIntegration(provider: ProviderKey): Promise<void> {
  await api<void>(`/integrations/${encodeURIComponent(provider)}`, { method: "DELETE" });
}

/** Finish the OAuth exchange. Code and state go in the JSON body, never a URL. */
export async function completeOAuth(provider: ProviderKey, code: string, state: string): Promise<void> {
  await api(`/oauth/${encodeURIComponent(provider)}`, { method: "POST", body: { code, state } });
}
