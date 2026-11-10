/**
 * The personal surfaces of ADR-0039: promises (B6 `commitments`), status requests (B7
 * `action_status_requests`) and topic watches (A6 `topic_watches`). Wire shapes, the limits the
 * API enforces, and pure helpers (grouping, the quick-pick status text, watch validation, the
 * "said 3 days ago" wording).
 *
 * HAND-WRITTEN TYPES, mirroring the ADR exactly, until the generated client is regenerated from
 * the new OpenAPI documents. The display joins (`meeting_title`, `action_content`, ...) are
 * optional: when the server leaves them out, `lib/api/commitments.ts` and
 * `lib/api/status-requests.ts` resolve them from reads the caller can already make.
 *
 * Pure (no imports), so it runs on the server, in the browser and under `node --test`.
 */

/* ---------------- limits (the API answers 422 past these) ---------------- */

export const PERSONAL_LIMITS = {
  commitmentContent: 500,
  statusText: 500,
  topic: 80,
  watches: 20,
} as const;

/* ---------------- B6: promises ---------------- */

export type CommitmentStatus = "open" | "done" | "dismissed";

/** A `commitments` row: something the caller said they would do in a meeting. Private to them. */
export interface Commitment {
  id: string;
  user_id: string;
  meeting_id: string;
  content: string;
  due_hint: string | null;
  status: CommitmentStatus;
  source_window_id?: string | null;
  created_at: string;
  updated_at: string;
  done_at: string | null;
  /** Optional display join; the UI resolves it when the server leaves it out. */
  meeting_title?: string | null;
}

/** A promise ready to render: the row plus its meeting's title, never null. */
export interface PromiseView extends Commitment {
  meetingTitle: string;
}

export interface PromiseGroup {
  meetingId: string;
  meetingTitle: string;
  /** When the newest promise in this meeting was said. */
  latestAt: string;
  items: PromiseView[];
}

/**
 * Open promises grouped by the meeting they were said in (the meeting with the newest promise
 * first, promises in the order they were said), and done ones newest first. Dismissed promises
 * are not shown anywhere.
 */
export function groupPromises(items: PromiseView[]): { open: PromiseGroup[]; done: PromiseView[] } {
  const byMeeting = new Map<string, PromiseGroup>();
  const done: PromiseView[] = [];
  for (const p of items) {
    if (p.status === "done") {
      done.push(p);
      continue;
    }
    if (p.status !== "open") continue;
    const g = byMeeting.get(p.meeting_id);
    if (g) {
      g.items.push(p);
      if (p.created_at > g.latestAt) g.latestAt = p.created_at;
    } else {
      byMeeting.set(p.meeting_id, {
        meetingId: p.meeting_id,
        meetingTitle: p.meetingTitle,
        latestAt: p.created_at,
        items: [p],
      });
    }
  }
  const open = Array.from(byMeeting.values());
  for (const g of open) g.items.sort((a, b) => cmp(a.created_at, b.created_at) || cmp(a.id, b.id));
  open.sort((a, b) => cmp(b.latestAt, a.latestAt) || cmp(a.meetingTitle, b.meetingTitle));
  done.sort((a, b) => cmp(b.done_at ?? b.updated_at, a.done_at ?? a.updated_at) || cmp(a.id, b.id));
  return { open, done };
}

/** Open promises newest first, for the dashboard card. */
export function newestOpen(items: PromiseView[], limit: number): PromiseView[] {
  return items
    .filter((p) => p.status === "open")
    .sort((a, b) => cmp(b.created_at, a.created_at) || cmp(a.id, b.id))
    .slice(0, limit);
}

/* ---------------- B7: status requests ---------------- */

export type StatusRequestState = "pending" | "answered" | "expired";

/** An `action_status_requests` row: "how is this going?" before the next meeting about it. */
export interface StatusRequest {
  id: string;
  action_id: string;
  user_id: string;
  /** The upcoming meeting the answer is carried into. */
  meeting_id: string;
  state: StatusRequestState;
  status_text: string | null;
  requested_at: string;
  answered_at: string | null;
  /** Optional display joins. */
  action_content?: string | null;
  meeting_title?: string | null;
  meeting_scheduled_start?: string | null;
}

export interface StatusRequestView extends StatusRequest {
  actionTitle: string;
  meetingTitle: string;
  meetingStart: string | null;
}

export type QuickPick = "on_track" | "blocked" | "done";

