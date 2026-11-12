/**
 * "In every meeting at once" (Beyond the meeting, Layer 3), as pure helpers: the week's
 * grouping and its one-line summary, the words for a choice, a held reason and an answer, which
 * saved lines to put forward for an interruption, focus-block checks, the evening digest's links,
 * and the toast de-duplication. Pure, so it is tested under `node --test` and shared by the
 * server pages, the client islands and the room.
 */

import type {
  AttendanceChoice,
  ChoiceSource,
  DigestSegment,
  FocusBlock,
  Interruption,
  StandingPosition,
  WeekMeeting,
  WeekSummary,
} from "./api/listening-types";

export const CHOICES: AttendanceChoice[] = ["attend", "agent_listens", "skip"];

export const CHOICE_LABEL: Record<AttendanceChoice, string> = {
  attend: "Attend",
  agent_listens: "Myte listens",
  skip: "Skip",
};

/** What each choice does, in one plain sentence. */
export const CHOICE_HELP: Record<AttendanceChoice, string> = {
  attend: "You go yourself.",
  agent_listens: "Your Myte listens for you and pulls you in only when something needs you.",
  skip: "Nobody listens for you. The shared minutes are on the meeting page after.",
};

export function sourceLabel(source: ChoiceSource): string | null {
  return source === "rule" ? "by rule" : source === "manual" ? "you chose" : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

export function isDay(v: unknown): v is string {
  return typeof v === "string" && DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

/* ---------------- the week ---------------- */

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "19 hours", "1 hour", "45 minutes", "2.5 hours". */
export function savedLabel(minutes: number): string {
  if (minutes <= 0) return "no time";
  if (minutes < 60) return plural(Math.round(minutes), "minute");
  const hours = Math.round((minutes / 60) * 2) / 2;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ${hours === 1 ? "hour" : "hours"}`;
}

/** "This week: attend 12, your Myte listens to 28, saved 19 hours". */
export function summaryLine(s: WeekSummary, scope = "This week"): string {
  if (s.invited === 0) return `${scope}: no meetings you are invited to.`;
  const parts = [`attend ${s.attend}`, `your Myte listens to ${s.agent_listens}`];
  if (s.skip) parts.push(`skip ${s.skip}`);
  return `${scope}: ${parts.join(", ")}, saved ${savedLabel(s.minutes_saved)}`;
}

/** Recount a week after a local change, so the headline follows an optimistic choice at once. */
export function summarize(meetings: readonly Pick<WeekMeeting, "choice" | "duration_minutes">[]): WeekSummary {
  const s: WeekSummary = { invited: meetings.length, attend: 0, agent_listens: 0, skip: 0, minutes_saved: 0, hours_saved: 0 };
  for (const m of meetings) {
    s[m.choice] += 1;
    if (m.choice !== "attend") s.minutes_saved += m.duration_minutes;
  }
  s.hours_saved = Math.round((s.minutes_saved / 60) * 10) / 10;
  return s;
}

export type WeekDay = { date: string; label: string; short: string; today: boolean; meetings: WeekMeeting[] };

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The local calendar date (YYYY-MM-DD) of an instant in a zone. */
export function localDate(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Seven days from `weekStart` (a Monday), each with its meetings in start order. */
export function groupWeek(meetings: readonly WeekMeeting[], weekStart: string, timeZone: string, today: string): WeekDay[] {
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const d = new Date(`${date}T00:00:00Z`);
    return {
      date,
      label: `${WEEKDAYS[i]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
      short: WEEKDAYS[i].slice(0, 3),
      today: date === today,
      meetings: [],
    };
  });
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const m of [...meetings].sort((a, b) => Date.parse(a.scheduled_start) - Date.parse(b.scheduled_start))) {
    byDate.get(localDate(m.scheduled_start, timeZone))?.meetings.push(m);
  }
  return days;
}

