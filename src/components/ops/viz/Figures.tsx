import type { ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { fmt, type Change } from "@/lib/ops-charts";
import { Sparkline } from "@/components/ops/viz/Sparkline";

/* The figure pieces of the ops console, all server-safe:
   - KpiStrip: the page's headline figures in one card, split by hairlines (not a row of
     identical boxes), each with an optional change and trend.
   - QuotaMeter / QuotaList: a figure against its limit, with ticks at 80% and 95%.
   - LatencyPlot: each service's response time as a dot on one shared scale. */

const whole = new Intl.NumberFormat("en-US");

export interface Kpi {
  label: string;
  value: ReactNode;
  /** Quiet context under the figure. */
  hint?: ReactNode;
  /** The last change, worded by `unit`: "3 more than last week". */
  change?: Change | null;
  changeUnit?: string;
  trend?: number[];
}

function ChangeLine({ change, unit }: { change: Change; unit: string }) {
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : ArrowRight;
  const n = Math.abs(change.diff);
  const text = change.direction === "flat" ? `Same as last ${unit}` : `${whole.format(n)} ${change.direction === "up" ? "more" : "fewer"} than last ${unit}`;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={14} weight="bold" aria-hidden className={change.direction === "flat" ? "text-ink-4" : "text-ink-2"} />
      {text}
    </span>
  );
}

