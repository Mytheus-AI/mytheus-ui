/**
 * The room's top chrome (polish program, Phase 1): the agenda stage bar everyone sees, the late
 * joiner's catch-up line, the close-out wrap-up's shared countdown, and when a stand-in agent's
 * questions are due.
 *
 * Every number here comes from a server fact so every client agrees and a reload agrees with live:
 * an item's clock is its `started_at` (stamped once by core-api when it went in progress), its
 * plan is `duration_minutes + extended_minutes`, and the wrap-up deadline is the stored start
 * plus 60 seconds.
 *
 * Pure: no React, type-only imports.
 */

import type { AgendaItem } from "../api/meeting-agenda-types.ts";

/* ---------------------------------------------------------------- the stage bar */

export type StagePhase = "empty" | "not_started" | "running" | "done";

export interface StageView {
  phase: StagePhase;
  /** The item in progress (the first by position if, unusually, several are). */
  current: AgendaItem | null;
  /** The next pending item after the current one (or the first pending one before the start). */
  next: AgendaItem | null;
  /** 1-based number of the current item, else of the next one; 0 for an empty agenda. */
  number: number;
  total: number;
  /** Covered or skipped. */
  done: number;
  /** The current item's plan in seconds (duration plus extensions), or null with no duration. */
  plannedSeconds: number | null;
  /** Seconds since the current item started, or null when its start is not known. */
  elapsedSeconds: number | null;
  /** Elapsed is past the plan. */
  over: boolean;
  /** Within the last minute of the plan (or the last 20% of a short one). */
  nearlyOver: boolean;
}

const FINISHED = new Set(["covered", "skipped"]);

export function plannedMinutes(item: Pick<AgendaItem, "duration_minutes" | "extended_minutes">): number | null {
  if (item.duration_minutes == null) {
    return item.extended_minutes ? item.extended_minutes : null;
  }
  return item.duration_minutes + (item.extended_minutes ?? 0);
}

export function stageView(items: readonly AgendaItem[], nowMs: number): StageView {
  const ordered = [...items].sort((a, b) => a.position - b.position);
  const total = ordered.length;
  const done = ordered.filter((it) => FINISHED.has(it.status)).length;
  const base = { total, done, plannedSeconds: null, elapsedSeconds: null, over: false, nearlyOver: false };
  if (total === 0) return { ...base, phase: "empty", current: null, next: null, number: 0 };

  const currentIndex = ordered.findIndex((it) => it.status === "in_progress");
  if (currentIndex < 0) {
    const nextIndex = ordered.findIndex((it) => it.status === "pending");
    if (nextIndex < 0) return { ...base, phase: "done", current: null, next: null, number: total };
    return {
      ...base,
      phase: done === 0 ? "not_started" : "running",
      current: null,
      next: ordered[nextIndex],
      number: nextIndex + 1,
    };
  }
  const current = ordered[currentIndex];
  const next = ordered.slice(currentIndex + 1).find((it) => it.status === "pending") ??
    ordered.find((it) => it.status === "pending" && it.id !== current.id) ??
    null;
  const minutes = plannedMinutes(current);
  const plannedSeconds = minutes === null ? null : minutes * 60;
  const started = current.started_at ? Date.parse(current.started_at) : NaN;
  const elapsedSeconds = Number.isFinite(started) ? Math.max(0, Math.floor((nowMs - started) / 1000)) : null;
  const over = plannedSeconds !== null && elapsedSeconds !== null && elapsedSeconds > plannedSeconds;
  const margin = plannedSeconds === null ? 0 : Math.min(60, Math.floor(plannedSeconds * 0.2));
  const nearlyOver =
    !over && plannedSeconds !== null && elapsedSeconds !== null && elapsedSeconds >= plannedSeconds - margin;
  return {
    ...base,
    phase: "running",
    current,
    next,
    number: currentIndex + 1,
    plannedSeconds,
    elapsedSeconds,
    over,
    nearlyOver,
  };
}

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** m:ss, or h:mm:ss past an hour. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** "4 min", "1 min", "less than a minute". */
export function minutesPhrase(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  if (m < 1) return "less than a minute";
  return `${m} min`;
}

/** What a screen reader hears for the current item's time: calm, minute-level, never per second. */
export function spokenItemTime(view: Pick<StageView, "elapsedSeconds" | "plannedSeconds" | "over">): string {
  if (view.elapsedSeconds === null) return "Time on this item not known yet";
  const elapsed = minutesPhrase(view.elapsedSeconds);
  if (view.plannedSeconds === null) return `${elapsed} on this item, no time planned`;
  if (view.over) return `${minutesPhrase(view.elapsedSeconds - view.plannedSeconds)} over the ${minutesPhrase(view.plannedSeconds)} planned`;
  return `${elapsed} of ${minutesPhrase(view.plannedSeconds)} planned`;
}