/** "11 Nov to 17 Nov 2026". */
export function weekLabel(weekStart: string, weekEnd: string): string {
  const a = new Date(`${weekStart}T00:00:00Z`);
  const b = new Date(`${weekEnd}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  return `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} to ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

/** Applies one meeting's new choice to the week, optimistically. */
export function withChoice(
  meetings: readonly WeekMeeting[],
  meetingId: string,
  choice: AttendanceChoice,
  source: ChoiceSource = "manual",
): WeekMeeting[] {
  return meetings.map((m) => (m.meeting_id === meetingId ? { ...m, choice, source, rule_id: source === "rule" ? m.rule_id : null } : m));
}

/* ---------------- interruptions ---------------- */

const HELD: Record<string, string> = {
  disabled: "Interruptions are off",
  quiet_hours: "During your quiet hours",
  focus_block: "During a focus block",
  throttled: "You had enough interruptions for now",
};

export function heldReasonText(reason: string | null | undefined): string {
  return (reason && HELD[reason]) || "Held for later";
}

const RESPONSE: Record<string, string> = {
  joined: "You joined",
  view_sent: "You sent your view",
  holding_line: "Your Myte held the line",
  dismissed: "You let it go",
};

export function responseText(response: string | null | undefined): string | null {
  return response ? RESPONSE[response] ?? null : null;
}

export const REASON_LABEL: Record<Interruption["reason"], string> = {
  decision: "A decision that touches you",
  question: "A question for you",
  promise: "A promise on your behalf",
};

/** The interruption's source event id (`interrupt:{id}`), or null. */
export function interruptionIdOf(sourceEventId: string | null | undefined): string | null {
  if (!sourceEventId) return null;
  const [kind, id, ...rest] = sourceEventId.trim().split(":");
  return kind === "interrupt" && rest.length === 0 && isUuid(id) ? id.toLowerCase() : null;
}

/** The evening digest's source event id (`evening-digest:{id}`), or null. */
export function eveningDigestIdOf(sourceEventId: string | null | undefined): string | null {
  if (!sourceEventId) return null;
  const [kind, id, ...rest] = sourceEventId.trim().split(":");
  return kind === "evening-digest" && rest.length === 0 && isUuid(id) ? id.toLowerCase() : null;
}

/**
 * Remembers which interruptions were already shown, so a reconnect, a second tab's replay or a
 * duplicate delivery never shows the same toast twice. Bounded: the oldest ids drop off.
 */
export class SeenIds {
  private readonly order: string[] = [];
  private readonly set = new Set<string>();
  private readonly cap: number;
  constructor(cap = 200) {
    this.cap = cap;
  }

  /** True the first time an id is offered, false after. */
  first(id: string): boolean {
    if (!id || this.set.has(id)) return false;
    this.set.add(id);
    this.order.push(id);
    while (this.order.length > this.cap) this.set.delete(this.order.shift() as string);
    return true;
  }
}

/** Accepts an "agent-interrupt" socket payload only when it has what the toast needs. */
export function parseInterruption(raw: unknown): Interruption | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<Interruption>;
  if (!isUuid(p.id) || !isUuid(p.meeting_id) || typeof p.title !== "string" || !p.title.trim()) return null;
  if (p.reason !== "decision" && p.reason !== "question" && p.reason !== "promise") return null;
  return {
    ...(p as Interruption),
    join_url: safePath(p.join_url) ?? `/meetings/${p.meeting_id}/room`,
    moment_url: safePath(p.moment_url),
  };
}

/* ---------------- holding the line ---------------- */

export const MAX_HOLD = 5;
export const MAX_VIEW = 600;
export const MAX_POSITION = 300;
export const MAX_POSITIONS = 25;

