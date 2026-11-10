/**
 * The agent-to-agent grant store on `identity-tenant-service` (Phase P10, P10 contract section 3,
 * mytheus-docs ADR-0013). Owner and admin only; the tenant comes from the session at the edge.
 *
 *   GET    /api/v1/agent-authz-scopes             the workspace's active grants
 *   POST   /api/v1/agent-authz-scopes/template    adopt the platform default at one scope
 *   DELETE /api/v1/agent-authz-scopes/{id}        revoke one grant (soft delete)
 *
 * HAND-WRITTEN TYPES, like `context-fills.ts`: re-run `npm run generate:api` once the backend PR
 * merges and switch these to the generated schema.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";

export type GranteeRole = "owner" | "admin" | "member";
export type QueryClass = "meeting_context" | "decision_lineage" | "action_status";
export type TargetScope = "self" | "same_team" | "department" | "org";

export interface AgentAuthzScope {
  id: string;
  grantee_role: GranteeRole;
  query_class: QueryClass;
  target_scope: TargetScope;
  effect: "allow" | "deny";
  created_by: string;
  created_at: string;
}

export interface AgentAuthzScopeList {
  items: AgentAuthzScope[];
}

export interface AgentAuthzTemplateResult {
  created: number;
  items: AgentAuthzScope[];
}

export async function listAgentAuthzScopes(): Promise<AgentAuthzScopeList> {
  return api<AgentAuthzScopeList>("/api/v1/agent-authz-scopes");
}

export async function adoptAgentAuthzTemplate(
  targetScope: "same_team" | "department" | "org",
): Promise<AgentAuthzTemplateResult> {
  return api<AgentAuthzTemplateResult>("/api/v1/agent-authz-scopes/template", {
    method: "POST",
    body: { target_scope: targetScope },
  });
}

export async function revokeAgentAuthzScope(id: string): Promise<void> {
  await api<void>(`/api/v1/agent-authz-scopes/${encodeURIComponent(id)}`, { method: "DELETE" });
}
