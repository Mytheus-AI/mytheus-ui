/**
 * Connecting apps over OAuth (Claude custom connectors), identity-tenant-service:
 *
 *   GET    /api/v1/oauth/consent?request=   what the consent page shows (app, access, workspace)
 *   POST   /api/v1/oauth/consent            {request, decision, scope?} -> the app's callback URL
 *   GET    /api/v1/oauth/grants             the caller's connected apps
 *   DELETE /api/v1/oauth/grants/{id}        disconnect one (its tokens stop at once)
 *
 * These take a signed-in session only, so no token (personal or OAuth) can approve an app.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import type { components as IdentitySchemas } from "@/lib/api/generated/identity-tenant-service";
import { problemFromApi, type ConsentProblem } from "@/lib/oauth-consent";

export type ConsentDetails = IdentitySchemas["schemas"]["ConsentRequest"];
export type ConnectedApp = IdentitySchemas["schemas"]["ConnectedApp"];
type ConnectedAppList = IdentitySchemas["schemas"]["ConnectedAppList"];
type ConsentDecision = IdentitySchemas["schemas"]["ConsentDecision"];
type ConsentResult = IdentitySchemas["schemas"]["ConsentResult"];

export type ConsentLoad = { kind: "live"; details: ConsentDetails } | { kind: "problem"; problem: ConsentProblem } | { kind: "signed_out" };

export async function loadConsent(request: string): Promise<ConsentLoad> {
  try {
    return { kind: "live", details: await api<ConsentDetails>("/api/v1/oauth/consent", { query: { request } }) };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isAuthFailure) return { kind: "signed_out" };
      return { kind: "problem", problem: problemFromApi(error.status, error.reason) };
    }
    return { kind: "problem", problem: "unavailable" };
  }
}

export async function decideConsent(body: ConsentDecision): Promise<ConsentResult> {
  return api<ConsentResult>("/api/v1/oauth/consent", { method: "POST", body });
}

export type ConnectedAppsLoad = { kind: "live"; items: ConnectedApp[] } | { kind: "unavailable" };

export async function loadConnectedApps(): Promise<ConnectedAppsLoad> {
  try {
    return { kind: "live", items: (await api<ConnectedAppList>("/api/v1/oauth/grants")).items };
  } catch (error) {
    if (error instanceof ApiError && error.isAuthFailure) throw error;
    return { kind: "unavailable" };
  }
}

export async function disconnectApp(id: string): Promise<void> {
  await api<void>(`/api/v1/oauth/grants/${encodeURIComponent(id)}`, { method: "DELETE" });
}
