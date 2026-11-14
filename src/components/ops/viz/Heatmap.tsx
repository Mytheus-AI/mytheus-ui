"use client";

import { useId, useState } from "react";

const whole = new Intl.NumberFormat("en-US");
const long = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* Daily counts laid out as a calendar: Monday to Sunday across, one row per week. Each day is a
   square on the coral scale (an empty day is the well), today carries an ink ring, and the scale
   is printed under the grid. Hover or focus a day for its date and count; the same numbers sit
   in a visually hidden table. */

export function Heatmap({ days, caption, unit }: { days: { day: string; count: number }[]; caption: string; unit: [string, string] }) {
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();
  if (days.length === 0) return <p className="text-[14px] text-ink-3">Nothing to show yet.</p>;

  const dates = days.map((d) => new Date(`${d.day}T00:00:00Z`));
  const lead = (dates[0].getUTCDay() + 6) % 7; // Monday = 0
  const max = Math.max(0, ...days.map((d) => d.count));
  const step = (c: number) => (c <= 0 || max === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((c / max) * 4))));
  const fill = (s: number) => (s === 0 ? "var(--bg-2)" : `var(--heat-${s})`);
  const word = (v: number) => (v === 1 ? unit[0] : unit[1]);
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...days.map((_, i) => i)];
  while (cells.length % 7) cells.push(null);
  const last = days.length - 1;
  const a = active === null ? null : days[active];

  return (
    <figure className="m-0">
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={caption} aria-describedby={tableId}>
        {WEEKDAYS.map((w) => (
          <span key={w} aria-hidden className="pb-1 text-center text-[12.5px] text-ink-3">
            {w}
          </span>
        ))}
        {cells.map((i, k) =>
          i === null ? (
            <span key={`pad-${k}`} aria-hidden className="aspect-square" />
          ) : (
            <span
              key={days[i].day}
              tabIndex={0}
              aria-label={`${long.format(dates[i])}: ${whole.format(days[i].count)} ${word(days[i].count)}${i === last ? ", today" : ""}`}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={`relative aspect-square rounded-[6px] outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                i === last ? "ring-2 ring-pill ring-offset-2 ring-offset-surface" : ""
              }`}
              style={{ background: fill(step(days[i].count)) }}
            />
          ),
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-[13px] tabular-nums text-ink-3" aria-live="polite">
          {a ? (
            <>
              <span className="font-semibold text-ink">{whole.format(a.count)}</span> {word(a.count)} on {long.format(new Date(`${a.day}T00:00:00Z`))}
            </>
          ) : (
            <>
              {short.format(dates[0])} to {short.format(dates[last])}, today ringed
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3" aria-hidden>
          <span className="mr-1">Fewer</span>
          {[0, 1, 2, 3, 4].map((s) => (
            <span key={s} className="h-3 w-3 rounded-[3px]" style={{ background: fill(s) }} />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>
      <table id={tableId} className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{unit[1]}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.day}>
              <th scope="row">{long.format(dates[i])}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
