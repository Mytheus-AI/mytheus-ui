/**
 * "Decisions that know why" (a4 contract, section 3), as pure helpers: the wire normalizer, the
 * request table, the words every row uses, and the checks on the owner's edits. Tested under
 * `node --test` (tests/decision-why.test.ts) and shared by the server reads, the server actions and
 * the decision page's "Why we decided" section.
 */

import type {
  Assumption,
  AssumptionCreate,
  AssumptionKind,
  AssumptionPatch,
  Comparator,
  DecisionWhy,
  Evidence,
  EvidenceSource,
  EvidenceStatus,
  Person,
  SlotProposal,
  SourceState,
  Watch,
} from "./api/why-blast-types";

/* ---------------- tiny readers (the wire is checked once, here) ---------------- */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
export const str = (v: unknown): string => (typeof v === "string" ? v : "");
export const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const oneOf = <T extends string>(v: unknown, all: readonly T[], fallback: T): T => (all.includes(v as T) ? (v as T) : fallback);

export function person(v: unknown): Person | null {
  const o = obj(v);
  if (!o || typeof o.user_id !== "string") return null;
  return { user_id: o.user_id, name: str(o.name).trim() || "Someone" };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/* ---------------- normalizers ---------------- */

const KINDS: readonly AssumptionKind[] = ["price", "date", "metric", "dependency", "person", "other"];
const COMPARATORS: readonly Comparator[] = ["lt", "lte", "gt", "gte", "eq"];
const SOURCES: readonly EvidenceSource[] = ["meeting", "decision", "jira", "linear", "hubspot"];
const EVIDENCE_STATUSES: readonly EvidenceStatus[] = ["open", "reconfirmed", "reopened", "revisit_booked"];
const SOURCE_STATES: readonly SourceState[] = ["connected", "not_connected", "unknown"];

export function normalizeWatch(v: unknown): Watch {
  const o = obj(v) ?? {};
  const comparator = COMPARATORS.includes(o.comparator as Comparator) ? (o.comparator as Comparator) : null;
  return {
    date: strOrNull(o.date),
    value: numOrNull(o.value),
    comparator,
    unit: strOrNull(o.unit),
    jira_key: strOrNull(o.jira_key),
    deal_id: strOrNull(o.deal_id),
  };
}

export function normalizeEvidence(v: unknown): Evidence | null {
  const o = obj(v);
  if (!o || typeof o.id !== "string") return null;
  const redacted = o.redacted === true;
  const m = obj(o.source_meeting);
  return {
    id: o.id,
    source: oneOf(o.source, SOURCES, "meeting"),
    // A redacted quote is never shown, even if a server sent one by mistake.
    quote: redacted ? null : strOrNull(o.quote),
    redacted,
    speaker: redacted ? null : person(o.speaker),
    source_meeting: m && typeof m.id === "string" ? { id: m.id, title: redacted ? null : strOrNull(m.title), date: str(m.date) } : null,
    source_decision_id: strOrNull(o.source_decision_id),
    source_ref: strOrNull(o.source_ref),
    source_url: strOrNull(o.source_url),
    rationale: str(o.rationale).trim(),
    confidence: numOrNull(o.confidence) ?? 0,
    status: oneOf(o.status, EVIDENCE_STATUSES, "open"),
    created_at: str(o.created_at),
    resolved_at: strOrNull(o.resolved_at),
    resolved_by: person(o.resolved_by),
    resolution_note: strOrNull(o.resolution_note),
    revisit_meeting_id: strOrNull(o.revisit_meeting_id),
  };
}

export function normalizeAssumption(v: unknown): Assumption | null {
  const o = obj(v);
  if (!o || typeof o.id !== "string" || !str(o.statement).trim()) return null;
  const openBreak = normalizeEvidence(o.open_break);
  return {
    id: o.id,
    decision_id: str(o.decision_id),
    kind: oneOf(o.kind, KINDS, "other"),
    statement: str(o.statement).trim(),
    quote: strOrNull(o.quote),
    stated_by: person(o.stated_by),
    source: o.source === "owner" ? "owner" : "agent",
    status: o.status === "broken" && openBreak ? "broken" : "watching",
    watch: normalizeWatch(o.watch),
    reconfirmed_at: strOrNull(o.reconfirmed_at),
    reconfirm_note: strOrNull(o.reconfirm_note),
    last_checked_at: strOrNull(o.last_checked_at),
    created_at: str(o.created_at),
    open_break: o.status === "broken" ? openBreak : null,
    history: Array.isArray(o.history) ? o.history.map(normalizeEvidence).filter((e): e is Evidence => e !== null) : [],
  };
}

export function normalizeWhy(v: unknown): DecisionWhy | null {
  const o = obj(v);
  if (!o || typeof o.decision_id !== "string") return null;
  const s = obj(o.sources) ?? {};
  const r = obj(o.reopened);
  return {
    decision_id: o.decision_id,
    meeting_id: str(o.meeting_id),
    content: str(o.content),
    owner: person(o.owner),
    can_edit: o.can_edit === true,
    state: o.state === "pending" ? "pending" : "ready",
    reopened: r ? { at: str(r.at), by: person(r.by), note: strOrNull(r.note) } : null,
    assumptions: Array.isArray(o.assumptions)
      ? o.assumptions.map(normalizeAssumption).filter((a): a is Assumption => a !== null)
      : [],
    sources: {
      transcripts: "connected",
      jira: oneOf(s.jira, SOURCE_STATES, "unknown"),
      linear: oneOf(s.linear, SOURCE_STATES, "not_connected"),
      hubspot: oneOf(s.hubspot, SOURCE_STATES, "unknown"),
      checked_at: strOrNull(s.checked_at),
    },
  };
}

export function normalizeSlot(v: unknown): SlotProposal | null {
  const o = obj(v);
  if (!o || !str(o.start) || !str(o.end)) return null;
  return {
    start: str(o.start),
    end: str(o.end),
    title: str(o.title).trim() || "Revisit",
    people: Array.isArray(o.people) ? o.people.map(person).filter((p): p is Person => p !== null) : [],
  };
}

/* ---------------- requests (paths and bodies, so the server module stays a thin wrapper) ---------------- */

const seg = (id: string) => encodeURIComponent(id);

export type Req = { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; body?: unknown };

export const whyRoutes = {
  why: (decisionId: string): Req => ({ method: "GET", path: `/api/v1/decisions/${seg(decisionId)}/why` }),
  add: (decisionId: string, body: AssumptionCreate): Req => ({ method: "POST", path: `/api/v1/decisions/${seg(decisionId)}/assumptions`, body }),
  edit: (id: string, body: AssumptionPatch): Req => ({ method: "PATCH", path: `/api/v1/assumptions/${seg(id)}`, body }),
  remove: (id: string): Req => ({ method: "DELETE", path: `/api/v1/assumptions/${seg(id)}` }),
  reconfirm: (id: string, note: string): Req => ({ method: "POST", path: `/api/v1/assumptions/${seg(id)}/reconfirm`, body: { note } }),
  reopen: (id: string, note: string | null): Req => ({
    method: "POST",
    path: `/api/v1/assumptions/${seg(id)}/reopen-decision`,
    body: note ? { note } : {},
  }),
  revisitSlot: (id: string): Req => ({ method: "GET", path: `/api/v1/assumptions/${seg(id)}/revisit-slot` }),
  bookRevisit: (id: string, start: string | null): Req => ({
    method: "POST",
    path: `/api/v1/assumptions/${seg(id)}/book-revisit`,
    body: start ? { start } : {},
  }),
};

/* ---------------- words ---------------- */

export const KIND_LABEL: Record<AssumptionKind, string> = {
  price: "Price",
  date: "Date",
  metric: "Metric",
  dependency: "Dependency",
  person: "Person",
  other: "Other",
};

/** The quieter line under each kind in the owner's Kind dropdown. */
export const KIND_HELP: Record<AssumptionKind, string> = {
  price: "A cost, a quote or a budget figure",
  date: "Something has to happen by a date",
  metric: "A number that has to stay where it is",
  dependency: "Another team, ticket or vendor delivers",
  person: "Someone stays available or in role",
  other: "Anything else the decision rests on",
};

export const COMPARATOR_LABEL: Record<Comparator, string> = {
  lt: "Below",
  lte: "At most",
  gt: "Above",
  gte: "At least",
  eq: "Exactly",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mar 31, 2027" from a date or a timestamp, read in UTC (dates on the wire are calendar days). */
export function dayLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatValue(value: number, unit: string | null): string {
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  if (!unit) return n;
  if (unit === "USD") return `$${n}`;
  if (unit === "%" || unit.toLowerCase() === "percent") return `${n}%`;
  return `${n} ${unit}`;
}

export type WatchPart = { kind: "date" | "value" | "jira" | "deal"; text: string };

/** What an assumption is watched against, one short phrase each. */
export function watchParts(w: Watch): WatchPart[] {
  const parts: WatchPart[] = [];
  if (w.date) parts.push({ kind: "date", text: `By ${dayLabel(w.date)}` });
  if (w.value !== null) {
    const cmp = w.comparator ? `${COMPARATOR_LABEL[w.comparator]} ` : "";
    parts.push({ kind: "value", text: `${cmp}${formatValue(w.value, w.unit)}` });
  }
  if (w.jira_key) parts.push({ kind: "jira", text: `Jira ${w.jira_key}` });
  if (w.deal_id) parts.push({ kind: "deal", text: `HubSpot deal ${w.deal_id}` });
  return parts;
}

export type WatchState = { label: string; tone: "medium" | "ok" | "neutral" };

/** The row's state chip: broken needs the owner's attention (amber, frozen language). */
export function watchState(a: Assumption): WatchState {
  if (a.status === "broken") return { label: "No longer true", tone: "medium" };
  if (a.reconfirmed_at) return { label: `Re-confirmed ${dayLabel(a.reconfirmed_at)}`, tone: "ok" };
  return { label: "Watching", tone: "neutral" };
}

/** Broken first (they need the owner), then in the order they were recorded. */
export function orderAssumptions(list: Assumption[]): Assumption[] {
  return [...list].sort((a, b) => {
    const ab = a.status === "broken" ? 0 : 1;
    const bb = b.status === "broken" ? 0 : 1;
    if (ab !== bb) return ab - bb;
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });
}

/* The topic word for the hero title: "A reason for your vendor decision is no longer true". A
   short list of the subjects decisions are usually about; the first one the decision names wins.
   With none, a short decision is quoted whole, and a long one leaves the title without a subject
   (the decision itself is shown right under it). */
const TOPICS = [
  "vendor",
  "pricing",
  "price",
  "launch",
  "release",
  "beta",
  "budget",
  "hiring",
  "hire",
  "roadmap",
  "migration",
  "contract",
  "partner",
  "partnership",
  "discount",
  "deadline",
  "renewal",
  "rollout",
  "plan",
  "hosting",
  "security",
  "staffing",
  "headcount",
  "integration",
  "supplier",
  "office",
  "campaign",
  "scope",
  "timeline",
];

export function decisionSubject(content: string): string | null {
  const words: string[] = content.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const topic of TOPICS) if (words.includes(topic)) return topic;
  const clean = content.trim().replace(/[.!]+$/, "");
  if (clean && clean.split(/\s+/).length <= 4 && clean.length <= 32) return `“${clean}”`;
  return null;
}

export function brokenTitle(content: string): string {
  const subject = decisionSubject(content);
  return subject ? `A reason for your ${subject} decision is no longer true` : "A reason for your decision is no longer true";
}

/** Where the new evidence came from, in words. A redacted one never names the meeting. */
export function evidenceSource(e: Evidence): { text: string; href: string | null; external: boolean } {
  if (e.redacted) return { text: "Said in a meeting you were not in", href: null, external: false };
  const when = e.source_meeting?.date ? dayLabel(e.source_meeting.date) : "";
  const meetingName = e.source_meeting?.title ?? "a meeting";
  switch (e.source) {
    case "meeting":
      return {
        text: when ? `Said in ${meetingName}, ${when}` : `Said in ${meetingName}`,
        href: e.source_meeting ? `/meetings/${e.source_meeting.id}` : null,
        external: false,
      };
    case "decision":
      return {
        text: when ? `A decision in ${meetingName}, ${when}` : `A decision in ${meetingName}`,
        href: e.source_meeting && e.source_decision_id ? `/meetings/${e.source_meeting.id}/decisions/${e.source_decision_id}` : null,
        external: false,
      };
    case "jira":
      return { text: e.source_ref ? `Jira ${e.source_ref}` : "Jira", href: e.source_url, external: Boolean(e.source_url) };
    case "linear":
      return { text: e.source_ref ? `Linear ${e.source_ref}` : "Linear", href: e.source_url, external: Boolean(e.source_url) };
    case "hubspot":
      return { text: e.source_ref ? `HubSpot, ${e.source_ref}` : "HubSpot", href: e.source_url, external: Boolean(e.source_url) };
  }
}

/** How a resolved break was settled, for the small history under a row. */
export function resolutionLine(e: Evidence): string {
  const who = e.resolved_by?.name ?? "The owner";
  const when = e.resolved_at ? ` on ${dayLabel(e.resolved_at)}` : "";
  switch (e.status) {
    case "reconfirmed":
      return `${who} re-confirmed it${when}${e.resolution_note ? `: “${e.resolution_note}”` : "."}`;
    case "reopened":
      return `${who} reopened the decision${when}.`;
    case "revisit_booked":
      return `${who} booked a revisit${when}.`;
    default:
      return "Still open.";
  }
}

export type SourceLine = { label: string; state: SourceState | "watched" };

/** The honest line under the section: what the agent can watch, and what it cannot yet. */
export function sourcesLine(s: DecisionWhy["sources"]): SourceLine[] {
  const one = (name: string, st: SourceState): SourceLine => ({
    label: st === "connected" ? `${name} connected` : st === "not_connected" ? `${name} not connected` : `${name} not checked yet`,
    state: st,
  });
  return [{ label: "Transcripts watched", state: "watched" }, one("Jira", s.jira), one("Linear", s.linear), one("HubSpot", s.hubspot)];
}

/* ---------------- the owner's edits ---------------- */

export const LIMITS = { statement: 300, quote: 600, note: 500, unit: 12, perDecision: 12 } as const;

export type AssumptionDraft = {
  kind: AssumptionKind;
  statement: string;
  quote: string;
  statedBy: string | null;
  date: string;
  comparator: Comparator | "";
  value: string;
  unit: string;
  jiraKey: string;
  dealId: string;
};

export const EMPTY_DRAFT: AssumptionDraft = {
  kind: "other",
  statement: "",
  quote: "",
  statedBy: null,
  date: "",
  comparator: "",
  value: "",
  unit: "",
  jiraKey: "",
  dealId: "",
};

export function draftOf(a: Assumption): AssumptionDraft {
  return {
    kind: a.kind,
    statement: a.statement,
    quote: a.quote ?? "",
    statedBy: a.stated_by?.user_id ?? null,
    date: a.watch.date ?? "",
    comparator: a.watch.comparator ?? "",
    value: a.watch.value === null ? "" : String(a.watch.value),
    unit: a.watch.unit ?? "",
    jiraKey: a.watch.jira_key ?? "",
    dealId: a.watch.deal_id ?? "",
  };
}

export type DraftField = "statement" | "quote" | "date" | "value" | "unit" | "jiraKey" | "dealId";
export type DraftCheck =
  | { ok: true; body: AssumptionCreate & { quote: string | null; stated_by_user_id: string | null; watch: Watch } }
  | { ok: false; field: DraftField; message: string };

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Check a draft and build the body. The same body serves create and edit (PATCH takes any of
 *  the fields; sending all of them makes an edit say exactly what the row now is). */
export function checkDraft(d: AssumptionDraft): DraftCheck {
  const statement = squash(d.statement);
  if (!statement) return { ok: false, field: "statement", message: "Say what has to stay true." };
  if (statement.length > LIMITS.statement) return { ok: false, field: "statement", message: `Keep it to ${LIMITS.statement} characters.` };
  const quote = d.quote.trim();
  if (quote.length > LIMITS.quote) return { ok: false, field: "quote", message: `Keep the quote to ${LIMITS.quote} characters.` };
  const date = d.date.trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, field: "date", message: "Pick a date, or leave it empty." };
  const rawValue = d.value.trim().replace(/,/g, "");
  let value: number | null = null;
  if (rawValue) {
    value = Number(rawValue);
    if (!Number.isFinite(value)) return { ok: false, field: "value", message: "Use a number, such as 40000." };
  }
  const unit = d.unit.trim();
  if (unit.length > LIMITS.unit) return { ok: false, field: "unit", message: `Keep the unit to ${LIMITS.unit} characters.` };
  if (unit && value === null) return { ok: false, field: "value", message: "Add the number the unit belongs to." };
  const jira = d.jiraKey.trim().toUpperCase();
  if (jira && !/^[A-Z][A-Z0-9_]{0,15}-\d{1,7}$/.test(jira)) return { ok: false, field: "jiraKey", message: "Use a Jira key such as SSO-142." };
  const deal = d.dealId.trim();
  if (deal && !/^\d{1,30}$/.test(deal)) return { ok: false, field: "dealId", message: "A HubSpot deal id is a number, such as 9021345." };
  return {
    ok: true,
    body: {
      kind: d.kind,
      statement,
      quote: quote || null,
      stated_by_user_id: d.statedBy,
      watch: {
        date: date || null,
        value,
        comparator: value === null ? null : d.comparator || "eq",
        unit: unit || null,
        jira_key: jira || null,
        deal_id: deal || null,
      },
    },
  };
}

export type NoteCheck = { ok: true; note: string } | { ok: false; message: string };

/** Re-confirming needs a short note: why the decision still stands. */
export function checkNote(note: string): NoteCheck {
  const n = squash(note);
  if (!n) return { ok: false, message: "Add a short note: why does the decision still stand?" };
  if (n.length > LIMITS.note) return { ok: false, message: `Keep the note to ${LIMITS.note} characters.` };
  return { ok: true, note: n };
}

/** Read `?assumption=` from the notification's link: a uuid, lowercased, or null. */
export function focusIdOf(value: string | null | undefined): string | null {
  return isUuid(value) ? value.toLowerCase() : null;
}

/** How long the page keeps asking while the agent reads the decision. */
export const WHY_POLL = { everyMs: 5000, forMs: 60_000 } as const;
