import type { ActionItem } from "@/lib/mock/data";

/* Date logic for the Tasks screen. The mock timeline is anchored to the same fixed "now" the
   dashboard uses (the day mtg_1 is live) so Overdue / Today / This week stay coherent against
   src/lib/mock/data.ts. Swap TASKS_NOW for the server clock once the tasks endpoint exists. */
export const TASKS_NOW = new Date("2026-07-01T14:30:00Z");

const DAY_MS = 86_400_000;

function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole days from "now" to the due date (negative = past). */
export function daysUntil(dueDate: string): number {
  return Math.round((utcMidnight(new Date(dueDate)) - utcMidnight(TASKS_NOW)) / DAY_MS);
}

const shortFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export const formatShort = (iso: string) => shortFmt.format(new Date(iso));
export const formatLong = (iso: string) => longFmt.format(new Date(iso));

export type DueTone = "overdue" | "today" | "quiet";
export type DueIcon = "warning" | "done" | "calendar";

export function dueInfo(dueDate: string, done: boolean): { label: string; tone: DueTone; icon: DueIcon } {
  if (done) return { label: formatShort(dueDate), tone: "quiet", icon: "done" };
  const d = daysUntil(dueDate);
  if (d < 0) return { label: d === -1 ? "1 day overdue" : `${-d} days overdue`, tone: "overdue", icon: "warning" };
  if (d === 0) return { label: "Today", tone: "today", icon: "calendar" };
  if (d === 1) return { label: "Tomorrow", tone: "quiet", icon: "calendar" };
  if (d < 7) {
    return { label: `${weekdayFmt.format(new Date(dueDate))}, ${formatShort(dueDate)}`, tone: "quiet", icon: "calendar" };
  }
  return { label: formatShort(dueDate), tone: "quiet", icon: "calendar" };
}

export type Task = ActionItem & { done: boolean };
export type TaskGroup = "overdue" | "today" | "week" | "later" | "done";

export function groupOf(t: Task): TaskGroup {
  if (t.done) return "done";
  const d = daysUntil(t.dueDate);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  return d <= 7 ? "week" : "later";
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function sortTasks(a: Task, b: Task): number {
  return (
    a.dueDate.localeCompare(b.dueDate) ||
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
    a.title.localeCompare(b.title)
  );
}
