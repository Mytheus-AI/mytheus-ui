/**
 * The internal-ops console over `/admin/ops/*` (Phase P12, plan 3.13 step 3, P12 contract
 * sections 0 and 2), as wire types plus pure helpers.
 *
 * Ops staff are Mytheus staff, listed in `MYTHEUS_STAFF_USER_IDS` on admin-ops-service. Deny by
 * default: the console renders only when `GET /admin/ops/whoami` answers `{staff: true}`. Every
 * ops call, reads included, is written to `ops_audit_log` by the server. The views are aggregates
 * over control-plane tables, never tenant content.
 *
 * HAND-WRITTEN TYPES from the contract (shapes agreed with the admin-ops-service author): re-run
 * `npm run generate:api` once the backend PR merges and switch these to the generated schema.
 */

export interface WhoAmI {
  staff: boolean;
}

export interface OpsTenant {
  org_id: string;
  name: string;
  plan: string | null;
  status: "active" | "suspended" | string;
  member_count: number;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  org_id: string | null;
  enabled: boolean;
  rules: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface CostRow {
  org_id: string;
  name: string;
  tokens_consumed: number;
  token_quota: number | null;
}

export interface CostsDashboard {
  period: string;
  tenants: CostRow[];
  dlq: { topic: string; count: number }[] | null;
  consumer_lag: { group: string; topic: string; lag: number }[] | null;
}

export interface AuditEntry {
  id: string;
  org_id: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: unknown;
  occurred_at: string;
}

export interface AuditPage {
  items: AuditEntry[];
  next_cursor: string | null;
}

/** The whoami call as the page sees it: a body, or the HTTP status it failed with (0 = no answer). */
export type WhoAmIResult = { ok: true; data: unknown } | { ok: false; status: number };

export type OpsGate = "staff" | "denied" | "unavailable";

/**
 * Deny by default. Only an explicit `{staff: true}` opens the console. `{staff: false}`, a 401 or
 * a 403 is "denied" (the page answers 404, so the console's existence is not advertised). Any
 * other failure is "unavailable": still no data, but an honest message instead of a 404 that would
 * hide a broken deploy from the staff who need it.
 */
export function opsGate(res: WhoAmIResult): OpsGate {
  if (res.ok) {
    const staff = res.data && typeof res.data === "object" ? (res.data as { staff?: unknown }).staff : undefined;
    return staff === true ? "staff" : "denied";
  }
  if (res.status === 401 || res.status === 403) return "denied";
  return "unavailable";
}

/**
 * The suspend / reinstate confirm step. Suspending a tenant stops every member's access, so it
 * never happens on one click: the operator picks the tenant, gives a reason, confirms, and only
 * then is the call made. One tenant at a time.
 */
export type SuspendState =
  | { step: "idle" }
  | { step: "confirming"; orgId: string; name: string; verb: "suspend" | "reinstate"; reason: string }
  | { step: "submitting"; orgId: string; name: string; verb: "suspend" | "reinstate"; reason: string }
  | { step: "done"; message: string }
  | { step: "error"; orgId: string; name: string; verb: "suspend" | "reinstate"; reason: string; message: string };

export type SuspendEvent =
  | { type: "ask"; orgId: string; name: string; verb: "suspend" | "reinstate" }
  | { type: "reason"; reason: string }
  | { type: "submit" }
  | { type: "succeeded"; message: string }
  | { type: "failed"; message: string }
  | { type: "cancel" };

export const REASON_MIN = 5;

export function canSubmitSuspend(s: SuspendState): boolean {
  if (s.step !== "confirming" && s.step !== "error") return false;
  return s.verb === "reinstate" || s.reason.trim().length >= REASON_MIN;
}

export function suspendReducer(s: SuspendState, e: SuspendEvent): SuspendState {
  switch (e.type) {
    case "ask":
      if (s.step === "submitting") return s;
      return { step: "confirming", orgId: e.orgId, name: e.name, verb: e.verb, reason: "" };
    case "reason":
      if (s.step === "confirming" || s.step === "error") return { ...s, step: "confirming", reason: e.reason } as SuspendState;
      return s;
    case "submit":
      if (!canSubmitSuspend(s) || (s.step !== "confirming" && s.step !== "error")) return s;
      return { step: "submitting", orgId: s.orgId, name: s.name, verb: s.verb, reason: s.reason };
    case "succeeded":
      return s.step === "submitting" ? { step: "done", message: e.message } : s;
    case "failed":
      return s.step === "submitting" ? { ...s, step: "error", message: e.message } : s;
    case "cancel":
      return s.step === "submitting" ? s : { step: "idle" };
  }
}

/** Highest token use first; a tenant with a quota sorts by share of it, ahead of raw volume. */
export function sortCosts(rows: CostRow[]): (CostRow & { ratio: number | null })[] {
  return rows
    .map((r) => ({ ...r, ratio: r.token_quota && r.token_quota > 0 ? r.tokens_consumed / r.token_quota : null }))
    .sort((a, b) => (b.ratio ?? -1) - (a.ratio ?? -1) || b.tokens_consumed - a.tokens_consumed);
}

const FLAG_KEY = /^[a-z][a-z0-9_.-]{1,63}$/;
export function isFlagKey(v: unknown): v is string {
  return typeof v === "string" && FLAG_KEY.test(v);
}
