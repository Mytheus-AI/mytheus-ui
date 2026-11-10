/**
 * admin-ops-service, the tenant-admin API `/admin/tenant/*` (Phase P12, P12 contract section 2).
 * Owner and admin only; the tenant comes from the session at the edge, and every write is
 * audited in `audit_logs` by the server.
 *
 *   GET    /admin/tenant/members                 {items: TenantMember[]}
 *   PATCH  /admin/tenant/members/{user_id}       {tier}
 *   DELETE /admin/tenant/members/{user_id}       revoke the RBAC grant (Clerk membership stays)
 *   GET    /admin/tenant/settings                TenantSettings
 *   PATCH  /admin/tenant/settings                partial TenantSettings
 *   GET    /admin/tenant/support-grants          {items: SupportGrant[]}
 *   POST   /admin/tenant/support-grants          {staff_user_id, scope, expires_at}
 *   DELETE /admin/tenant/support-grants/{id}     revoke
 *   GET    /admin/tenant/data-export             {items: ExportRequest[]}
 *   POST   /admin/tenant/data-export             202 ExportRequest
 *   GET    /admin/tenant/erasures                {items: Erasure[]}   erasures, each with status and stores[]
 *   POST   /admin/tenant/erasures                {kind, target_id, confirm} -> Erasure
 *
 * HAND-WRITTEN TYPES (see `lib/tenant-admin.ts`): re-run `npm run generate:api` once the backend
 * PR merges.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import type { components as AdminSchemas } from "@/lib/api/generated/admin-ops-service";
import type { ExportRequest, GrantScope, SupportGrant, TenantMember, TenantSettings, Tier } from "@/lib/tenant-admin";

/** A read, or why it failed. `forbidden` and `unavailable` get different copy on the page. */
export type Load<T> = { kind: "live"; data: T } | { kind: "forbidden" } | { kind: "unavailable" };

export async function load<T>(path: string): Promise<Load<T>> {
  try {
    return { kind: "live", data: await api<T>(path) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { kind: "forbidden" };
    return { kind: "unavailable" };
  }
}

const items = <T>(raw: unknown): T[] =>
  raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items) ? (raw as { items: T[] }).items : [];

export async function loadTenantMembers(): Promise<Load<TenantMember[]>> {
  const r = await load<unknown>("/admin/tenant/members");
  return r.kind === "live" ? { kind: "live", data: items<TenantMember>(r.data) } : r;
}

export async function setMemberTier(userId: string, tier: Tier): Promise<void> {
  await api(`/admin/tenant/members/${encodeURIComponent(userId)}`, { method: "PATCH", body: { tier } });
}

export async function removeMember(userId: string): Promise<void> {
  await api<void>(`/admin/tenant/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export async function loadTenantSettings(): Promise<Load<TenantSettings>> {
  return load<TenantSettings>("/admin/tenant/settings");
}

export async function patchTenantSettings(body: Partial<TenantSettings>): Promise<TenantSettings> {
  return api<TenantSettings>("/admin/tenant/settings", { method: "PATCH", body });
}

export async function loadSupportGrants(): Promise<Load<SupportGrant[]>> {
  const r = await load<unknown>("/admin/tenant/support-grants");
  return r.kind === "live" ? { kind: "live", data: items<SupportGrant>(r.data) } : r;
}

export async function createSupportGrant(body: { staff_user_id: string; scope: GrantScope; expires_at: string }): Promise<SupportGrant> {
  return api<SupportGrant>("/admin/tenant/support-grants", { method: "POST", body });
}

export async function revokeSupportGrant(id: string): Promise<void> {
  await api<void>(`/admin/tenant/support-grants/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function loadExportRequests(): Promise<Load<ExportRequest[]>> {
  const r = await load<unknown>("/admin/tenant/data-export");
  return r.kind === "live" ? { kind: "live", data: items<ExportRequest>(r.data) } : r;
}

export async function requestDataExport(): Promise<ExportRequest> {
  return api<ExportRequest>("/admin/tenant/data-export", { method: "POST", body: {} });
}


export type Erasure = AdminSchemas["schemas"]["Erasure"];
export type ErasureCreate = AdminSchemas["schemas"]["ErasureCreate"];

export async function loadErasures(): Promise<Load<Erasure[]>> {
  const res = await load<{ items: Erasure[] }>("/admin/tenant/erasures");
  return res.kind === "live" ? { kind: "live", data: res.data.items ?? [] } : res;
}

export async function postErasure(body: ErasureCreate): Promise<Erasure> {
  return api<Erasure>("/admin/tenant/erasures", { method: "POST", body });
}
