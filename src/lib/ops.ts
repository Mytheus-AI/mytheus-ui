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
  /** Only for staff: the Staff ID a workspace admin enters in a support grant. */
  staff_id?: string;
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
  /** Keyset paging over `tenants` (`?limit=&cursor=`); null on the last page. */
  next_cursor?: string | null;
}

/** `GET /admin/ops/tenants`, keyset-paged newest first. */
export interface OpsTenantPage {
  items: OpsTenant[];
  next_cursor: string | null;
}

export const PAGE_LIMIT = 200;
export const MAX_PAGES = 10;

/**
 * Follow a keyset-paged list to the end, up to `maxPages` pages, so the directory, the flag
 * scope picker and the audit tenant picker all see every tenant. Stops on a null cursor, on a
 * cursor that repeats (a server bug must not loop forever), or at the cap, which it reports as
 * `truncated` so the page can say the list is incomplete instead of pretending it is whole.
 */
export async function collectPages<T>(
  fetchPage: (cursor: string | null) => Promise<{ items: T[]; next_cursor: string | null }>,
  maxPages: number = MAX_PAGES,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const res = await fetchPage(cursor);
    items.push(...res.items);
    const next = typeof res.next_cursor === "string" && res.next_cursor ? res.next_cursor : null;
    if (next === null || seen.has(next)) return { items, truncated: false };
    seen.add(next);
    cursor = next;
  }
  return { items, truncated: true };
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

/* --- The superadmin console (ADR-0046) ------------------------------------------------------- */

