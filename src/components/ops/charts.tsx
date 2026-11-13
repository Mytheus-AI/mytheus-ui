"use client";

import { useId, useState } from "react";
import { niceMax } from "@/lib/ops";
import { fmt, type ColumnPoint } from "@/lib/ops-charts";

const whole = new Intl.NumberFormat("en-US");

/* The ops console's charts, in plain HTML on the token layer (no chart library).

   Every chart here is one series, so there is no legend: the card title names what is plotted.
   Marks follow one rule set: columns at most 24px wide with a 4px rounded top and a square foot on
   one hairline baseline, a 2px gap between neighbours, the de-emphasis ink (`--pill`) for history
   and the accent (`--signal`) for the current period only. Text is never the mark's colour.
   Hover or keyboard focus on a column shows its value; the same numbers sit in a visually hidden
   table, so nothing is reachable only by pointer. */

export function ColumnChart({
  points,
  caption,
  unit,
  height = 152,
  accentLast = true,
}: {
  points: ColumnPoint[];
  /** What the chart shows, for the hidden table's caption. */
  caption: string;
  /** The counted thing, singular and plural: ["meeting", "meetings"]. */
  unit: [string, string];
  height?: number;
  accentLast?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();
  const top = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const n = points.length;
  const ticks = n > 0 ? Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1])) : [];
  const word = (v: number) => (v === 1 ? unit[0] : unit[1]);

  if (n === 0) return <p className="text-[14px] text-ink-3">Nothing to show yet.</p>;

  return (
    <figure className="m-0">
      <div className="flex gap-3">
        {/* y axis: the clean top and zero, in muted ink */}
        <div className="flex shrink-0 flex-col justify-between text-right text-[12.5px] tabular-nums text-ink-3" style={{ height }} aria-hidden>
          <span className="-translate-y-1/2">{fmt(top)}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          {/* gridlines: hairline, solid, recessive */}
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-line" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-line" aria-hidden />
          <div
            className="relative flex items-end gap-[2px] border-b border-line-2"
            style={{ height }}
            role="group"
            aria-label={caption}
            aria-describedby={tableId}
            onMouseLeave={() => setActive(null)}
          >
            {points.map((p, i) => {
              const h = p.value > 0 ? Math.max(3, (p.value / top) * height) : 0;
              const current = accentLast && i === n - 1;
              return (
                <div
                  key={`${p.label}-${i}`}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                  tabIndex={0}
                  aria-label={`${p.title}: ${whole.format(p.value)} ${word(p.value)}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <div
                    className={`w-full max-w-[24px] rounded-t-[4px] transition-opacity duration-150 group-focus-visible:ring-2 group-focus-visible:ring-signal ${
                      current ? "bg-signal" : "bg-pill"
                    } ${active !== null && active !== i ? "opacity-40" : ""}`}
                    style={{ height: h }}
                  />
                  {active === i ? (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-ctl border border-line bg-surface px-3 py-2 shadow-warm-2"
                      style={{ bottom: Math.min(h + 8, height - 8), left: "50%", transform: `translateX(${i < n / 3 ? "-15%" : i > (2 * n) / 3 ? "-85%" : "-50%"})` }}
                    >
                      <p className="text-[15px] font-semibold tabular-nums text-ink">
                        {whole.format(p.value)} <span className="font-normal text-ink-3">{word(p.value)}</span>
                      </p>
                      <p className="text-[12.5px] text-ink-3">{p.title}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {/* x axis: first, middle and last labels only */}
          <div className="relative mt-2 h-4 text-[12.5px] text-ink-3" aria-hidden>
            {ticks.map((i) => (
              <span
                key={i}
                className="absolute whitespace-nowrap"
                style={{
                  left: `${((i + 0.5) / n) * 100}%`,
                  transform: i === 0 ? "translateX(-25%)" : i === n - 1 ? "translateX(-75%)" : "translateX(-50%)",
                }}
              >
                {points[i].label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <table id={tableId} className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">{unit[1]}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={`${p.title}-${i}`}>
              <th scope="row">{p.title}</th>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Quiet text after the value, e.g. "of 200K" or "42%". */
  note?: string;
  /** Optional fill share 0..1 when the bar is a share of something other than the max. */
  share?: number;
  /** A state, never an identity: "medium" past 80% of a quota, "high" past 95%. */
  tone?: "default" | "medium" | "high";
}

/** A ranked list as horizontal bars: label on the left, the value at the bar's tip. */
export function BarList({ items, caption, empty = "Nothing to show yet." }: { items: BarItem[]; caption: string; empty?: string }) {
  if (items.length === 0) return <p className="text-[14px] text-ink-3">{empty}</p>;
  const top = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="m-0 flex list-none flex-col gap-3.5 p-0" aria-label={caption}>
      {items.map((item) => {
        const share = item.share ?? item.value / top;
        const fill = item.tone === "high" ? "bg-priority-high" : item.tone === "medium" ? "bg-priority-medium" : "bg-pill";
        return (
          <li key={item.key} className="min-w-0">
            <div className="mb-1.5 flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-[14px] font-semibold text-ink">{item.label}</span>
              <span className="shrink-0 text-[14px] tabular-nums text-ink-2">
                <span className="font-semibold text-ink">{fmt(item.value)}</span>
                {item.note ? <span className="ml-1.5 text-ink-3">{item.note}</span> : null}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg-2" aria-hidden>
              <div className={`h-full rounded-full ${fill} ${item.value > 0 ? "min-w-2" : ""}`} style={{ width: `${Math.min(1, Math.max(0, share)) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** One figure against a limit. The fill carries severity; the figure is always printed. */
export function Meter({ value, max, label }: { value: number; max: number | null; label: string }) {
  if (!max || max <= 0) {
    return (
      <p className="text-[14px] text-ink-2">
        <span className="font-semibold tabular-nums text-ink">{fmt(value)}</span> <span className="text-ink-3">no quota set</span>
      </p>
    );
  }
  const ratio = value / max;
  const fill = ratio >= 0.95 ? "bg-priority-high" : ratio >= 0.8 ? "bg-priority-medium" : "bg-pill";
  return (
    <div>
      <p className="mb-1.5 text-[14px] tabular-nums text-ink-2">
        <span className="font-semibold text-ink">{fmt(value)}</span> of {fmt(max)} <span className="ml-1.5 text-ink-3">{Math.round(ratio * 100)}%</span>
      </p>
      <div
        className="h-2.5 rounded-full bg-bg-2"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        aria-valuetext={`${Math.round(ratio * 100)}% of quota`}
      >
        <div className={`h-full rounded-full ${fill} ${value > 0 ? "min-w-2.5" : ""}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
    </div>
  );
}
