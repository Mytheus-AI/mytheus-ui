"use client";

import { useState } from "react";
import { AreaChart } from "@/components/ops/viz/AreaChart";
import type { ColumnPoint } from "@/lib/ops-charts";

/* The overview's main chart: one weekly series at a time, switched by a two-way control in the
   card head, so two measures of different size never share one axis. */

type Series = { key: string; label: string; caption: string; unit: [string, string]; points: ColumnPoint[] };

export function TrendPanel({ series, title, description }: { series: Series[]; title?: string; description?: string }) {
  const [key, setKey] = useState(series[0]?.key ?? "");
  const s = series.find((x) => x.key === key) ?? series[0];
  if (!s) return null;
  return (
    <section aria-labelledby="trend-heading" className="flex min-w-0 flex-col rounded-card border border-line bg-surface shadow-warm-1">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 pb-2 pt-[18px] sm:px-[22px]">
        <div className="min-w-0 flex-[1_1_14rem]">
          <h2 id="trend-heading" className="text-[17px] font-semibold leading-snug text-ink">
            {title ?? `${s.label} per week`}
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-3">{description ?? "Last 12 weeks across every workspace. This week, so far, in coral."}</p>
        </div>
        {series.length > 1 ? (
        <div role="group" aria-label="Show" className="flex shrink-0 gap-0.5 rounded-ctl bg-bg-2 p-1">
          {series.map((x) => (
            <button
              key={x.key}
              type="button"
              aria-pressed={x.key === s.key}
              onClick={() => setKey(x.key)}
              className={`h-9 rounded-[9px] px-3 text-[13.5px] font-semibold transition-colors duration-150 ${
                x.key === s.key ? "bg-surface text-ink shadow-warm-1" : "text-ink-3 hover:text-ink"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        ) : null}
      </div>
      <div className="px-3 pb-4 sm:px-[18px]">
        <AreaChart key={s.key} points={s.points} caption={s.caption} unit={s.unit} />
      </div>
    </section>
  );
}
