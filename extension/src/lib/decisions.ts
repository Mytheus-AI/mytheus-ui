/**
 * "Decisions that follow you": the pure half of the writing check (no chrome.*, no DOM), so all of
 * it runs under `node --test`.
 *
 * - Settings and gating. Off by default. `allowedFor(settings, site)` is the single answer to
 *   "may this page be read at all"; the content script does nothing else until it says yes, and
 *   the background worker asks it again before anything leaves the browser.
 * - Text selection. Only the paragraph being written (at most `MAX_CHARS`), never the document.
 * - The checker. Debounced after typing stops, skips text it already checked, one request at a
 *   time (a newer text replaces a queued one, a stale answer is dropped), backs off on 429.
 * - The wire. The dashboard's `/api/capture/decisions/check` answer, mapped to what the margin
 *   note shows, and the note's copy.
 */

export type Site = "docs" | "gmail" | "jira";

export const SITES: readonly Site[] = ["docs", "gmail", "jira"];

export const SITE_LABELS: Record<Site, string> = {
  docs: "Google Docs",
  gmail: "Gmail",
  jira: "Jira",
};

export const SETTINGS_KEY = "decisionChecks";
export const DISMISSALS_KEY = "decisionDismissals";

export const MAX_CHARS = 1500;
export const MIN_CHARS = 40;
export const MIN_WORDS = 6;
export const DEBOUNCE_MS = 1500;
export const DEFAULT_RETRY_AFTER_S = 30;
export const MAX_DISMISSALS = 500;

// ------------------------------------------------------------------ settings

export interface DecisionCheckSettings {
  /** The master switch: "Check what I write against decisions". Off until the person turns it on. */
  enabled: boolean;
  sites: Record<Site, boolean>;
}

export const DEFAULT_SETTINGS: DecisionCheckSettings = {
  enabled: false,
  sites: { docs: true, gmail: true, jira: true },
};

/** Whatever is stored (possibly nothing, possibly garbage) as a full settings object. */
export function readSettings(raw: unknown): DecisionCheckSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS, sites: { ...DEFAULT_SETTINGS.sites } };
  const r = raw as { enabled?: unknown; sites?: unknown };
  const sites = { ...DEFAULT_SETTINGS.sites };
  if (r.sites && typeof r.sites === "object") {
    for (const site of SITES) {
      const v = (r.sites as Record<string, unknown>)[site];
      if (typeof v === "boolean") sites[site] = v;
    }
  }
  return { enabled: r.enabled === true, sites };
}

/** May Mytheus read what is typed on this site? Only when both switches say yes. */
export function allowedFor(settings: DecisionCheckSettings, site: Site | null): boolean {
  return site !== null && settings.enabled && settings.sites[site] === true;
}

/** Which of the three supported writing surfaces a URL is, or null. */
export function siteOf(url: string | null | undefined): Site | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.hostname === "docs.google.com" && u.pathname.startsWith("/document/")) return "docs";
  if (u.hostname === "mail.google.com") return "gmail";
  if (u.hostname.endsWith(".atlassian.net")) return "jira";
  return null;
}

/**
 * Where the text was written, for the decision owner (only sent when the person chooses Reopen
 * it). A Gmail draft has no address anyone else can open, so none is sent; Docs and Jira send
 * the page without its fragment.
 */
export function placeLink(site: Site, href: string): string | null {
  if (site === "gmail") return null;
  try {
    const u = new URL(href);
    u.hash = "";
    const out = u.toString();
    return out.length <= 2000 && u.protocol === "https:" ? out : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ text

export function normalize(text: string): string {
  return text.replace(/ /g, " ").replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
}

export function words(text: string): number {
  const t = normalize(text);
  return t ? t.split(" ").length : 0;
}

/** FNV-1a 32-bit, hex: enough to tell "same text as last time" without keeping the text. */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  const t = normalize(text).toLowerCase();
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Keep at most `max` characters, centred on `caret`, cut on word boundaries. */
export function clipAround(text: string, caret: number, max: number = MAX_CHARS): string {
  if (text.length <= max) return text;
  const at = Math.min(Math.max(caret, 0), text.length);
  let start = Math.max(0, Math.min(at - Math.floor(max * 0.7), text.length - max));
  let end = start + max;
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < at) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > at) end = space;
  }
  return text.slice(start, end).trim();
}

