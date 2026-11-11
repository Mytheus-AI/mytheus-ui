/**
 * The promise ledger (Beyond the meeting, Layer 2): wire shapes of core-api `/api/v1/promises`
 * and the pure helpers the ledger renders with: grouping by due date, the source and recipient
 * filters, day words ("Friday", "tomorrow", "3 days late") and the week capacity bar.
 *
 * HAND-WRITTEN TYPES mirroring `services/core_api/promise_models.py` until the generated client is
 * regenerated (`npm run generate:api`). Pure (no imports), so it runs on the server, in the browser
 * and under `node --test`. Dates are `YYYY-MM-DD` strings compared as strings; "today" is passed in
 * (the server's UTC day on first render, the viewer's own day after mount).
 */

/* ---------------- wire shapes ---------------- */

export type PromiseStatus = "open" | "done" | "dismissed";
export type PromiseChannel = "meeting" | "in_person" | "slack" | "email" | "manual";
export type ReviewState = "pending" | "confirmed";
export type CapacityLevel = "ok" | "tight" | "over" | "off";
export type ProposalState = "pending" | "accepted" | "declined" | "withdrawn";
export type ProposalTarget = "commitment" | "action";

export interface PromiseSource {
  channel: PromiseChannel;
  label: string;
  link: string | null;
  external: boolean;
  quote: string | null;
  at: string | null;
}

export interface ProposalBrief {
  id: string;
  proposed_due: string;
  state: ProposalState;
  requester_name: string | null;
}

export interface LedgerPromise {
  id: string;
  content: string;
  status: PromiseStatus;
  review_state: ReviewState;
  channel: PromiseChannel;
  due_at: string | null;
  due_hint: string | null;
  recipient_user_id: string | null;
  recipient_name: string | null;
  source: PromiseSource;
  meeting_id: string | null;
  moment_id: string | null;
  action_item_id: string | null;
  confidence: number | null;
  handed_off_to: string | null;
  handed_off_to_name: string | null;
  handed_off_from: string | null;
  created_at: string;
  updated_at: string;
  done_at: string | null;
  pending_proposal: ProposalBrief | null;
}

export interface CaptureSettings {
  slack_enabled: boolean;
  email_enabled: boolean;
  email_connected: boolean;
}

export interface PromiseLedgerBody {
  items: LedgerPromise[];
  pending_review: number;
  capture: CaptureSettings;
}

export interface CapacityDay {
  date: string;
  label: string;
  promises: number;
  actions: number;
  items: number;
  meeting_minutes: number;
  focus_minutes: number;
  away: boolean;
  load_minutes: number;
  capacity_minutes: number;
  level: CapacityLevel;
}

export interface Capacity {
  start: string;
  today: string;
  tz: string;
  days: CapacityDay[];
  overdue: number;
  undated: number;
  calendar_synced: boolean;
  workday_minutes: number;
  item_minutes: number;
}

export interface CapacityCheck {
  due_date: string;
  due_label: string;
  level: CapacityLevel;
  items_on_day: number;
  meeting_minutes: number;
  warn: boolean;
  message: string;
  suggested_date: string | null;
  suggested_label: string | null;
}

