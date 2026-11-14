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
  type MoveRequest,
  type OpsGate,
  type OpsFeedback,
  type OpsHealth,
  type OpsOverview,
  type OpsTenant,
  type StaffReport,
  type SupportMember,
  type SupportSessionView,
  type TenantDetail,
} from "@/lib/ops";

/** The caller's own Staff ID, or null when they are not staff or the service cannot answer. */
export async function myStaffId(): Promise<string | null> {
  try {
    const me = await api<{ staff?: unknown; staff_id?: unknown }>("/admin/ops/whoami");
    return me.staff === true && typeof me.staff_id === "string" ? me.staff_id : null;
  } catch {
    return null;
  }
}

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

/* --- The superadmin console (ADR-0046) -------------------------------------------------------
 *   GET    /admin/ops/overview                    OpsOverview
 *   GET    /admin/ops/health                      OpsHealth
 *   GET    /admin/ops/staff                       StaffReport
 *   POST   /admin/ops/tenants/detail              {org_id} -> TenantDetail
 *   POST   /admin/ops/tenants/migrate             {org_id, to_region, to_cell?, reason} -> MoveRequest
 *   POST   /admin/ops/tenants/migrations/cancel   {org_id, migration_id}
 *   POST   /admin/ops/support/members             {org_id} (needs an impersonate grant)
 *   POST   /admin/ops/support/sessions            {org_id, user_id, reason, minutes} -> {session, sign_in_url}
 *   POST   /admin/ops/support/sessions/end        {org_id, session_id}
 * Every target workspace rides in the body. */

export async function loadOverview(): Promise<Load<OpsOverview>> {
  return load<OpsOverview>("/admin/ops/overview");
}

export async function loadHealth(): Promise<Load<OpsHealth>> {
  return load<OpsHealth>("/admin/ops/health");
}

export async function loadStaff(): Promise<Load<StaffReport>> {
  return load<StaffReport>("/admin/ops/staff");
}

export async function fetchTenantDetail(orgId: string): Promise<TenantDetail> {
  return api<TenantDetail>("/admin/ops/tenants/detail", { method: "POST", body: { org_id: orgId } });
}

export async function changePlan(body: { org_id: string; plan_code: string; reason: string | null }): Promise<{
  org_id: string;
  plan_code: string;
  token_quota: number;
  tokens_consumed: number;
  state: string;
}> {
  return api("/admin/ops/tenants/plan", { method: "POST", body });
}

export async function requestMove(body: { org_id: string; to_region: string; to_cell: string | null; reason: string }): Promise<MoveRequest> {
  return api<MoveRequest>("/admin/ops/tenants/migrate", { method: "POST", body });
}

export async function cancelMove(orgId: string, migrationId: string): Promise<MoveRequest> {
  return api<MoveRequest>("/admin/ops/tenants/migrations/cancel", { method: "POST", body: { org_id: orgId, migration_id: migrationId } });
}

export async function fetchSupportMembers(orgId: string): Promise<{ items: SupportMember[]; grant_expires_at: string }> {
  return api("/admin/ops/support/members", { method: "POST", body: { org_id: orgId } });
}

export async function startSupportSession(body: {
  org_id: string;
  user_id: string;
  reason: string;
  minutes: number;
}): Promise<{ session: SupportSessionView; sign_in_url: string }> {
  return api("/admin/ops/support/sessions", { method: "POST", body });
}

export async function endSupportSession(orgId: string, sessionId: string): Promise<SupportSessionView> {
  return api<SupportSessionView>("/admin/ops/support/sessions/end", { method: "POST", body: { org_id: orgId, session_id: sessionId } });
}

/* Bug reports and feedback, the staff inbox (ADR-0046 D6). */
export async function loadFeedbackInbox(state: "new" | "seen" | "resolved" | "all"): Promise<Load<{ items: OpsFeedback[]; counts: Record<string, number> }>> {
  try {
    return { kind: "live", data: await api<{ items: OpsFeedback[]; counts: Record<string, number> }>("/admin/ops/feedback", { query: { state } }) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { kind: "forbidden" };
    return { kind: "unavailable" };
  }
}

export async function setFeedbackStatus(id: string, status: "new" | "seen" | "resolved"): Promise<OpsFeedback> {
  return api<OpsFeedback>("/admin/ops/feedback/status", { method: "POST", body: { id, status } });
}