/* ---------------------------------------------------------------- late joiners */

/** Joined more than `graceMs` after the meeting's call opened: worth a catch-up line. */
export function isLateJoin(startedAt: string | null | undefined, joinedAtMs: number, graceMs = 90_000): boolean {
  if (!startedAt) return false;
  const start = Date.parse(startedAt);
  return Number.isFinite(start) && joinedAtMs - start > graceMs;
}

export interface CatchUpCounts {
  decisionCount: number;
  actionCount: number;
  agendaDone: number;
  agendaTotal: number;
  /** 1-based number and title of the item in progress, if any. */
  current: { number: number; title: string } | null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Since 0:00: 2 decisions, 1 task, item 3 in progress". */
export function catchUpLine(c: CatchUpCounts): string {
  const parts: string[] = [];
  if (c.decisionCount > 0) parts.push(plural(c.decisionCount, "decision", "decisions"));
  if (c.actionCount > 0) parts.push(plural(c.actionCount, "task", "tasks"));
  if (c.current) parts.push(`item ${c.current.number} in progress`);
  else if (c.agendaTotal > 0 && c.agendaDone === c.agendaTotal) parts.push("agenda done");
  else if (c.agendaTotal > 0 && c.agendaDone > 0) parts.push(`${c.agendaDone} of ${c.agendaTotal} items done`);
  if (parts.length === 0) return "Since 0:00: nothing decided yet";
  return `Since 0:00: ${parts.join(", ")}`;
}

/* ---------------------------------------------------------------- the close-out wrap-up */

export const WRAP_UP_SECONDS = 60;

export interface WrapUpState {
  state: "started" | "cancelled";
  startedAt: string | null;
  endsAt: string | null;
  byUserId: string | null;
}

/** The wrap-up the page was rendered with (a reload during the wrap-up keeps counting down). */
export function initialWrapUp(startedAt: string | null | undefined): WrapUpState | null {
  if (!startedAt || !Number.isFinite(Date.parse(startedAt))) return null;
  return {
    state: "started",
    startedAt,
    endsAt: new Date(Date.parse(startedAt) + WRAP_UP_SECONDS * 1000).toISOString(),
    byUserId: null,
  };
}

/** "wrap-up" from the gateway: the stored wrap-up, open with its deadline, or closed. */
export function applyWrapUp(
  prev: WrapUpState | null,
  p: { state?: unknown; startedAt?: unknown; endsAt?: unknown; byUserId?: unknown } | null | undefined,
): WrapUpState | null {
  if (!p) return prev;
  if (p.state === "cancelled") return null;
  if (p.state !== "started" || typeof p.endsAt !== "string" || !Number.isFinite(Date.parse(p.endsAt))) return prev;
  return {
    state: "started",
    startedAt: typeof p.startedAt === "string" ? p.startedAt : null,
    endsAt: p.endsAt,
    byUserId: typeof p.byUserId === "string" ? p.byUserId : null,
  };
}

/** Whole seconds left before the wrap-up closes the meeting, never negative. */
export function secondsLeft(endsAt: string | null | undefined, nowMs: number): number {
  if (!endsAt) return 0;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - nowMs) / 1000));
}

/* ---------------------------------------------------------------- stand-in agents */

export interface StandIn {
  userId: string;
  questions: readonly string[];
}

export interface DueQuestions {
  userId: string;
  /** The item that raised them: one they own that just started, or null when they own none. */
  itemId: string | null;
  questions: string[];
  /** Stable key, so a card the host closed does not come back for the same item. */
  key: string;
}

/**
 * Whose questions to raise now. A stand-in's questions come up when an item they own starts. If
 * they own no item, once the meeting's agenda is under way (or at once, with no agenda). Only
 * stand-ins whose questions the viewer can see are passed in (ADR-0039 B5: the host and the person).
 */
export function dueQuestions(items: readonly AgendaItem[], standIns: readonly StandIn[]): DueQuestions[] {
  const current = items.find((it) => it.status === "in_progress") ?? null;
  const underWay = items.length === 0 || items.some((it) => it.status !== "pending");
  const out: DueQuestions[] = [];
  for (const s of standIns) {
    const questions = s.questions.map((q) => q.trim()).filter(Boolean);
    if (questions.length === 0) continue;
    const owns = items.some((it) => it.owner_user_id === s.userId);
    if (owns) {
      if (current && current.owner_user_id === s.userId) {
        out.push({ userId: s.userId, itemId: current.id, questions, key: `${s.userId}:${current.id}` });
      }
    } else if (underWay) {
      out.push({ userId: s.userId, itemId: null, questions, key: `${s.userId}:meeting` });
    }
  }
  return out;
}
