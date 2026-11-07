import type { Priority } from "@/lib/mock/data";

/* Shared, dependency-free formatting helpers for the dashboard widgets.
   The mock-backed panels (tasks, decisions, recent meetings) render against a fixed "now" -
   the day mtg_1 is live - so "Today", "Tomorrow" and overdue labels stay coherent and
   deterministic against src/lib/mock/data.ts. Real `bff` meetings use the server clock. */

export const MOCK_NOW = new Date("2026-07-01T14:30:00Z");

const DAY_MS = 86_400_000;
const TZ = "UTC"; // mock ISO times are UTC; render them in UTC so labels are stable

/** "3:00 PM" */
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** "Wednesday, July 1" */
export function formatDayLong(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  }).format(date);
}

/** "Jul 3" */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}

function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function isSameUTCDay(a: Date, b: Date): boolean {
  return utcMidnight(a) === utcMidnight(b);
}

/** whole days from MOCK_NOW's date to the given date (negative = past) */
export function daysFromNow(iso: string): number {
  return Math.round((utcMidnight(new Date(iso)) - utcMidnight(MOCK_NOW)) / DAY_MS);
}

/** "Due today" / "Due tomorrow" / "Due Jul 5" / "Overdue, Jul 3" */
export function dueLabel(iso: string): string {
  const diff = daysFromNow(iso);
  if (diff < 0) return `Overdue, ${formatShortDate(iso)}`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${formatShortDate(iso)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function greetingFor(date: Date): string {
  return greetingForHour(date.getUTCHours());
}

/** "in 24 min" / "in 2 hr 5 min" / "in 3 days" / "now" */
export function relativeLabel(msUntil: number): string {
  if (msUntil <= 0) return "now";
  const minutes = Math.ceil(msUntil / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  if (minutes < 24 * 60) return `in ${formatDuration(minutes)}`;
  const days = Math.round(msUntil / DAY_MS);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
}

/** The big hero figure: "24:00" under an hour, "2:05:09" under a day, then whole days. */
export function countdownParts(msUntil: number): { value: string; label: string } {
  if (msUntil <= 0) return { value: "00:00", label: "starting now" };
  const total = Math.ceil(msUntil / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  if (h >= 24) {
    const days = Math.round(msUntil / DAY_MS);
    return { value: String(days), label: days === 1 ? "day until start" : "days until start" };
  }
  return { value: h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`, label: "until start" };
}

/** Scheduled length in whole minutes, or undefined when either end is missing or invalid. */
export function minutesBetween(startIso?: string, endIso?: string): number | undefined {
  if (!startIso || !endIso) return undefined;
  const ms = Date.parse(endIso) - Date.parse(startIso);
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60_000) : undefined;
}

export const priorityLabel: Record<Priority, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};
