/* Calendar helpers for the meetings hub. All of these work on local calendar days, and the hub
   only calls them after mount, so server and browser time zones can never disagree in markup. */

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Whole calendar days from `b` to `a`, immune to daylight-saving shifts. */
export function dayDiff(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ua - ub) / 86_400_000);
}

export function mondayOf(d: Date): Date {
  return addDays(startOfDay(d), -((d.getDay() + 6) % 7));
}

export function shortDate(d: Date): string {
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function formatTime(d: Date): string {
  return timeFormat.format(d);
}

/** Group heading: a relative word when there is one, otherwise the weekday and date. */
export function dayLabel(d: Date, today: Date): { primary: string; secondary: string } {
  const diff = dayDiff(d, today);
  const full = `${WEEKDAYS[d.getDay()]}, ${shortDate(d)}`;
  if (diff === 0) return { primary: "Today", secondary: full };
  if (diff === 1) return { primary: "Tomorrow", secondary: full };
  if (diff === -1) return { primary: "Yesterday", secondary: full };
  return {
    primary: full,
    secondary: diff > 0 ? `In ${diff} days` : `${-diff} days ago`,
  };
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