export interface WeekCount {
  week: string;
  count: number;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface OpsOverview {
  period: string;
  totals: {
    tenants: number;
    active: number;
    suspended: number;
    members: number;
    meetings_7d: number;
    meetings_total: number;
    tokens_period: number;
    feedback_new?: number;
  };
  signups_by_week: WeekCount[];
  meetings_by_week: WeekCount[];
  plans: { plan: string; count: number }[];
  token_leaders: { org_id: string; name: string; tokens: number; token_quota: number | null }[];
  ops_activity_by_day: DayCount[];
  /** Workspaces by data-residency region, largest first; absent from an older service. */
  regions?: OpsRegion[];
}

/** One data-residency region on the overview. `unplaced` holds workspaces with no residency row. */
export interface OpsRegion {
  region: string;
  workspaces: number;
  active: number;
  members: number;
  meetings_7d: number;
  cells: { db_cell: string; workspaces: number }[];
}

export interface OpsAction {
  id: string;
  staff_user_id: string | null;
  action: string;
  target_org_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SupportSessionView {
  id: string;
  staff_user_id: string;
  user_id: string;
  user_email: string | null;
  reason: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  end_reason: string | null;
  open: boolean;
}

export interface MoveRequest {
  id: string;
  from_region: string;
  from_cell: string;
  to_region: string;
  to_cell: string;
  status: string;
  reason: string;
  requested_by: string;
  created_at: string;
  updated_at: string;
}

export interface TenantGrant {
  id: string;
  staff_user_id: string;
  scope: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  active: boolean;
}

export interface TenantDetail {
  org_id: string;
  name: string;
  status: string;
  plan: string | null;
  created_at: string;
  residency: { region: string; db_cell: string; qdrant_region: string; object_bucket_region: string; locked_at: string | null } | null;
  members: number;
  meetings_total: number;
  meetings_by_week: WeekCount[];
  tokens_period: number;
  token_quota: number | null;
  period: string;
  flags: FeatureFlag[];
  grants: TenantGrant[];
  sessions: SupportSessionView[];
  migrations: MoveRequest[];
  recent_ops: OpsAction[];
}

export interface ServiceProbe {
  service: string;
  status: "up" | "down";
  latency_ms: number | null;
  detail?: string | null;
}

export interface OpsHealth {
  checked_at: string;
  services: ServiceProbe[];
  outbox_pending: number;
  outbox_oldest_pending_at: string | null;
  outbox_max_attempts: number;
  outbox_tenants: { org_id: string; name: string; pending: number; oldest_pending_at: string | null; max_attempts: number }[];
  dlq: { topic: string; count: number }[] | null;
  consumer_lag: { group: string; topic: string; lag: number }[] | null;
}

export interface StaffMember {
  /** The Staff ID (what a support grant names), derived from the Clerk user id. */
  user_id: string;
  clerk_user_id: string;
  name?: string | null;
  email: string | null;
  /** Clerk says this account belongs to an organization: it is listed but refused as staff. */
  in_workspace?: boolean;
  last_seen_at: string | null;
  actions_30d: number;
}

export interface StaffReport {
  staff: StaffMember[];
  activity_by_day: DayCount[];
  recent: OpsAction[];
}

export interface SupportMember {
  user_id: string;
  name?: string | null;
  email: string;
  tier: string | null;
  is_staff: boolean;
}

export const REGIONS = [
  { value: "us", label: "United States" },
  { value: "eu", label: "European Union" },
  { value: "ap", label: "Asia Pacific" },
] as const;
export type Region = (typeof REGIONS)[number]["value"];
export const isRegion = (v: unknown): v is Region => REGIONS.some((r) => r.value === v);

export const SESSION_MINUTES = [15, 30, 45, 60] as const;
export const isSessionMinutes = (v: unknown): v is (typeof SESSION_MINUTES)[number] =>
  typeof v === "number" && (SESSION_MINUTES as readonly number[]).includes(v);

/** A readable name for an `ops_audit_log` action. An unknown action shows as stored. */
const ACTION_LABELS: Record<string, string> = {
  "ops.whoami": "Opened the console",
  "ops.denied": "Refused a non-staff call",
  "overview.read": "Viewed the overview",
  "tenants.list": "Listed workspaces",
  "tenant.detail": "Opened a workspace",
  "tenant.suspend": "Suspended a workspace",
  "tenant.reinstate": "Reinstated a workspace",
  "tenant.migrate": "Requested a move",
  "tenant.migrate.cancel": "Cancelled a move",
  "flags.list": "Viewed flags",
  "flag.create": "Created a flag",
  "flag.update": "Changed a flag",
  "flag.delete": "Deleted a flag",
  "costs.read": "Viewed costs",
  "audit.read": "Read an audit log",
  "health.read": "Checked health",
  "staff.read": "Viewed staff",
  "support.members": "Listed members for support",
  "support.session.start": "Started a support session",
  "support.session.end": "Ended a support session",
  "feedback.list": "Read the feedback inbox",
  "feedback.status": "Marked a feedback report",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** The worst state wins: one service down is never averaged away. */
export function healthSummary(services: ServiceProbe[]): { up: number; down: number } {
  const down = services.filter((s) => s.status !== "up").length;
  return { up: services.length - down, down };
}

/** Round a chart's top up to a clean tick: 1, 2, 5 times a power of ten. Never below 1. */
export function niceMax(v: number): number {
  if (!Number.isFinite(v) || v <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/* --- Bug reports and feedback (ADR-0046 D6) -------------------------------------------------- */

export type FeedbackKind = "bug" | "feedback";
export type FeedbackStatus = "new" | "seen" | "resolved";

export interface FeedbackReport {
  id: string;
  kind: FeedbackKind | string;
  message: string;
  page: string | null;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}

export interface OpsFeedback extends FeedbackReport {
  org_id: string;
  org_name: string | null;
  user_id: string;
  reporter_email: string;
  handled_by: string | null;
}

export const FEEDBACK_MAX = 4000;
export const FEEDBACK_STATES = ["new", "seen", "resolved"] as const;
export const isFeedbackKind = (v: unknown): v is FeedbackKind => v === "bug" || v === "feedback";
export const isFeedbackStatus = (v: unknown): v is FeedbackStatus => (FEEDBACK_STATES as readonly unknown[]).includes(v);
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = { new: "Sent", seen: "Seen by the team", resolved: "Resolved" };
