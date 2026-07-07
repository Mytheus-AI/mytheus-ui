import type { Priority } from "@/lib/mock/data";

/* Shared, dependency-free formatting helpers for the dashboard widgets.
   The dashboard renders the mock timeline against a fixed "now" — the day
   mtg_1 is live — so "Today", "Tomorrow" and overdue labels stay coherent
   and deterministic against src/lib/mock/data.ts. Swap MOCK_NOW for the
   server clock once /bff/dashboard provides real data. */

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

/** "Due today" / "Due tomorrow" / "Due Jul 5" / "Overdue · Jul 3" */
export function dueLabel(iso: string): string {
  const diff = daysFromNow(iso);
  if (diff < 0) return `Overdue · ${formatShortDate(iso)}`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${formatShortDate(iso)}`;
}

/** Monday-anchored start of the week containing `d`, as UTC ms */
export function startOfWeekUTC(d: Date): number {
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return utcMidnight(d) - dow * DAY_MS;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function greetingFor(date: Date): string {
  const hour = date.getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/* Frozen priority color language: red = act now, yellow = attention, blue = info. */
export const priorityDotClass: Record<Priority, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};
