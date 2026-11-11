/**
 * Decisions as bets, as pure helpers (tested under `node --test`, shared by the decision page,
 * the "How good are our calls" page and the server actions).
 *
 * A bet is what a decision expects to happen: a metric that should move or reach a level, or an
 * event that should (or should not) happen, checked on a date. The agent may propose one when the
 * meeting said so; a person always accepts, edits and resolves it.
 */

import type {
  Bet,
  BetSource,
  BetStatus,
  BetUpsert,
  Category,
  Direction,
  Outcome,
} from "./api/bets-types";

export const CATEGORY_LABEL: Record<Category, string> = {
  pricing: "Pricing",
  product: "Product",
  growth: "Growth and marketing",
  customers: "Customers",
  hiring: "Hiring and people",
  operations: "Operations",
  engineering: "Engineering",
  finance: "Finance",
  other: "Other",
};
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

export const DIRECTION_LABEL: Record<Direction, string> = {
  increase: "Goes up",
  decrease: "Goes down",
  reach: "Reaches a level",
  hold: "Holds steady",
  happen: "Happens",
  not_happen: "Does not happen",
};
export const METRIC_DIRECTIONS: Direction[] = ["increase", "decrease", "reach", "hold"];
export const EVENT_DIRECTIONS: Direction[] = ["happen", "not_happen"];

export const SOURCE_LABEL: Record<BetSource, string> = {
  crm: "The CRM (HubSpot)",
  metrics: "Product or business metrics",
  meetings: "Later meetings and decisions",
  jira: "Jira, the work itself",
  manual: "The owner's own judgement",
};
export const SOURCES = Object.keys(SOURCE_LABEL) as BetSource[];

/** The CRM numbers integration-service can read on the check date (core-api `CRM_METRICS`). */
export const CRM_METRICS: { key: string; label: string; unit: string }[] = [
  { key: "hubspot.deals_won", label: "Deals won", unit: "deals" },
  { key: "hubspot.revenue_won", label: "Revenue won", unit: "$" },
  { key: "hubspot.new_contacts", label: "New contacts", unit: "contacts" },
  { key: "hubspot.new_companies", label: "New companies", unit: "companies" },
];

export const OUTCOME_LABEL: Record<Outcome, string> = { hit: "Hit", partly: "Partly", missed: "Missed" };

export const STATUS_LABEL: Record<BetStatus, string> = {
  proposed: "Suggested by your agent",
  open: "Waiting for the check date",
  due: "Ready to score",
  resolved: "Scored",
  dismissed: "Not a bet",
};

export type ChipToneName = "neutral" | "accent" | "high" | "medium" | "low" | "ok";

/** "Hit", "Partly", "Missed" for any outcome string the API sends; empty for anything else. */
export function outcomeLabel(outcome: string | null | undefined): string {
  return outcome === "hit" || outcome === "partly" || outcome === "missed" ? OUTCOME_LABEL[outcome] : "";
}

export function outcomeTone(outcome: string | null | undefined): ChipToneName {
  if (outcome === "hit") return "ok";
  if (outcome === "partly") return "medium";
  if (outcome === "missed") return "neutral";
  return "neutral";
}

export function statusTone(status: BetStatus): ChipToneName {
  if (status === "due") return "medium";
  if (status === "proposed") return "accent";
  if (status === "open") return "low";
  return "neutral";
}

const DAY = 86_400_000;

function utcDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `today` to `check` (negative once it has passed). */
export function daysUntil(check: string, today: string): number {
  return Math.round((utcDay(check) - utcDay(today)) / DAY);
}

/** "in 12 days", "tomorrow", "today", "3 days ago". */
export function relativeDay(check: string, today: string): string {
  const n = daysUntil(check, today);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 1 && n < 60) return `in ${n} days`;
  if (n >= 60) return `in about ${Math.round(n / 30)} months`;
  return n > -60 ? `${-n} days ago` : `about ${Math.round(-n / 30)} months ago`;
}