function words(text: string | null | undefined): string[] {
  return (text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

/** The saved lines to tick at first: those whose topic (or text) shares a word with what the
 *  interruption is about. Never more than `MAX_HOLD`. */
export function preselectPositions(positions: readonly StandingPosition[], topic: string | null | undefined, headline?: string | null): string[] {
  const about = new Set([...words(topic), ...words(headline)]);
  if (about.size === 0) return [];
  const hit = positions.filter((p) => {
    const own = p.topic ? words(p.topic) : words(p.text);
    return own.some((w) => about.has(w));
  });
  return hit.slice(0, MAX_HOLD).map((p) => p.id);
}

/* ---------------- focus blocks and quiet hours ---------------- */

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** What is wrong with a focus block, in words, or null. */
export function focusBlockError(b: FocusBlock): string | null {
  if (!b.days?.length) return "Pick at least one day.";
  if (!HHMM.test(b.start) || !(HHMM.test(b.end) || b.end === "24:00")) return "Use times like 09:00.";
  if (minutesOf(b.end) <= minutesOf(b.start)) return "A focus block ends after it starts.";
  if (b.label && b.label.length > 40) return "Keep the name under 40 characters.";
  return null;
}

/** "Mon to Fri, 09:00 to 11:00" or "Mon, Wed, 14:00 to 16:00". */
export function focusBlockLabel(b: FocusBlock): string {
  const days = [...b.days].sort((x, y) => x - y);
  const run = days.length > 2 && days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const dayText = run ? `${DAY_SHORT[days[0]]} to ${DAY_SHORT[days[days.length - 1]]}` : days.map((d) => DAY_SHORT[d]).join(", ");
  return `${dayText}, ${b.start} to ${b.end}`;
}

/** "08:00" -> "8am", "13:30" -> "1:30pm". */
export function clock(hhmm: string): string {
  if (!HHMM.test(hhmm)) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/** The live line under the settings: who can reach you right now. */
export function rightNowLine(view: { interruptible_now?: boolean; quiet_reason?: string | null; quiet_until?: string | null }, untilText?: string | null): string {
  if (view.interruptible_now !== false) return "Right now your Myte can interrupt you when something needs you.";
  if (view.quiet_reason === "disabled") return "Right now interruptions are off. Everything waits for your evening digest.";
  const why = view.quiet_reason === "quiet_hours" ? "quiet hours" : view.quiet_reason === "focus_block" ? "a focus block" : "the hourly limit";
  return untilText ? `Right now interruptions are held until ${untilText} (${why}).` : `Right now interruptions are held (${why}).`;
}

/* ---------------- the evening digest ---------------- */

/** Only same-site paths are followed. */
export function safePath(href: string | null | undefined): string | null {
  const h = (href ?? "").trim();
  return h.startsWith("/") && !h.startsWith("//") ? h : null;
}

/** The digest's segments with unsafe links dropped and neighbouring plain text joined. */
export function digestSegments(segments: readonly DigestSegment[] | null | undefined): { text: string; href: string | null }[] {
  const out: { text: string; href: string | null }[] = [];
  for (const s of segments ?? []) {
    if (!s || typeof s.text !== "string" || !s.text) continue;
    const href = safePath(s.href);
    const last = out[out.length - 1];
    if (!href && last && !last.href) last.text += s.text;
    else out.push({ text: s.text, href });
  }
  return out;
}

/** The digest as one plain string (for a summary line or a screen-reader label). */
export function digestText(segments: readonly DigestSegment[] | null | undefined): string {
  return digestSegments(segments)
    .map((s) => s.text)
    .join("")
    .trim();
}

/** "Wednesday 11 November" for a YYYY-MM-DD day. */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  const wd = WEEKDAYS[(d.getUTCDay() + 6) % 7];
  const full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${wd} ${d.getUTCDate()} ${full[d.getUTCMonth()]}`;
}

/* ---------------- rules ---------------- */

const RULE_VERB: Record<AttendanceChoice, string> = {
  attend: "You attend",
  agent_listens: "Your Myte listens to",
  skip: "You skip",
};

/** "Your Myte listens to every recurring meeting with “status” in the title, of type Status update, you do not host." */
export function ruleSummary(rule: {
  choice: AttendanceChoice;
  title_contains?: string | null;
  template_name?: string | null;
  template_id?: string | null;
  recurring_only?: boolean;
  include_hosted?: boolean;
}): string {
  const what = rule.recurring_only ? "every recurring meeting" : "every meeting";
  const bits: string[] = [];
  if (rule.title_contains) bits.push(`with “${rule.title_contains}” in the title`);
  if (rule.template_id) bits.push(rule.template_name ? `of type ${rule.template_name}` : "of the chosen type");
  const verb = rule.choice === "attend" ? "You attend" : RULE_VERB[rule.choice];
  const hosted = rule.include_hosted ? ", including ones you host" : ", except ones you host";
  return `${verb} ${what}${bits.length ? ` ${bits.join(", ")}` : ""}${hosted}.`;
}

/* ---------------- views in the room ---------------- */

type ViewLike = { id: string; status: string; created_at: string };

/** Upserts views by id (a later status wins over "pending"), oldest first. */
export function mergeViews<V extends ViewLike>(current: readonly V[], incoming: readonly V[]): V[] {
  const byId = new Map(current.map((v) => [v.id, v]));
  for (const v of incoming) {
    if (!v || typeof v.id !== "string") continue;
    const had = byId.get(v.id);
    byId.set(v.id, had && had.status !== "pending" && v.status === "pending" ? had : v);
  }
  return Array.from(byId.values()).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

/** The "listeners" room event, or null when it is not one. */
export function parseListeners(raw: unknown): { count: number; userIds: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as { count?: unknown; userIds?: unknown };
  if (typeof p.count !== "number" || !Number.isFinite(p.count) || p.count < 0) return null;
  const ids = Array.isArray(p.userIds) ? p.userIds.filter((x): x is string => typeof x === "string") : [];
  return { count: Math.floor(p.count), userIds: ids };
}

/** "3 Mytes listening", "1 Myte listening". */
export function listeningLabel(n: number): string {
  return `${n} ${n === 1 ? "Myte" : "Mytes"} listening`;
}
