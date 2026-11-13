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
