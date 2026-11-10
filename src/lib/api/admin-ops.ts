/**
 * admin-ops-service, the internal-ops API `/admin/ops/*` (Phase P12, P12 contract section 2).
 * Mytheus staff only; deny by default; every call, reads included, lands in `ops_audit_log`.
 *
 *   GET    /admin/ops/whoami               {staff}
 *   GET    /admin/ops/tenants              {items: OpsTenant[], next_cursor}  (?limit=&cursor=)
 *   POST   /admin/ops/tenants/suspend      {org_id, reason}
 *   POST   /admin/ops/tenants/reinstate    {org_id}
 *   GET    /admin/ops/flags                {items: FeatureFlag[]}
 *   POST   /admin/ops/flags                {key, org_id|null, enabled, rules?}
 *   PATCH  /admin/ops/flags/{id}           {enabled?, rules?}
 *   DELETE /admin/ops/flags/{id}
 *   GET    /admin/ops/costs                CostsDashboard, tenants keyset-paged  (?limit=&cursor=)
 *   POST   /admin/ops/audit/search         {org_id, cursor|null, limit} -> AuditPage (one tenant)
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
import {
  PAGE_LIMIT,
  collectPages,
  opsGate,
  type AuditPage,
  type CostRow,
  type CostsDashboard,
  type FeatureFlag,
  type OpsGate,
  type OpsTenant,
} from "@/lib/ops";

export async function checkOpsGate(): Promise<OpsGate> {
  try {
    return opsGate({ ok: true, data: await api<unknown>("/admin/ops/whoami") });
  } catch (error) {
    return opsGate({ ok: false, status: error instanceof ApiError ? error.status : 0 });
  }
}

const items = <T>(raw: unknown): T[] =>
  raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items) ? (raw as { items: T[] }).items : [];

const nextCursor = (raw: unknown): string | null => {
  const c = raw && typeof raw === "object" ? (raw as { next_cursor?: unknown }).next_cursor : null;
  return typeof c === "string" && c ? c : null;
};

/** A paged read that degrades like `load`: the first failure decides forbidden or unavailable. */
async function loadAllPages<T>(
  path: string,
  pick: (raw: unknown) => T[],
): Promise<Load<{ items: T[]; truncated: boolean; first: unknown }>> {
  let first: unknown = null;
  try {
    const { items: all, truncated } = await collectPages<T>(async (cursor) => {
      const raw = await api<unknown>(path, { query: { limit: PAGE_LIMIT, cursor: cursor ?? undefined } });
      if (first === null) first = raw;
      return { items: pick(raw), next_cursor: nextCursor(raw) };
    });
    return { kind: "live", data: { items: all, truncated, first } };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { kind: "forbidden" };
    return { kind: "unavailable" };
  }
}

/** Every tenant, following the keyset pages (capped; `truncated` says when the cap was hit). */
export async function loadOpsTenants(): Promise<Load<{ tenants: OpsTenant[]; truncated: boolean }>> {
  const r = await loadAllPages("/admin/ops/tenants", (raw) => items<OpsTenant>(raw));
  return r.kind === "live" ? { kind: "live", data: { tenants: r.data.items, truncated: r.data.truncated } } : r;
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

/** The cost and lag dashboard with every tenant row merged across the keyset pages. */
export async function loadCosts(): Promise<Load<CostsDashboard & { truncated: boolean }>> {
  const r = await loadAllPages("/admin/ops/costs", (raw) => {
    const t = raw && typeof raw === "object" ? (raw as { tenants?: unknown }).tenants : null;
    return Array.isArray(t) ? (t as CostRow[]) : [];
  });
  if (r.kind !== "live") return r;
  const head = (r.data.first ?? {}) as Partial<CostsDashboard>;
  return {
    kind: "live",
    data: {
      period: typeof head.period === "string" ? head.period : "",
      tenants: r.data.items,
      dlq: Array.isArray(head.dlq) ? head.dlq : null,
      consumer_lag: Array.isArray(head.consumer_lag) ? head.consumer_lag : null,
      next_cursor: null,
      truncated: r.data.truncated,
    },
  };
}

export async function searchAudit(body: { org_id: string; cursor: string | null; limit: number }): Promise<AuditPage> {
  const raw = await api<Partial<AuditPage>>("/admin/ops/audit/search", { method: "POST", body });
  return { items: Array.isArray(raw.items) ? raw.items : [], next_cursor: typeof raw.next_cursor === "string" ? raw.next_cursor : null };
}