/**
 * The paragraph the caret is in, from plain text (a textarea, or a Docs typing buffer).
 * Paragraphs are separated by a blank line or a single newline; a paragraph that is still too
 * short to judge borrows the one before it, so a fresh sentence keeps its context.
 */
export function blockAround(text: string, caret: number, max: number = MAX_CHARS): string {
  const at = Math.min(Math.max(caret, 0), text.length);
  const lines = text.split("\n");
  let offset = 0;
  let index = lines.length - 1;
  for (let i = 0; i < lines.length; i++) {
    const end = offset + lines[i].length;
    if (at <= end) {
      index = i;
      break;
    }
    offset = end + 1;
  }
  return paragraphAround(lines, index, max);
}

/**
 * The run of non-empty lines around `index` (Gmail and Jira editors are one element per line):
 * up to the nearest empty line on each side, plus the previous run when this one is short.
 */
export function paragraphAround(lines: readonly string[], index: number, max: number = MAX_CHARS): string {
  if (lines.length === 0) return "";
  let i = Math.min(Math.max(index, 0), lines.length - 1);
  // The caret on an empty line: the paragraph just written above it.
  while (i > 0 && !normalize(lines[i])) i--;
  let start = i;
  while (start > 0 && normalize(lines[start - 1])) start--;
  let end = i;
  while (end < lines.length - 1 && normalize(lines[end + 1])) end++;
  let block = lines.slice(start, end + 1).map(normalize).join(" ");
  if (words(block) < MIN_WORDS && start > 0) {
    let p = start - 1;
    while (p > 0 && !normalize(lines[p])) p--;
    let ps = p;
    while (ps > 0 && normalize(lines[ps - 1])) ps--;
    const previous = lines.slice(ps, p + 1).map(normalize).join(" ");
    if (previous) block = `${previous} ${block}`;
  }
  return clipAround(normalize(block), block.length, max);
}

/** Text of Google Docs' annotated canvas (one `aria-label` per rendered line, in order). */
export function docsTextFromLabels(labels: readonly (string | null | undefined)[]): string {
  return labels
    .map((l) => (l ?? "").replace(/​/g, ""))
    .filter((l) => l.trim().length > 0)
    .join("\n");
}

/** One keystroke applied to the Docs typing buffer (canvas Docs exposes no text otherwise). */
export function applyKey(buffer: string, key: string, limit = 4000): string {
  let next = buffer;
  if (key === "Backspace") next = buffer.slice(0, -1);
  else if (key === "Enter") next = `${buffer}\n`;
  else if (key.length === 1) next = buffer + key;
  else return buffer; // arrows, modifiers, function keys: the caret moved, the text did not
  return next.length > limit ? next.slice(next.length - limit) : next;
}

/** Ready to check: long enough to judge. */
export function checkable(text: string): boolean {
  const t = normalize(text);
  return t.length >= MIN_CHARS && words(t) >= MIN_WORDS;
}

// ------------------------------------------------------------------ the wire

export interface ConflictWire {
  decision_id: string;
  decision_content: string;
  meeting_id: string | null;
  meeting_title: string | null;
  decided_at: string | null;
  owner: { id: string; name: string } | null;
  quote: string;
  relation: "contradicts" | "reopens";
  confidence: number;
  why: string;
  link: string;
  challenge_id: string | null;
  reopen_request_id: string | null;
}

export interface CheckResultWire {
  status: "ok" | "skipped" | "degraded";
  reason: string | null;
  checked_at?: string;
  conflicts: ConflictWire[];
}

