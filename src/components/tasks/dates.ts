import type { TaskItem } from "@/lib/tasks";

/* Date logic for the Tasks screen, against the real clock. A task with no due date (most real
   action items: one is set only when the meeting named a date) sorts last and groups as Later. */

const DAY_MS = 86_400_000;

function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole days from "now" to the due date (negative = past); `null` when there is no due date. */
export function daysUntil(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return Math.round((utcMidnight(new Date(dueDate)) - utcMidnight(new Date())) / DAY_MS);
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
export const formatLong = (iso: string | null) => (iso ? longFmt.format(new Date(iso)) : "No due date");

export type DueTone = "overdue" | "today" | "quiet";
export type DueIcon = "warning" | "done" | "calendar";

export function dueInfo(dueDate: string | null, done: boolean): { label: string; tone: DueTone; icon: DueIcon } {
  if (!dueDate) return { label: done ? "Done" : "No due date", tone: "quiet", icon: done ? "done" : "calendar" };
  if (done) return { label: formatShort(dueDate), tone: "quiet", icon: "done" };
  const d = daysUntil(dueDate) ?? 0;
  if (d < 0) return { label: d === -1 ? "1 day overdue" : `${-d} days overdue`, tone: "overdue", icon: "warning" };
  if (d === 0) return { label: "Today", tone: "today", icon: "calendar" };
  if (d === 1) return { label: "Tomorrow", tone: "quiet", icon: "calendar" };
  if (d < 7) {
    return { label: `${weekdayFmt.format(new Date(dueDate))}, ${formatShort(dueDate)}`, tone: "quiet", icon: "calendar" };
  }
  return { label: formatShort(dueDate), tone: "quiet", icon: "calendar" };
}

export type Task = TaskItem & { done: boolean };
export type TaskGroup = "overdue" | "today" | "week" | "later" | "done";

export function groupOf(t: Task): TaskGroup {
  if (t.done) return "done";
  const d = daysUntil(t.dueDate);
  if (d === null) return "later";
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  return d <= 7 ? "week" : "later";
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const rank = (p: Task["priority"]) => (p ? PRIORITY_ORDER[p] : 3);

/** Soonest due first, undated last, then priority, then title. */
export function sortTasks(a: Task, b: Task): number {
  const due =
    a.dueDate && b.dueDate ? a.dueDate.localeCompare(b.dueDate) : a.dueDate ? -1 : b.dueDate ? 1 : 0;
  return (
    due ||
    rank(a.priority) - rank(b.priority) ||
    a.title.localeCompare(b.title)
  );
}
