/**
 * The tenant-admin console over `/admin/tenant/*` (Phase P12, plan 3.13 and 3.14, P12 contract
 * section 2), as wire types plus pure helpers. Owner and admin only; the server enforces the tier
 * and audits every write in `audit_logs`.
 *
 * HAND-WRITTEN TYPES from the contract: re-run `npm run generate:api` once the admin-ops-service
 * PR merges and switch these to the generated schema.
 */

export type Tier = "owner" | "admin" | "member";
export const TIERS: readonly Tier[] = ["owner", "admin", "member"];

export function isTier(v: unknown): v is Tier {
  return typeof v === "string" && (TIERS as readonly string[]).includes(v);
}

/** One row of `GET /admin/tenant/members`. */
export interface TenantMember {
  user_id: string;
  email: string;
  tier: Tier;
  created_at: string | null;
}

/** `{"<Agent>": {surface, silent}}`, the shape core-api reads (ADR-0030 D3). */
export type ConfidenceOverrides = Record<string, { surface?: number; silent?: number }>;

/** `GET /admin/tenant/settings`, and the body of `PATCH` (every key optional there). */
export interface TenantSettings {
  retention_days_transcripts: number | null;
  retention_days_worklogs: number | null;
  pii_redaction_enabled: boolean;
  agent_confidence_overrides: ConfidenceOverrides;
}

/** One row of `GET /admin/tenant/support-grants`. */
export interface SupportGrant {
  id: string;
  staff_user_id: string;
  scope: string;
  granted_by: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

/** `POST /admin/tenant/data-export` (202). */
export interface ExportRequest {
  id: string;
  status: "pending" | "completed" | string;
  requested_at: string;
  manifest_url: string | null;
}

/** The agents whose bands a tenant may tune, with the platform defaults (doc 08 section 6). */
export const CONFIDENCE_AGENTS = [
  { key: "DecisionAgent", label: "Decisions" },
  { key: "ActionAgent", label: "Action items" },
  { key: "QuestionAgent", label: "Suggested questions" },
  { key: "ContextGapAgent", label: "Context fills" },
] as const;
export const DEFAULT_SURFACE = 0.7;
export const DEFAULT_SILENT = 0.4;

export const RETENTION_MIN = 1;
export const RETENTION_MAX = 3650;

/** Raw form values: strings as typed, blank meaning "use the default". */
export interface SettingsFormInput {
  retention_days_transcripts: string;
  retention_days_worklogs: string;
  pii_redaction_enabled: boolean;
  thresholds: Record<string, { surface: string; silent: string }>;
}

export type SettingsParse = { ok: true; value: TenantSettings } | { ok: false; message: string };

function parseRetention(raw: string, label: string): number | null | string {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return `${label} must be a whole number of days, or blank to keep it until deleted.`;
  const n = Number(t);
  if (n < RETENTION_MIN || n > RETENTION_MAX) return `${label} must be between ${RETENTION_MIN} and ${RETENTION_MAX} days.`;
  return n;
}

function parseScore(raw: string): number | null | "bad" {
  const t = raw.trim();
  if (!t) return null;
  if (!/^(0(\.\d{1,2})?|1(\.0{1,2})?|\.\d{1,2})$/.test(t)) return "bad";
  return Number(t);
}

/**
 * Validate the settings form into the full object the server stores. Blank retention means no
 * limit (null); a blank threshold drops that override so the platform default applies. An agent
 * with neither threshold set has no entry at all. `silent` must not exceed `surface`, or the
 * silent-log band would be empty and inverted.
 */
export function parseSettingsForm(input: SettingsFormInput): SettingsParse {
  const transcripts = parseRetention(input.retention_days_transcripts, "Transcript retention");
  if (typeof transcripts === "string") return { ok: false, message: transcripts };
  const worklogs = parseRetention(input.retention_days_worklogs, "Notes retention");
  if (typeof worklogs === "string") return { ok: false, message: worklogs };

  const overrides: ConfidenceOverrides = {};
  for (const { key, label } of CONFIDENCE_AGENTS) {
    const raw = input.thresholds[key] ?? { surface: "", silent: "" };
    const surface = parseScore(raw.surface);
    const silent = parseScore(raw.silent);
    if (surface === "bad" || silent === "bad") {
      return { ok: false, message: `${label}: thresholds are numbers from 0 to 1, like 0.7.` };
    }
    if ((silent ?? DEFAULT_SILENT) > (surface ?? DEFAULT_SURFACE)) {
      return { ok: false, message: `${label}: the log threshold cannot be higher than the show threshold.` };
    }
    const entry: { surface?: number; silent?: number } = {};
    if (surface !== null) entry.surface = surface;
    if (silent !== null) entry.silent = silent;
    if (Object.keys(entry).length > 0) overrides[key] = entry;
  }

  return {
    ok: true,
    value: {
      retention_days_transcripts: transcripts,
      retention_days_worklogs: worklogs,
      pii_redaction_enabled: input.pii_redaction_enabled === true,
      agent_confidence_overrides: overrides,
    },
  };
}

/** The settings object as form strings, the inverse of `parseSettingsForm`. */
export function settingsToForm(s: TenantSettings): SettingsFormInput {
  const thresholds: SettingsFormInput["thresholds"] = {};
  const o = s.agent_confidence_overrides && typeof s.agent_confidence_overrides === "object" ? s.agent_confidence_overrides : {};
  for (const { key } of CONFIDENCE_AGENTS) {
    const e = o[key];
    thresholds[key] = {
      surface: typeof e?.surface === "number" ? String(e.surface) : "",
      silent: typeof e?.silent === "number" ? String(e.silent) : "",
    };
  }
  return {
    retention_days_transcripts: s.retention_days_transcripts == null ? "" : String(s.retention_days_transcripts),
    retention_days_worklogs: s.retention_days_worklogs == null ? "" : String(s.retention_days_worklogs),
    pii_redaction_enabled: s.pii_redaction_enabled === true,
    thresholds,
  };
}

export type GrantState = "active" | "expired" | "revoked";

export function grantState(g: Pick<SupportGrant, "expires_at" | "revoked_at">, now: number = Date.now()): GrantState {
  if (g.revoked_at) return "revoked";
  const exp = Date.parse(g.expires_at);
  return Number.isNaN(exp) || exp <= now ? "expired" : "active";
}

export type GrantScope = "read_only" | "impersonate";
export const GRANT_SCOPES: readonly { value: GrantScope; label: string; help: string }[] = [
  { value: "read_only", label: "Read only", help: "Staff can look at workspace settings and metadata, and change nothing." },
  { value: "impersonate", label: "Act as support", help: "Staff can act in the workspace to fix a problem. Every action is tagged as system and logged." },
];
export function isGrantScope(v: unknown): v is GrantScope {
  return v === "read_only" || v === "impersonate";
}

/** Server rule: a grant lasts at most 30 days. */
export const GRANT_DURATIONS = [
  { hours: 4, label: "4 hours" },
  { hours: 24, label: "24 hours" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
  { hours: 720, label: "30 days" },
] as const;

export function isGrantDuration(h: number): boolean {
  return GRANT_DURATIONS.some((d) => d.hours === h);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/**
 * Which tier changes the UI offers for a row. The server is the authority (it refuses removing
 * or demoting the last owner, and only an owner may grant owner); this only stops the obvious
 * self-lockout of changing or removing your own row from here.
 */
export function memberControls(row: { isYou: boolean }): { canChangeTier: boolean; canRemove: boolean } {
  return { canChangeTier: !row.isYou, canRemove: !row.isYou };
}