const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatDay(iso: string): string {
  return dayFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

function num(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** The size with its unit, read like a person would say it: "3 points", "15%", "$40,000". */
export function sizeLabel(n: number | null | undefined, unit: string | null | undefined): string | null {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const u = (unit ?? "").trim();
  if (u === "%") return `${num(Math.abs(n))}%`;
  if (u === "$") return `$${num(Math.abs(n))}`;
  return u ? `${num(Math.abs(n))} ${u}` : num(Math.abs(n));
}

/** The expectation in one plain line when no statement was written: "Monthly churn goes down by 3 points". */
export function expectationLine(b: Pick<Bet, "kind" | "metric" | "direction" | "magnitude" | "unit">): string {
  if (b.kind === "event") return `${b.metric} ${b.direction === "happen" ? "happens" : "does not happen"}`;
  const size = sizeLabel(b.magnitude, b.unit);
  switch (b.direction) {
    case "increase":
      return size ? `${b.metric} goes up by ${size}` : `${b.metric} goes up`;
    case "decrease":
      return size ? `${b.metric} goes down by ${size}` : `${b.metric} goes down`;
    case "reach":
      return size ? `${b.metric} reaches ${size}` : `${b.metric} reaches its target`;
    default:
      return `${b.metric} holds steady`;
  }
}

/** A hit rate as a whole percentage, or a dash when nothing is resolved yet. */
export function pct(rate: number | null | undefined): string {
  return rate === null || rate === undefined ? "No data" : `${Math.round(rate * 100)}%`;
}

/** Brier score in words: 0 is perfect, 0.25 is what always saying 50% earns. */
export function brierWords(brier: number | null | undefined): string {
  if (brier === null || brier === undefined) return "Not enough stated confidence yet";
  if (brier <= 0.1) return "Very well calibrated";
  if (brier <= 0.2) return "Well calibrated";
  if (brier <= 0.3) return "About as good as a coin toss";
  return "Overconfident: the calls land less often than people expect";
}

// --- the editor -------------------------------------------------------------------------------

export type BetDraft = {
  statement: string;
  kind: "metric" | "event";
  metric: string;
  direction: Direction;
  magnitude: string;
  unit: string;
  baseline: string;
  check_date: string;
  source: BetSource;
  metric_key: string;
  category: Category;
  confidence_pct: string;
  assumption: string;
  owner_user_id: string;
  team_id: string;
};

export const LIMITS = { statement: 300, metric: 120, unit: 20, assumption: 300, lesson: 500 } as const;

/** Three months from `today`, the default check date for a new bet. */
export function defaultCheckDate(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export function draftFrom(bet: Bet | null | undefined, today: string, decisionContent = ""): BetDraft {
  if (!bet) {
    return {
      statement: "",
      kind: "metric",
      metric: "",
      direction: "increase",
      magnitude: "",
      unit: "",
      baseline: "",
      check_date: defaultCheckDate(today),
      source: "meetings",
      metric_key: "",
      category: "other",
      confidence_pct: "",
      assumption: "",
      owner_user_id: "",
      team_id: "",
    };
  }
  void decisionContent;
  const s = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return {
    statement: bet.statement,
    kind: bet.kind,
    metric: bet.metric,
    direction: bet.direction,
    magnitude: s(bet.magnitude),
    unit: bet.unit ?? "",
    baseline: s(bet.baseline),
    check_date: bet.check_date,
    source: bet.source,
    metric_key: bet.metric_key ?? "",
    category: bet.category,
    confidence_pct: s(bet.confidence_pct),
    assumption: bet.assumption ?? "",
    owner_user_id: bet.owner_user_id ?? "",
    team_id: bet.team_id ?? "",
  };
}

export type DraftField = keyof BetDraft;
export type DraftCheck = { ok: true; body: BetUpsert } | { ok: false; field: DraftField; message: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function squash(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

function parseNumber(v: string): number | null | "bad" {
  const t = v.replace(/[,\s$%]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : "bad";
}

/** The draft as the PUT body, or the first field that needs fixing, in the house voice. */
export function checkDraft(d: BetDraft, today: string): DraftCheck {
  const statement = squash(d.statement);
  if (!statement) return { ok: false, field: "statement", message: "Say what this decision should achieve." };
  if (statement.length > LIMITS.statement) return { ok: false, field: "statement", message: `Keep it to ${LIMITS.statement} characters.` };
  const metric = squash(d.metric);
  if (!metric) return { ok: false, field: "metric", message: d.kind === "event" ? "Name the event." : "Name what is measured." };
  if (metric.length > LIMITS.metric) return { ok: false, field: "metric", message: `Keep it to ${LIMITS.metric} characters.` };
  const allowed = d.kind === "event" ? EVENT_DIRECTIONS : METRIC_DIRECTIONS;
  if (!allowed.includes(d.direction)) return { ok: false, field: "direction", message: "Choose what should happen." };
  const magnitude = d.kind === "event" ? null : parseNumber(d.magnitude);
  if (magnitude === "bad") return { ok: false, field: "magnitude", message: "Use a number, like 3 or 12.5." };
  if (d.direction === "reach" && magnitude === null) return { ok: false, field: "magnitude", message: "Say the level it should reach." };
  const baseline = d.kind === "event" ? null : parseNumber(d.baseline);
  if (baseline === "bad") return { ok: false, field: "baseline", message: "Use a number, like 7.5." };
  if (!DATE.test(d.check_date)) return { ok: false, field: "check_date", message: "Pick the date to check it." };
  if (d.check_date <= today) return { ok: false, field: "check_date", message: "The check date needs to be in the future." };
  const unit = squash(d.unit);
  if (unit.length > LIMITS.unit) return { ok: false, field: "unit", message: `Keep the unit to ${LIMITS.unit} characters.` };
  const assumption = squash(d.assumption);
  if (assumption.length > LIMITS.assumption) return { ok: false, field: "assumption", message: `Keep it to ${LIMITS.assumption} characters.` };
  let confidence: number | null = null;
  if (d.confidence_pct) {
    const c = Number(d.confidence_pct);
    if (!Number.isInteger(c) || c < 1 || c > 99) return { ok: false, field: "confidence_pct", message: "Choose how sure you are." };
    confidence = c;
  }
  const crm = d.source === "crm" && d.metric_key ? d.metric_key : null;
  if (crm && !CRM_METRICS.some((m) => m.key === crm)) return { ok: false, field: "metric_key", message: "Choose a CRM number." };
  return {
    ok: true,
    body: {
      statement,
      kind: d.kind,
      metric,
      direction: d.direction,
      magnitude: d.kind === "event" ? null : magnitude,
      unit: d.kind === "event" ? null : unit || null,
      baseline: d.kind === "event" ? null : baseline,
      check_date: d.check_date,
      source: d.source,
      metric_key: crm,
      category: d.category,
      confidence_pct: confidence,
      assumption: assumption || null,
      owner_user_id: UUID.test(d.owner_user_id) ? d.owner_user_id : null,
      team_id: UUID.test(d.team_id) ? d.team_id : null,
    },
  };
}

/** A notification made by the bets job: `decision-bet:{bet_id}:due:{date}` or `:proposed`. */
export function parseBetSource(value: unknown): { betId: string; stage: "due" | "proposed" } | null {
  if (typeof value !== "string") return null;
  const parts = value.split(":");
  if (parts[0] !== "decision-bet" || !UUID.test(parts[1] ?? "")) return null;
  if (parts[2] === "proposed") return { betId: parts[1].toLowerCase(), stage: "proposed" };
  if (parts[2] === "due") return { betId: parts[1].toLowerCase(), stage: "due" };
  return null;
}