export function KpiStrip({ items, label }: { items: Kpi[]; label: string }) {
  const cols = items.length >= 5 ? "lg:grid-cols-5" : items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <section aria-label={label} className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <dl className={`m-0 grid grid-cols-1 min-[480px]:grid-cols-2 ${cols}`}>
        {items.map((k) => (
          <div
            key={k.label}
            className="flex min-w-0 flex-col gap-1 border-line px-4 py-[18px] sm:px-[22px] [&:not(:last-child)]:border-b min-[480px]:[&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:not(:last-child)]:border-r"
          >
            <dt className="truncate text-[13px] font-semibold text-ink-3">{k.label}</dt>
            <dd className="m-0 flex items-end justify-between gap-3">
              <span className="display shrink-0 text-[32px] leading-none text-ink">{k.value}</span>
              {/* the trend gives way first: in a narrow cell its oldest weeks are cut, never the figure */}
              {k.trend && k.trend.length > 1 ? (
                <span className="flex min-w-0 justify-end overflow-hidden">
                  <Sparkline values={k.trend} />
                </span>
              ) : null}
            </dd>
            {k.change || k.hint ? (
              <dd className="m-0 mt-1 truncate text-[13px] text-ink-3">{k.change ? <ChangeLine change={k.change} unit={k.changeUnit ?? "week"} /> : k.hint}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

const severity = (ratio: number) => (ratio >= 0.95 ? "high" : ratio >= 0.8 ? "medium" : "ok");

/** One figure against a limit: the fill carries severity, ticks mark 80% and 95%, the figure and
    share are always printed. */
export function QuotaMeter({ name, value, quota }: { name: string; value: number; quota: number | null }) {
  const ratio = quota ? value / quota : null;
  const s = ratio === null ? "ok" : severity(ratio);
  const fill = s === "high" ? "bg-priority-high" : s === "medium" ? "bg-priority-medium" : "bg-pill";
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="flex min-w-0 items-center gap-1.5">
          {s !== "ok" ? (
            <WarningCircle size={15} weight="fill" aria-hidden className={s === "high" ? "shrink-0 text-priority-high" : "shrink-0 text-priority-medium"} />
          ) : null}
          <span className="min-w-0 truncate text-[14px] font-semibold text-ink">{name}</span>
        </span>
        <span className="shrink-0 text-[14px] tabular-nums text-ink-2">
          <span className="font-semibold text-ink">{fmt(value)}</span>
          {quota ? (
            <>
              {" "}
              of {fmt(quota)} <span className="ml-1 text-ink-3">{Math.round((ratio ?? 0) * 100)}%</span>
            </>
          ) : (
            <span className="ml-1.5 text-ink-3">no quota</span>
          )}
        </span>
      </div>
      {ratio !== null ? (
        <div
          className="relative h-2 rounded-full bg-bg-2"
          role="meter"
          aria-label={`${name} agent tokens used`}
          aria-valuemin={0}
          aria-valuemax={quota ?? 0}
          aria-valuenow={Math.min(value, quota ?? value)}
          aria-valuetext={`${Math.round(ratio * 100)}% of quota${s === "high" ? ", past 95%" : s === "medium" ? ", past 80%" : ""}`}
        >
          <div className={`h-full rounded-full ${fill} ${value > 0 ? "min-w-2" : ""}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
          {[0.8, 0.95].map((t) => (
            <span key={t} aria-hidden className="absolute -top-[3px] h-3.5 w-[2px] rounded-full bg-ink-4 ring-2 ring-surface" style={{ left: `${t * 100}%` }} />
          ))}
        </div>
      ) : (
        <div className="h-2 rounded-full bg-bg-2" aria-hidden />
      )}
    </div>
  );
}

export function QuotaList({ rows, empty }: { rows: { key: string; name: string; value: number; quota: number | null }[]; empty: string }) {
  if (rows.length === 0) return <p className="text-[14px] text-ink-3">{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {rows.map((r) => (
        <li key={r.key}>
          <QuotaMeter name={r.name} value={r.value} quota={r.quota} />
        </li>
      ))}
    </ul>
  );
}

export interface Probe {
  service: string;
  up: boolean;
  /** null when the service did not answer, or for the ops service itself. */
  ms: number | null;
  note?: string;
  /** Why a down service failed ("ConnectTimeout"), printed along its track. */
  detail?: string | null;
}

/** Every service on one latency scale: a dot at its response time, with the 2 second probe limit
    as the end of the scale. A service that did not answer shows a word and an icon instead. */
export function LatencyPlot({ probes, limitMs = 2000 }: { probes: Probe[]; limitMs?: number }) {
  const slowest = Math.max(0, ...probes.map((p) => p.ms ?? 0));
  const top = slowest > limitMs / 2 ? limitMs : slowest > 400 ? 1000 : slowest > 200 ? 500 : slowest > 100 ? 250 : 100;
  const ticks = [0, top / 2, top];
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)_5.5rem] items-center gap-x-4 max-sm:grid-cols-[minmax(0,1fr)_5.5rem]">
        <span aria-hidden className="max-sm:hidden" />
        <div aria-hidden className="relative h-5 text-[12.5px] tabular-nums text-ink-3 max-sm:hidden">
          {ticks.map((t, i) => (
            <span key={t} className="absolute top-0 whitespace-nowrap" style={{ left: `${(t / top) * 100}%`, transform: i === 0 ? "none" : i === 2 ? "translateX(-100%)" : "translateX(-50%)" }}>
              {whole.format(t)} ms
            </span>
          ))}
        </div>
        <span aria-hidden />
      </div>
      <ul className="m-0 list-none divide-y divide-line p-0">
        {probes.map((p) => (
          <li key={p.service} className="grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)_4.5rem] items-center gap-x-4 py-2.5 max-sm:grid-cols-[minmax(0,1fr)_4.5rem]">
            <span className="flex min-w-0 items-center gap-2">
              {p.up ? (
                <CheckCircle size={16} weight="fill" className="shrink-0 text-ok" aria-hidden />
              ) : (
                <WarningCircle size={16} weight="fill" className="shrink-0 text-priority-high" aria-hidden />
              )}
              <span className="min-w-0 truncate font-mono text-[13.5px] text-ink">{p.service}</span>
              <span className="sr-only">{p.up ? "up" : "down"}</span>
            </span>
            <span className="relative h-4 max-sm:hidden" aria-hidden>
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
              {[0.5, 1].map((t) => (
                <span key={t} className="absolute top-0 h-4 w-px bg-line" style={{ left: `${t * 100}%` }} />
              ))}
              {!p.up ? (
                <span className="absolute inset-y-0 left-0 flex items-center bg-surface pr-2 text-[13px] text-priority-high">{p.detail ? `No answer, ${p.detail}` : "No answer"}</span>
              ) : null}
              {p.up && p.ms !== null ? (
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pill ring-2 ring-surface"
                  style={{ left: `${Math.min(1, p.ms / top) * 100}%` }}
                />
              ) : null}
            </span>
            <span className={`text-right text-[13.5px] tabular-nums ${p.up ? "text-ink-2" : "font-semibold text-priority-high"}`}>
              {p.note ?? (p.up ? (p.ms === null ? "" : `${whole.format(p.ms)} ms`) : "Down")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
