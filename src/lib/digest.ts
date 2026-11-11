/**
 * The weekly digest page (only-Mytheus wave, contract section 5), as pure helpers: the week's
 * label, the sections in reading order with their links, and the quiet-week test. Dates on the
 * wire are ISO `YYYY-MM-DD` (the week) or ISO 8601 (when things happened); the week is labelled
 * in UTC so the server render and the browser agree.
 */

import type {
  DigestAction,
  DigestDecision,
  DigestDecisionChange,
  DigestPromise,
  WeeklyDigest,
  WeeklyDigestWire,
} from "./api/only-mytheus-types";

/** Every list present, so no screen guards each one: the server may leave an empty list out. */
export function normalizeDigest(w: WeeklyDigestWire): WeeklyDigest {
  const list = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
  return {
    ...w,
    id: w.id ?? null,
    created_at: w.created_at ?? null,
    topics: list(w.topics),
    decisions: list(w.decisions),
    decision_changes: list(w.decision_changes),
    actions_assigned: list(w.actions_assigned),
    actions_closed: list(w.actions_closed),
    promises_due: list(w.promises_due),
    item_count: typeof w.item_count === "number" ? w.item_count : 0,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ymd(date: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

/** "Nov 3 to 9, 2026", "Oct 27 to Nov 2, 2026", "Dec 29, 2025 to Jan 4, 2026". */
export function weekRange(start: string, end: string): string {
  const a = ymd(start);
  const b = ymd(end);
  if (!a || !b) return "";
  if (a.y !== b.y) return `${MONTHS[a.m]} ${a.d}, ${a.y} to ${MONTHS[b.m]} ${b.d}, ${b.y}`;
  if (a.m !== b.m) return `${MONTHS[a.m]} ${a.d} to ${MONTHS[b.m]} ${b.d}, ${b.y}`;
  return `${MONTHS[a.m]} ${a.d} to ${b.d}, ${b.y}`;
}

/** "Week of Nov 3" for the past-weeks list. */
export function weekOf(start: string): string {
  const a = ymd(start);
  return a ? `Week of ${MONTHS[a.m]} ${a.d}` : "A past week";
}

/** "Nov 14" from a date. */
export function dayMonth(date: string | null | undefined): string {
  const a = ymd(date ?? "");
  return a ? `${MONTHS[a.m]} ${a.d}` : "";
}

export const meetingHref = (id: string | null | undefined) => (id ? `/meetings/${id}` : null);
export const decisionPageHref = (meetingId: string, decisionId: string) => `/meetings/${meetingId}/decisions/${decisionId}`;
export const taskHref = (id: string) => `/work/tasks?focus=${id}`;

export type DigestSectionKey = "decisions" | "decision_changes" | "actions_assigned" | "actions_closed" | "promises_due";

export type DigestSection =
  | { key: "decisions"; title: string; empty: string; items: DigestDecision[] }
  | { key: "decision_changes"; title: string; empty: string; items: DigestDecisionChange[] }
  | { key: "actions_assigned"; title: string; empty: string; items: DigestAction[] }
  | { key: "actions_closed"; title: string; empty: string; items: DigestAction[] }
  | { key: "promises_due"; title: string; empty: string; items: DigestPromise[] };

/** The five sections in reading order. Arrays the server left out read as empty. */
export function digestSections(d: WeeklyDigest): DigestSection[] {
  const arr = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
  return [
    { key: "decisions", title: "Decisions", empty: "No decisions on your topics this week.", items: arr(d.decisions) },
    { key: "decision_changes", title: "Decisions that changed", empty: "Nothing you rely on was overturned.", items: arr(d.decision_changes) },
    { key: "actions_assigned", title: "Assigned to you", empty: "Nothing new landed on you.", items: arr(d.actions_assigned) },
    { key: "actions_closed", title: "Closed", empty: "No tasks of yours were closed.", items: arr(d.actions_closed) },
    { key: "promises_due", title: "Promises due", empty: "No promises fall due soon.", items: arr(d.promises_due) },
  ];
}

export function itemTotal(d: WeeklyDigest): number {
  return digestSections(d).reduce((n, s) => n + s.items.length, 0);
}

/** Nothing happened on your topics: said plainly instead of five empty boxes. */
export function isQuietWeek(d: WeeklyDigest): boolean {
  return (d.item_count ?? 0) === 0 && itemTotal(d) === 0;
}

/** "6 things changed for you", the page's one line of context. */
export function digestSummary(d: WeeklyDigest): string {
  const n = itemTotal(d) || d.item_count || 0;
  if (n === 0) return "A quiet week: nothing on your topics changed.";
  return `${n} ${n === 1 ? "thing" : "things"} changed for you.`;
}

/** When a promise is due: "Due Nov 14", the hint it was made with, or nothing. */
export function promiseDue(p: DigestPromise): string {
  if (p.due_date) return `Due ${dayMonth(p.due_date)}`;
  return p.due_hint?.trim() ? `Due ${p.due_hint.trim()}` : "";
}

/** Where a promise leads: an action to its task, a commitment to Promises. */
export function promiseHref(p: DigestPromise): string {
  return p.kind === "action" ? taskHref(p.id) : "/work/promises";
}

export const DIGEST_LIST_LIMIT = 12;
