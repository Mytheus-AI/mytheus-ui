/**
 * admin-ops-service, the internal-ops API `/admin/ops/*` (Phase P12, P12 contract section 2).
 * Mytheus staff only; deny by default; every call, reads included, lands in `ops_audit_log`.
 *
 *   GET    /admin/ops/whoami               {staff}
 *   GET    /admin/ops/tenants              {items: OpsTenant[]}
 *   POST   /admin/ops/tenants/suspend      {org_id, reason}
 *   POST   /admin/ops/tenants/reinstate    {org_id}
 *   GET    /admin/ops/flags                {items: FeatureFlag[]}
 *   POST   /admin/ops/flags                {key, org_id|null, enabled, rules?}
 *   PATCH  /admin/ops/flags/{id}           {enabled?, rules?}
 *   DELETE /admin/ops/flags/{id}
 *   GET    /admin/ops/costs                CostsDashboard
 *   POST   /admin/ops/audit/search         {org_id|null, cursor|null, limit} -> AuditPage
 *
 * The target tenant of an ops action travels in the request BODY, never the path or query
 * (project rule: no org_id in a path or query). It is a target the staff member picked from the
 * directory, never the caller's own tenant, which the gateway still derives from the session.
 *
 * HAND-WRITTEN TYPES (see `lib/ops.ts`): re-run `npm run generate:api` once the backend PR merges.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import type { Load } from "@/lib/api/admin-tenant";
import { load } from "@/lib/api/admin-tenant";
import { opsGate, type AuditPage, type CostsDashboard, type FeatureFlag, type OpsGate, type OpsTenant } from "@/lib/ops";

export async function checkOpsGate(): Promise<OpsGate> {
  try {
    return opsGate({ ok: true, data: await api<unknown>("/admin/ops/whoami") });
  } catch (error) {
    return opsGate({ ok: false, status: error instanceof ApiError ? error.status : 0 });
  }
}

const items = <T>(raw: unknown): T[] =>
  raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items) ? (raw as { items: T[] }).items : [];

export async function loadOpsTenants(): Promise<Load<OpsTenant[]>> {
  const r = await load<unknown>("/admin/ops/tenants");
  return r.kind === "live" ? { kind: "live", data: items<OpsTenant>(r.data) } : r;
}

export async function suspendTenant(orgId: string, reason: string): Promise<void> {
  await api("/admin/ops/tenants/suspend", { method: "POST", body: { org_id: orgId, reason } });
}

export async function reinstateTenant(orgId: string): Promise<void> {
  await api("/admin/ops/tenants/reinstate", { method: "POST", body: { org_id: orgId } });
}

export async function loadFlags(): Promise<Load<FeatureFlag[]>> {
  const r = await load<unknown>("/admin/ops/flags");
  return r.kind === "live" ? { kind: "live", data: items<FeatureFlag>(r.data) } : r;
}

export async function createFlag(body: { key: string; org_id: string | null; enabled: boolean }): Promise<FeatureFlag> {
  return api<FeatureFlag>("/admin/ops/flags", { method: "POST", body });
}

export async function setFlagEnabled(id: string, enabled: boolean): Promise<FeatureFlag> {
  return api<FeatureFlag>(`/admin/ops/flags/${encodeURIComponent(id)}`, { method: "PATCH", body: { enabled } });
}

export async function deleteFlag(id: string): Promise<void> {
  await api<void>(`/admin/ops/flags/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function loadCosts(): Promise<Load<CostsDashboard>> {
  return load<CostsDashboard>("/admin/ops/costs");
}

export async function searchAudit(body: { org_id: string | null; cursor: string | null; limit: number }): Promise<AuditPage> {
  const raw = await api<Partial<AuditPage>>("/admin/ops/audit/search", { method: "POST", body });
  return { items: Array.isArray(raw.items) ? raw.items : [], next_cursor: typeof raw.next_cursor === "string" ? raw.next_cursor : null };
}
