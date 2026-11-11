/**
 * The company time machine, as pure helpers (tested under `node --test`): the date scrubber's
 * arithmetic, the presets, the month ticks, and the URL state of the page.
 *
 * Dates are whole UTC days written `YYYY-MM-DD` everywhere, the same as the API's `as_of`, so a
 * shared link reads the same for everyone.
 */

export type Mode = "as-of" | "compare" | "topic";
export const MODES: { key: Mode; label: string }[] = [
  { key: "as-of", label: "As of a date" },
  { key: "compare", label: "Compare two dates" },
  { key: "topic", label: "Follow a topic" },
];

const DAY = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(v: unknown): v is string {
  return typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

export function toDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, n: number): string {
  return toDay(dayMs(iso) + n * DAY);
}

export function addMonths(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toDay(d.getTime());
}

export function daysBetween(a: string, b: string): number {
  return Math.round((dayMs(b) - dayMs(a)) / DAY);
}

export function clampDay(iso: string, min: string, max: string): string {
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
}

/** The scrubber's range: from the first thing on record (or a year back) to today. */
export function scrubRange(earliest: string | null | undefined, today: string): { min: string; max: string; span: number } {
  const floor = addMonths(today, -12);
  const min = isDate(earliest) && earliest < today ? (earliest < floor ? earliest : floor) : floor;
  return { min, max: today, span: Math.max(1, daysBetween(min, today)) };
}

/** Presets for the "as of" date, nearest first. */
export function presets(today: string): { label: string; date: string }[] {
  return [
    { label: "Today", date: today },
    { label: "A month ago", date: addMonths(today, -1) },
    { label: "A quarter ago", date: addMonths(today, -3) },
    { label: "Six months ago", date: addMonths(today, -6) },
    { label: "A year ago", date: addMonths(today, -12) },
  ];
}

const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function longDate(iso: string): string {
  return longDay.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export function shortDate(iso: string): string {
  return shortDay.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

/** Month ticks under the scrubber: at most `maxTicks`, as a fraction of the track (0..1). The
    first tick and every tick that starts a new year carry the year ("Dec 2025", "Feb 2026"). */
export function monthTicks(min: string, max: string, maxTicks = 7): { at: number; label: string }[] {
  const span = Math.max(1, daysBetween(min, max));
  const first = new Date(`${min}T00:00:00Z`);
  first.setUTCDate(1);
  first.setUTCMonth(first.getUTCMonth() + 1);
  const all: { at: number; d: Date }[] = [];
  for (let d = first; toDay(d.getTime()) <= max; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    all.push({ at: daysBetween(min, toDay(d.getTime())) / span, d });
  }
  const step = Math.max(1, Math.ceil(all.length / maxTicks));
  const kept = all.filter((_, i) => i % step === 0);
  let year = -1;
  return kept.map(({ at, d }) => {
    const y = d.getUTCFullYear();
    const label = y !== year ? monthYear.format(d) : monthShort.format(d);
    year = y;
    return { at, label };
  });
}

export type TimeMachineState = { mode: Mode; asOf: string; from: string; to: string; topic: string };

/** The page's state from its search params, defaulted and clamped to the past. */
export function readState(params: Record<string, string | string[] | undefined>, today: string): TimeMachineState {
  const one = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const mode = (["as-of", "compare", "topic"] as const).find((m) => m === one("mode")) ?? "as-of";
  const past = (v: string | undefined, fallback: string) => (isDate(v) && v <= today ? v : fallback);
  let from = past(one("from"), addMonths(today, -3));
  let to = past(one("to"), today);
  if (from > to) [from, to] = [to, from];
  const topic = (one("topic") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return { mode, asOf: past(one("as_of"), today), from, to, topic };
}

/** The same state as a query string (only what differs from the defaults is written). */
export function writeState(s: TimeMachineState, today: string): string {
  const q = new URLSearchParams();
  if (s.mode !== "as-of") q.set("mode", s.mode);
  if (s.mode === "as-of" && s.asOf !== today) q.set("as_of", s.asOf);
  if (s.mode !== "as-of") {
    q.set("from", s.from);
    q.set("to", s.to);
  }
  if (s.topic) q.set("topic", s.topic);
  const str = q.toString();
  return str ? `?${str}` : "";
}

/** "3 new decisions" / "1 new decision". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Suggestions under the topic box: the words that recur in the decisions on screen. */
export function topicSuggestions(texts: string[], limit = 6): string[] {
  const stop = new Set(
    "the a an and or of to in on for by with from this that will should we our it is be are was at as into than then all any per not new use make move keep plan team".split(" "),
  );
  const counts = new Map<string, number>();
  for (const t of texts) {
    const seen = new Set<string>();
    for (const w of t.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []) {
      if (stop.has(w) || seen.has(w)) continue;
      seen.add(w);
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([w]) => w);
}
