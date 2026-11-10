/**
 * How the meeting health card (mytheus-docs ADR-0039 B8) says its numbers. Pure, so the wording
 * and rounding are unit tested and the card stays a plain server component.
 */

import type { HealthTrendPoint, MeetingHealth } from "../../lib/api/meeting-brain-types.ts";

/** Covered of total as a whole percent, or null when the meeting had no agenda. */
export function coveragePercent(agenda: MeetingHealth["agenda"]): number | null {
  if (agenda.total <= 0) return null;
  return Math.round((Math.min(agenda.covered, agenda.total) / agenda.total) * 100);
}

/** People-hours as a value and unit: "45" "people-minutes" under an hour, else "3.5" "people-hours". */
export function peopleTime(hours: number): { value: string; unit: string; spoken: string } {
  const h = Math.max(0, hours);
  if (h < 1) {
    const m = Math.round(h * 60);
    return { value: String(m), unit: m === 1 ? "person-minute" : "people-minutes", spoken: `${m} people-minutes` };
  }
  const rounded = Math.round(h * 10) / 10;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return { value, unit: rounded === 1 ? "person-hour" : "people-hours", spoken: `${value} people-hours` };
}

/** "2 decisions", "1 action", "no decisions". */
export function countLabel(n: number, one: string, many: string): string {
  if (n <= 0) return `no ${many}`;
  return `${n} ${n === 1 ? one : many}`;
}

export interface BalanceSlice {
  userId: string;
  name: string;
  /** Whole percent; the slices add up to 100. */
  percent: number;
}

/**
 * Talk balance as whole percents that add up to exactly 100 (largest remainder), biggest share
 * first. Null when no speaker timing is stored.
 */
export function balanceSlices(
  balance: MeetingHealth["talk_balance"],
  nameOf: (id: string) => string,
): BalanceSlice[] | null {
  if (!balance || balance.length === 0) return null;
  const total = balance.reduce((n, b) => n + Math.max(0, b.share), 0);
  if (total <= 0) return null;
  const raw = balance.map((b) => ({ userId: b.user_id, exact: (Math.max(0, b.share) / total) * 100 }));
  const floors = raw.map((r) => Math.floor(r.exact));
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, rem: r.exact - floors[i] }))
    .sort((a, b) => b.rem - a.rem);
  for (const o of order) {
    if (left <= 0) break;
    floors[o.i] += 1;
    left -= 1;
  }
  return raw
    .map((r, i) => ({ userId: r.userId, name: nameOf(r.userId), percent: floors[i] }))
    .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));
}

/** A gentle line about the balance, or null when it is even enough to say nothing. */
export function balanceNote(slices: BalanceSlice[] | null): string | null {
  if (!slices || slices.length < 3) return null;
  const top = slices[0];
  if (top.percent >= 60) return `${top.name} did most of the talking, ${top.percent}% of it.`;
  const quiet = slices.filter((s) => s.percent < 5).length;
  if (quiet > 0) return `${quiet} ${quiet === 1 ? "person" : "people"} said very little. Worth asking them directly next time.`;
  return null;
}

/** The gentle async suggestion (B8: no decisions, no actions, under half the agenda covered). */
export const ASYNC_SUGGESTION =
  "This one made no decisions or actions and covered less than half its agenda. Next time, an update in writing might do the job.";

export interface TrendBar {
  meetingId: string;
  title: string;
  date: string | null;
  /** Whole percent, or null for a meeting with no agenda. */
  coverage: number | null;
  decisions: number;
  isCurrent: boolean;
}

const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * The trend along the follow-up chain, oldest first, for the small bar chart. Points without a
 * date keep the server's order. The current meeting is marked so it can be drawn as "this one".
 */
export function trendBars(trend: HealthTrendPoint[], currentId: string): TrendBar[] {
  const dated = trend.map((t, i) => ({ t, i, ms: t.scheduled_start ? Date.parse(t.scheduled_start) : NaN }));
  const allDated = dated.every((d) => Number.isFinite(d.ms));
  const ordered = allDated ? [...dated].sort((a, b) => a.ms - b.ms) : [...dated].reverse();
  return ordered.map(({ t, ms }) => ({
    meetingId: t.meeting_id,
    title: t.title,
    date: Number.isFinite(ms) ? short.format(new Date(ms)) : null,
    coverage: t.coverage === null ? null : Math.round(t.coverage * 100),
    decisions: t.decisions,
    isCurrent: t.meeting_id === currentId,
  }));
}

/** One sentence on where coverage is heading, or null with fewer than two meetings that had an agenda. */
export function trendSummary(bars: TrendBar[]): string | null {
  const withAgenda = bars.filter((b) => b.coverage !== null);
  if (withAgenda.length < 2) return null;
  const first = withAgenda[0].coverage as number;
  const last = withAgenda[withAgenda.length - 1].coverage as number;
  const n = withAgenda.length;
  if (last - first >= 10) return `Agenda coverage is up from ${first}% to ${last}% over the last ${n} meetings.`;
  if (first - last >= 10) return `Agenda coverage is down from ${first}% to ${last}% over the last ${n} meetings.`;
  return `Agenda coverage has held around ${last}% over the last ${n} meetings.`;
}
