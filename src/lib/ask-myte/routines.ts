/**
 * Routines, recurring questions (ADR-0049 F5): "Every Monday at 9, tell me what changed in
 * pricing." The form's rules, the words for a cadence, and a preview of the next run. core-api
 * computes the real `next_run_at`; the preview here only tells the person what they are setting.
 *
 * `weekday` is 0 for Monday through 6 for Sunday (core-api's convention).
 *
 * Pure, tested in tests/ask-myte-routines.test.ts.
 */

import type { Cadence, Routine } from "./types.ts";

export const MAX_ROUTINES = 10;
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const CADENCES: readonly Cadence[] = ["daily", "weekdays", "weekly"];
export const CADENCE_LABEL: Record<Cadence, string> = { daily: "Every day", weekdays: "Every weekday", weekly: "Every week" };

export interface RoutineDraft {
  question: string;
  cadence: Cadence;
  /** 0 Monday .. 6 Sunday; only for weekly */
  weekday: number | null;
  hour: number;
  timezone: string;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** "Every Monday at 09:00", "Every weekday at 08:00", "Every day at 18:00". */
export function cadenceWords(r: Pick<RoutineDraft, "cadence" | "weekday" | "hour">): string {
  const at = ` at ${hourLabel(r.hour)}`;
  if (r.cadence === "weekly") return `Every ${WEEKDAYS[r.weekday ?? 0] ?? "Monday"}${at}`;
  if (r.cadence === "weekdays") return `Every weekday${at}`;
  return `Every day${at}`;
}

/** The nudge's words when a run is ready: "Your Monday update is ready". */
export function readyWords(r: Pick<RoutineDraft, "cadence" | "weekday">): string {
  if (r.cadence === "weekly") return `Your ${WEEKDAYS[r.weekday ?? 0] ?? "weekly"} update is ready`;
  if (r.cadence === "weekdays") return "Your weekday update is ready";
  return "Your daily update is ready";
}

export type DraftCheck = { ok: true; value: RoutineDraft } | { ok: false; field: "question" | "weekday" | "hour" | "timezone"; message: string };

export function checkRoutineDraft(d: RoutineDraft): DraftCheck {
  const question = d.question.replace(/\s+/g, " ").trim();
  if (!question) return { ok: false, field: "question", message: "Write the question to ask each time." };
  if (question.length > 2000) return { ok: false, field: "question", message: "Keep the question under 2000 characters." };
  if (!Number.isInteger(d.hour) || d.hour < 0 || d.hour > 23) return { ok: false, field: "hour", message: "Pick an hour." };
  if (d.cadence === "weekly" && (!Number.isInteger(d.weekday) || (d.weekday as number) < 0 || (d.weekday as number) > 6)) {
    return { ok: false, field: "weekday", message: "Pick a day of the week." };
  }
  if (!validZone(d.timezone)) return { ok: false, field: "timezone", message: "Pick a time zone." };
  return { ok: true, value: { question, cadence: d.cadence, weekday: d.cadence === "weekly" ? (d.weekday as number) : null, hour: d.hour, timezone: d.timezone } };
}

export function validZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/* ---------------- the next run ---------------- */

type Wall = { y: number; m: number; d: number; h: number; mi: number; wd: number };

/** The wall clock in a zone at an instant. `wd` is 0 Monday .. 6 Sunday. */
function wallIn(ms: number, tz: string): Wall {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23" }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), h: Number(get("hour")) % 24, mi: Number(get("minute")), wd };
}

/** The instant a wall clock time happens in a zone (the first one, across a DST change). */
function instantOf(y: number, m: number, d: number, h: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, h);
  let t = guess;
  for (let i = 0; i < 3; i++) {
    const w = wallIn(t, tz);
    const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi);
    t += guess - asUtc;
  }
  return t;
}

/** When a routine would next run after `now`, or null for a bad draft. */
export function nextRunAt(r: Pick<RoutineDraft, "cadence" | "weekday" | "hour" | "timezone">, now: Date): Date | null {
  if (!validZone(r.timezone) || r.hour < 0 || r.hour > 23) return null;
  const today = wallIn(now.getTime(), r.timezone);
  for (let i = 0; i < 9; i++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const wd = (day.getUTCDay() + 6) % 7;
    if (r.cadence === "weekdays" && wd > 4) continue;
    if (r.cadence === "weekly" && wd !== (r.weekday ?? 0)) continue;
    const at = instantOf(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), r.hour, r.timezone);
    if (at > now.getTime()) return new Date(at);
  }
  return null;
}

/** "Next: Monday, 17 Nov at 09:00" in the routine's own zone. */
export function nextRunWords(r: Pick<RoutineDraft, "cadence" | "weekday" | "hour" | "timezone">, now: Date): string | null {
  const at = nextRunAt(r, now);
  if (!at) return null;
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: r.timezone }).format(at);
  return `${day} at ${hourLabel(r.hour)}`;
}

/** A due routine's thread title: the question, kept short. */
export function routineThreadTitle(r: Pick<Routine, "question" | "cadence" | "weekday">): string {
  const q = r.question.replace(/\s+/g, " ").trim();
  const short = q.length <= 70 ? q : `${q.slice(0, 67).replace(/\s+\S*$/, "")}...`;
  return `${readyWords(r).replace(/^Your /, "").replace(/ is ready$/, "")}: ${short}`.replace(/^./, (c) => c.toUpperCase()).slice(0, 120);
}

/** Every IANA zone the browser knows, with the given one first (it may be missing from the list). */
export function zoneOptions(current: string): string[] {
  let all: string[] = [];
  try {
    all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    all = [];
  }
  if (!all.length) all = ["UTC", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo", "America/New_York", "America/Los_Angeles"];
  return [current, ...all.filter((z) => z !== current)];
}
