/* Number formatting and series shaping for the ops charts. Kept out of the "use client" chart
   module so server pages can call them: a function exported from a client module is a client
   reference on the server, and calling it there throws. */

const whole = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmt = (n: number) => (Math.abs(n) >= 10_000 ? compact.format(n) : whole.format(n));

export interface ColumnPoint {
  /** Short axis label, e.g. "Nov 10". */
  label: string;
  /** Long label for the tooltip and the table, e.g. "Week of Nov 10". */
  title: string;
  value: number;
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Weekly counts as column points ("Nov 10" / "Week of Nov 10"). */
export function weekPoints(rows: { week: string; count: number }[]): ColumnPoint[] {
  return rows.map((r) => {
    const d = new Date(`${r.week}T00:00:00Z`);
    const label = Number.isNaN(d.getTime()) ? r.week : shortDate.format(d);
    return { label, title: `Week of ${label}`, value: Number(r.count) || 0 };
  });
}

/** Daily counts as column points ("Nov 10"). */
export function dayPoints(rows: { day: string; count: number }[]): ColumnPoint[] {
  return rows.map((r) => {
    const d = new Date(`${r.day}T00:00:00Z`);
    const label = Number.isNaN(d.getTime()) ? r.day : shortDate.format(d);
    return { label, title: label, value: Number(r.count) || 0 };
  });
}

/** "November 2026" from a billing period "2026-11"; the input itself when it does not parse. */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export interface Change {
  /** Signed difference between the last two points. */
  diff: number;
  /** The previous point's value, for the sentence ("from 12"). */
  from: number;
  /** "up", "down" or "flat"; null when there is no earlier point to compare with. */
  direction: "up" | "down" | "flat";
}

/** The change from the second-to-last point to the last, or null with fewer than two points. */
export function lastChange(points: { value: number }[]): Change | null {
  if (points.length < 2) return null;
  const now = points[points.length - 1].value;
  const from = points[points.length - 2].value;
  const diff = now - from;
  return { diff, from, direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat" };
}

/** Where each data-residency region sits on the map (a point inside the region, not a data
    centre's address: the console knows the region code and the cell, nothing finer). */
export const REGION_PLACES: Record<string, { label: string; short: string; lon: number; lat: number }> = {
  us: { label: "United States", short: "US", lon: -97, lat: 39 },
  eu: { label: "European Union", short: "EU", lon: 9, lat: 50 },
  ap: { label: "Asia Pacific", short: "AP", lon: 112, lat: 8 },
};

export const regionLabel = (code: string) => REGION_PLACES[code]?.label ?? (code === "unplaced" ? "No region recorded" : code.toUpperCase());

/** Plan codes in rank order (billing's `plans.code`, plus "none"), mapped onto the four-step
    ordinal scale: no plan is the lightest step, enterprise the darkest. */
const PLAN_ORDER = ["none", "free", "pro", "enterprise"];
export const planRank = (plan: string) => {
  const i = PLAN_ORDER.indexOf(plan.toLowerCase());
  return i === -1 ? PLAN_ORDER.length : i;
};
export const planFill = (plan: string) => `var(--ord-${Math.min(planRank(plan), 3) + 1})`;
export const planLabel = (plan: string) => (plan === "none" ? "No plan" : plan.charAt(0).toUpperCase() + plan.slice(1));