export interface DateProposal {
  id: string;
  target: ProposalTarget;
  target_id: string;
  content: string;
  current_due: string | null;
  proposed_due: string;
  note: string | null;
  state: ProposalState;
  proposer_id: string;
  proposer_name: string | null;
  requester_id: string;
  requester_name: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface RenegotiateResult {
  mode: "proposed" | "applied";
  proposal: DateProposal | null;
  target: ProposalTarget;
  target_id: string;
  due_at: string | null;
  previous_due: string | null;
}

/* ---------------- limits ---------------- */

export const LEDGER_LIMITS = { content: 500, recipient: 200, note: 300, link: 2000 } as const;

/* ---------------- channels ---------------- */

export const CHANNELS: readonly { value: PromiseChannel; label: string }[] = [
  { value: "meeting", label: "Meetings" },
  { value: "in_person", label: "In person" },
  { value: "slack", label: "Slack" },
  { value: "email", label: "Email" },
  { value: "manual", label: "Added by hand" },
];

export function channelLabel(channel: PromiseChannel): string {
  return CHANNELS.find((c) => c.value === channel)?.label ?? "Other";
}

/* ---------------- dates ---------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !ISO.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function utc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, n: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(iso: string): number {
  return (utc(iso).getUTCDay() + 6) % 7;
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[utc(iso).getUTCDay()];
}

/** `Fri 21 Nov`. */
export function shortDay(iso: string): string {
  const d = utc(iso);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** How a person says the day: `today`, `tomorrow`, `Friday` within the coming week, else
    `Fri 21 Nov` (also for the past). The same rule core-api's capacity check speaks with. */
export function dayWord(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff > 1 && diff < 7) return weekdayName(iso);
  return shortDay(iso);
}

/** The due line of a row: `Due today`, `Due Friday`, `1 day late`, `12 days late`. */
export function dueText(due: string, today: string): string {
  const diff = daysBetween(today, due);
  if (diff < 0) return `${-diff} ${diff === -1 ? "day" : "days"} late`;
  const word = dayWord(due, today);
  return `Due ${word}`;
}

/** The viewer's own calendar day (`YYYY-MM-DD`) for a Date, in their zone. */
export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week `iso` falls in. */
export function weekStart(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

/* ---------------- grouping by due date ---------------- */

export type DueGroupKey = "overdue" | "today" | "tomorrow" | "this_week" | "next_week" | "later" | "undated";

export interface DueGroup {
  key: DueGroupKey;
  title: string;
  /** a short date range or note under the title */
  hint: string;
  items: LedgerPromise[];
}

export function dueGroupKey(due: string | null, today: string): DueGroupKey {
  if (!due) return "undated";
  const diff = daysBetween(today, due);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  const nextMonday = addDays(weekStart(today), 7);
  if (due < nextMonday) return "this_week";
  if (due < addDays(nextMonday, 7)) return "next_week";
  return "later";
}

const GROUP_ORDER: DueGroupKey[] = ["overdue", "today", "tomorrow", "this_week", "next_week", "later", "undated"];

/** The open, confirmed promises grouped by when they are due, soonest first; within a group by
    date, then newest. Pending (agent-found) promises are reviewed separately and never grouped. */
export function groupByDue(items: readonly LedgerPromise[], today: string): DueGroup[] {
  const buckets = new Map<DueGroupKey, LedgerPromise[]>();
  for (const p of items) {
    if (p.status !== "open" || p.review_state !== "confirmed") continue;
    const key = dueGroupKey(p.due_at, today);
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }
  const nextMonday = addDays(weekStart(today), 7);
  const hints: Record<DueGroupKey, string> = {
    overdue: "Past their date",
    today: shortDay(today),
    tomorrow: shortDay(addDays(today, 1)),
    this_week: `Until ${shortDay(addDays(nextMonday, -1))}`,
    next_week: `${shortDay(nextMonday)} to ${shortDay(addDays(nextMonday, 6))}`,
    later: `From ${shortDay(addDays(nextMonday, 7))}`,
    undated: "Give them a date to see them in your week",
  };
  const titles: Record<DueGroupKey, string> = {
    overdue: "Overdue",
    today: "Today",
    tomorrow: "Tomorrow",
    this_week: "Later this week",
    next_week: "Next week",
    later: "Later",
    undated: "No date yet",
  };
  return GROUP_ORDER.filter((k) => buckets.has(k)).map((key) => ({
    key,
    title: titles[key],
    hint: hints[key],
    items: [...(buckets.get(key) ?? [])].sort(
      (a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? "") || b.created_at.localeCompare(a.created_at),
    ),
  }));
}

/** Promises the agent found (or a colleague handed over) that wait for the person's yes. */
export function pendingReview(items: readonly LedgerPromise[]): LedgerPromise[] {
  return items
    .filter((p) => p.status === "open" && p.review_state === "pending")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Kept promises, newest first. */
export function keptPromises(items: readonly LedgerPromise[]): LedgerPromise[] {
  return items.filter((p) => p.status === "done").sort((a, b) => (b.done_at ?? b.updated_at).localeCompare(a.done_at ?? a.updated_at));
}

/* ---------------- filters ---------------- */

export const RECIPIENT_ALL = "all";
export const RECIPIENT_NONE = "none";

export interface LedgerFilter {
  /** empty: every channel */
  channels: readonly PromiseChannel[];
  /** `all`, `none`, a user id, or `label:<name>` for a recipient outside the workspace */
  recipient: string;
}

export function recipientKey(p: LedgerPromise): string {
  if (p.recipient_user_id) return p.recipient_user_id;
  if (p.recipient_name) return `label:${p.recipient_name.toLowerCase()}`;
  return RECIPIENT_NONE;
}

export function filterLedger(items: readonly LedgerPromise[], filter: LedgerFilter): LedgerPromise[] {
  return items.filter((p) => {
    if (filter.channels.length && !filter.channels.includes(p.channel)) return false;
    if (filter.recipient !== RECIPIENT_ALL && recipientKey(p) !== filter.recipient) return false;
    return true;
  });
}

export interface RecipientOption {
  value: string;
  label: string;
  count: number;
}

/** Everyone the open promises were made to, most promised first, plus "No one named". */
export function recipientOptions(items: readonly LedgerPromise[]): RecipientOption[] {
  const map = new Map<string, RecipientOption>();
  let none = 0;
  for (const p of items) {
    if (p.status !== "open") continue;
    const key = recipientKey(p);
    if (key === RECIPIENT_NONE) {
      none += 1;
      continue;
    }
    const prev = map.get(key);
    map.set(key, { value: key, label: p.recipient_name ?? "Someone", count: (prev?.count ?? 0) + 1 });
  }
  const named = Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return none ? [...named, { value: RECIPIENT_NONE, label: "No one named", count: none }] : named;
}

/** How many open promises each channel holds (for the filter chips). */
export function channelCounts(items: readonly LedgerPromise[]): Record<PromiseChannel, number> {
  const counts: Record<PromiseChannel, number> = { meeting: 0, in_person: 0, slack: 0, email: 0, manual: 0 };
  for (const p of items) if (p.status === "open") counts[p.channel] += 1;
  return counts;
}

/* ---------------- the week capacity bar ---------------- */

export interface CapacitySegment {
  date: string;
  /** `Mon` */
  short: string;
  /** `Friday`, `today`, `tomorrow` */
  word: string;
  level: CapacityLevel;
  /** load over capacity, 0 to 1 (a full or over day is 1) */
  fill: number;
  /** the part of the fill that is meetings, 0 to 1 */
  meetingFill: number;
  items: number;
  meetingHours: number;
  focusHours: number;
  away: boolean;
  isToday: boolean;
  isPast: boolean;
  /** one sentence for screen readers and the tooltip */
  description: string;
}

const hours = (minutes: number) => Math.round((minutes / 60) * 2) / 2;

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function describeDay(d: CapacityDay, today: string): string {
  const word = dayWord(d.date, today);
  const head = word[0].toUpperCase() + word.slice(1);
  if (d.away) return `${head}: away${d.items ? `, ${plural(d.items, "thing")} due` : ""}.`;
  const parts = [d.items ? `${plural(d.items, "thing")} due` : "nothing due"];
  if (d.meeting_minutes) parts.push(`${hours(d.meeting_minutes)} h of meetings`);
  if (d.focus_minutes) parts.push(`${hours(d.focus_minutes)} h of focus time`);
  const verdict = d.level === "over" ? "Too full" : d.level === "tight" ? "Tight" : d.level === "off" ? "Day off" : "Has room";
  return `${head}: ${parts.join(", ")}. ${verdict}.`;
}

/** The week's days as segments: Monday to Friday, plus a weekend day only when something is due
    on it (a weekend is not a workday, so anything due there shows as over). */
export function capacitySegments(cap: Capacity, today: string): CapacitySegment[] {
  return cap.days
    .filter((d) => weekdayIndex(d.date) < 5 || d.items > 0 || d.meeting_minutes > 0)
    .map((d) => {
      const capacity = d.capacity_minutes || cap.workday_minutes;
      const full = d.level === "over" ? 1 : Math.min(1, d.load_minutes / Math.max(capacity, 1));
      return {
        date: d.date,
        short: weekdayName(d.date).slice(0, 3),
        word: dayWord(d.date, today),
        level: d.level,
        fill: d.capacity_minutes === 0 && d.items === 0 ? 0 : full,
        meetingFill: Math.min(full, d.meeting_minutes / Math.max(capacity, 1)),
        items: d.items,
        meetingHours: hours(d.meeting_minutes),
        focusHours: hours(d.focus_minutes),
        away: d.away,
        isToday: d.date === today,
        isPast: d.date < today,
        description: describeDay(d, today),
      };
    });
}

/** One line about the week: the fullest day still ahead, or that it has room. */
export function weekSummary(cap: Capacity, today: string): string {
  const ahead = cap.days.filter((d) => d.date >= today);
  const over = ahead.filter((d) => d.level === "over" && d.items > 0);
  const tight = ahead.filter((d) => d.level === "tight");
  const due = cap.days.reduce((n, d) => n + d.items, 0);
  if (over.length) {
    const first = over[0];
    const word = dayWord(first.date, today);
    const head = word[0].toUpperCase() + word.slice(1);
    return `${head} is too full: ${plural(first.items, "thing")} due${first.meeting_minutes ? ` and ${hours(first.meeting_minutes)} h of meetings` : ""}.`;
  }
  if (tight.length) {
    const names = tight.map((d) => dayWord(d.date, today));
    return `${names.length === 1 ? names[0][0].toUpperCase() + names[0].slice(1) + " is" : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are`} tight. The rest of the week has room.`;
  }
  return due ? `${plural(due, "thing")} due this week, and every day has room.` : "Nothing due this week yet.";
}