export interface Conflict {
  decisionId: string;
  decision: string;
  meetingTitle: string | null;
  decidedAt: string | null;
  owner: string | null;
  quote: string;
  relation: "contradicts" | "reopens";
  confidence: number;
  why: string;
  /** App path of the decision page ("/meetings/{m}/decisions/{d}"). */
  path: string;
  reopenRequested: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** The check answer as notes, best first; anything malformed is dropped rather than shown. */
export function toConflicts(raw: unknown): Conflict[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { conflicts?: unknown }).conflicts;
  if (!Array.isArray(list)) return [];
  const out: Conflict[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const id = str(c.decision_id);
    const decision = str(c.decision_content);
    if (!UUID.test(id) || !decision) continue;
    const link = str(c.link);
    const meetingId = str(c.meeting_id);
    const path = link.startsWith("/") && !link.startsWith("//")
      ? link
      : UUID.test(meetingId)
        ? `/meetings/${meetingId}/decisions/${id}`
        : "/decisions";
    const owner = c.owner && typeof c.owner === "object" ? str((c.owner as Record<string, unknown>).name) : "";
    const confidence = typeof c.confidence === "number" && Number.isFinite(c.confidence) ? c.confidence : 0;
    out.push({
      decisionId: id.toLowerCase(),
      decision,
      meetingTitle: str(c.meeting_title) || null,
      decidedAt: /^\d{4}-\d{2}-\d{2}/.test(str(c.decided_at)) ? str(c.decided_at).slice(0, 10) : null,
      owner: owner || null,
      quote: str(c.quote),
      relation: c.relation === "reopens" ? "reopens" : "contradicts",
      confidence,
      why: str(c.why),
      path,
      reopenRequested: UUID.test(str(c.reopen_request_id)),
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "3 Oct", with the year only when it is not this year. */
export function shortDate(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12) return null;
  const base = `${day} ${MONTHS[month - 1]}`;
  return year === now.getUTCFullYear() ? base : `${base} ${year}`;
}

/** The note's headline: "This was decided otherwise on 3 Oct (Pricing review)." */
export function headline(c: Conflict, now: Date = new Date()): string {
  const when = shortDate(c.decidedAt, now);
  const where = c.meetingTitle ? ` (${c.meetingTitle})` : "";
  const verb = c.relation === "reopens" ? "This was already decided" : "This was decided otherwise";
  return when ? `${verb} on ${when}${where}.` : `${verb} in an earlier meeting${where}.`;
}

/** The collapsed pill's few words. */
export function pillText(c: Conflict, count: number, now: Date = new Date()): string {
  const when = shortDate(c.decidedAt, now);
  const base = c.relation === "reopens" ? "Already decided" : "Decided otherwise";
  const more = count > 1 ? ` · ${count} decisions` : "";
  return `${when ? `${base} on ${when}` : base}${more}`;
}

// ------------------------------------------------------------------ dismissals (local memory)

/** The same key the server uses in spirit: one decision, one sentence (normalised). */
export function dismissalKey(decisionId: string, quote: string): string {
  return `${decisionId.toLowerCase()}:${textHash(quote)}`;
}

export function withoutDismissed(conflicts: readonly Conflict[], dismissed: readonly string[]): Conflict[] {
  if (!dismissed.length) return [...conflicts];
  const set = new Set(dismissed);
  return conflicts.filter((c) => !set.has(dismissalKey(c.decisionId, c.quote)));
}

export function remember(dismissed: readonly string[], key: string, max = MAX_DISMISSALS): string[] {
  const next = [...dismissed.filter((k) => k !== key), key];
  return next.length > max ? next.slice(next.length - max) : next;
}

// ------------------------------------------------------------------ the checker

export type CheckOutcome =
  | { kind: "result"; result: CheckResultWire }
  | { kind: "rate-limited"; retryAfterS: number }
  | { kind: "needs-link" }
  | { kind: "not-available"; message: string }
  | { kind: "failed"; message: string };

export interface CheckerDeps {
  /** Asked before every send: the switches may have been turned off since typing started. */
  isEnabled: () => boolean;
  send: (text: string) => Promise<CheckOutcome>;
  onOutcome: (outcome: CheckOutcome | { kind: "clear" }, text: string) => void;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  debounceMs?: number;
}

/**
 * Debounce, skip, one-at-a-time, back off. `update(text)` is called on every edit; nothing is
 * sent until `debounceMs` passes with no further edit, the text is long enough, it differs from
 * what was last checked, and the switches are still on.
 */
export class DecisionChecker {
  private readonly deps: Required<Omit<CheckerDeps, "isEnabled" | "send" | "onOutcome">> &
    Pick<CheckerDeps, "isEnabled" | "send" | "onOutcome">;
  private timer: unknown = null;
  private latest = "";
  private lastSentHash: string | null = null;
  private inFlight = false;
  private queued = false;
  private generation = 0;
  private backoffUntil = 0;
  sends = 0;

  constructor(deps: CheckerDeps) {
    this.deps = {
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      debounceMs: DEBOUNCE_MS,
      ...deps,
    };
  }

  update(text: string): void {
    this.latest = text;
    this.schedule(this.deps.debounceMs);
  }

  /** Forget everything (the switches went off, the editor went away). */
  reset(): void {
    if (this.timer !== null) this.deps.clearTimer(this.timer);
    this.timer = null;
    this.latest = "";
    this.lastSentHash = null;
    this.queued = false;
    this.generation += 1; // an answer still on its way is dropped
  }

  /** Check the same text again on the next edit (after a dismissal, say). */
  forgetLast(): void {
    this.lastSentHash = null;
  }

  private schedule(ms: number): void {
    if (this.timer !== null) this.deps.clearTimer(this.timer);
    this.timer = this.deps.setTimer(() => {
      this.timer = null;
      void this.fire();
    }, Math.max(0, ms));
  }

  private async fire(): Promise<void> {
    if (!this.deps.isEnabled()) return;
    const text = normalize(this.latest);
    if (!checkable(text)) {
      this.lastSentHash = null;
      this.deps.onOutcome({ kind: "clear" }, text);
      return;
    }
    const hash = textHash(text);
    if (hash === this.lastSentHash) return;
    const wait = this.backoffUntil - this.deps.now();
    if (wait > 0) {
      this.schedule(wait);
      return;
    }
    if (this.inFlight) {
      this.queued = true;
      return;
    }
    this.inFlight = true;
    this.lastSentHash = hash;
    const generation = ++this.generation;
    this.sends += 1;
    let outcome: CheckOutcome;
    try {
      outcome = await this.deps.send(text);
    } catch {
      outcome = { kind: "failed", message: "Mytheus could not be reached." };
    }
    this.inFlight = false;
    if (outcome.kind === "rate-limited") {
      this.backoffUntil = this.deps.now() + Math.max(1, outcome.retryAfterS) * 1000;
      this.lastSentHash = null; // try this text again once allowed
    } else if (outcome.kind === "failed") {
      this.lastSentHash = null;
    }
    const stale = generation !== this.generation || normalize(this.latest) !== text;
    if (!stale || outcome.kind === "needs-link") this.deps.onOutcome(outcome, text);
    if (this.queued || stale) {
      this.queued = false;
      if (outcome.kind !== "needs-link") this.schedule(0);
    }
  }
}

// ------------------------------------------------------------------ messages

/** Content script -> background worker. */
export type DecisionMessage =
  | { type: "decisions-check"; text: string; site: Site; placeLabel: string }
  | { type: "decisions-dismiss"; decisionId: string; quote: string }
  | { type: "decisions-reopen"; decisionId: string; quote: string; site: Site; placeLabel: string; link: string | null }
  | { type: "decisions-open"; path: string }
  | { type: "decisions-connect" };

export function isDecisionMessage(value: unknown): value is DecisionMessage {
  if (!value || typeof value !== "object") return false;
  const t = (value as { type?: unknown }).type;
  return typeof t === "string" && t.startsWith("decisions-");
}