export const QUICK_PICKS: { key: QuickPick; label: string }[] = [
  { key: "on_track", label: "On track" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
];

const PICK_LABEL: Record<QuickPick, string> = { on_track: "On track", blocked: "Blocked", done: "Done" };

/**
 * The one line sent as `status_text`: the quick pick's label, then the note after a colon
 * ("Blocked: waiting on legal"). Either part may be missing; the result is trimmed, single-line,
 * and never longer than the API's 500 characters (the note is cut, never the pick). Empty when
 * there is nothing to send.
 */
export function composeStatusText(pick: QuickPick | null, note: string): string {
  const clean = note.replace(/\s+/g, " ").trim();
  const label = pick ? PICK_LABEL[pick] : "";
  if (!label) return clean.slice(0, PERSONAL_LIMITS.statusText).trim();
  if (!clean) return label;
  const prefix = `${label}: `;
  return (prefix + clean.slice(0, PERSONAL_LIMITS.statusText - prefix.length)).trim();
}

/** The inverse, for showing an answer: a leading quick-pick label becomes a chip. */
export function parseStatusText(text: string | null | undefined): { pick: QuickPick | null; note: string } {
  const t = (text ?? "").trim();
  for (const { key, label } of QUICK_PICKS) {
    if (t.toLowerCase() === label.toLowerCase()) return { pick: key, note: "" };
    const prefix = `${label.toLowerCase()}:`;
    if (t.toLowerCase().startsWith(prefix)) return { pick: key, note: t.slice(prefix.length).trim() };
  }
  return { pick: null, note: t };
}

/* ---------------- A6: topic watches ---------------- */

export interface TopicWatch {
  id: string;
  user_id?: string;
  topic: string;
  created_at: string;
}

export type TopicCheck = { ok: true; topic: string } | { ok: false; message: string };

/** Collapse inner whitespace and trim, as the server compares topics. */
export function normalizeTopic(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Mirrors the API's rules: 1 to 80 characters, unique per person ignoring case, at most 20. */
export function validateTopic(raw: string, existing: readonly string[]): TopicCheck {
  const topic = normalizeTopic(raw);
  if (!topic) return { ok: false, message: "Type a topic to watch." };
  if (topic.length > PERSONAL_LIMITS.topic) {
    return { ok: false, message: `Keep a topic under ${PERSONAL_LIMITS.topic} characters.` };
  }
  const lower = topic.toLowerCase();
  const dupe = existing.find((t) => normalizeTopic(t).toLowerCase() === lower);
  if (dupe) return { ok: false, message: `You already watch ${dupe}.` };
  if (existing.length >= PERSONAL_LIMITS.watches) {
    return { ok: false, message: `You can watch up to ${PERSONAL_LIMITS.watches} topics. Remove one first.` };
  }
  return { ok: true, topic };
}

/* ---------------- shared ---------------- */

/** Lists come back as `{items}`; a bare array is tolerated. Anything else is an empty list. */
export function itemsOf<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)) {
    return (body as { items: T[] }).items;
  }
  return [];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Dates read in UTC by default, as every server-rendered date in the app does, so the server and
 * the first client render agree. A client island may pass `"local"` after mount to show the
 * viewer's own clock (see `LocalWhen`).
 */
export type Zone = "utc" | "local";

function fields(d: Date, zone: Zone) {
  return zone === "local"
    ? { y: d.getFullYear(), m: d.getMonth(), day: d.getDate(), dow: d.getDay(), h: d.getHours(), min: d.getMinutes() }
    : { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

function dayIndex(d: Date, zone: Zone): number {
  const f = fields(d, zone);
  return Math.floor(Date.UTC(f.y, f.m, f.day) / 86_400_000);
}

/** "4 Nov", or "4 Nov 2025" outside the current year. Locale-free. */
export function shortDate(iso: string, now: Date, zone: Zone = "utc"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const f = fields(d, zone);
  const base = `${f.day} ${MONTHS[f.m]}`;
  return f.y === fields(now, zone).y ? base : `${base} ${f.y}`;
}

/** "today", "yesterday", "3 days ago", or "on 4 Nov" past a week. Empty for a bad date. */
export function relativeDay(iso: string, now: Date, zone: Zone = "utc"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = dayIndex(now, zone) - dayIndex(d, zone);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7) return `${diff} days ago`;
  return `on ${shortDate(iso, now, zone)}`;
}

/** An upcoming meeting's start: "today at 14:30", "tomorrow at 09:00", "Thu 12 Nov at 10:00". */
export function upcomingWhen(iso: string | null, now: Date, zone: Zone = "utc"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const f = fields(d, zone);
  const time = `${String(f.h).padStart(2, "0")}:${String(f.min).padStart(2, "0")}`;
  const diff = dayIndex(d, zone) - dayIndex(now, zone);
  if (diff === 0) return `today at ${time}`;
  if (diff === 1) return `tomorrow at ${time}`;
  return `${DAYS[f.dow]} ${shortDate(iso, now, zone)} at ${time}`;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
