"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { fmt, type ColumnPoint } from "@/lib/ops-charts";
import { ChartTip, TipBody, useWidth } from "@/components/ops/viz/frame";

const whole = new Intl.NumberFormat("en-US");

/* One series over time as a line with a quiet wash under it. The line is the de-emphasis ink;
   the current period is the one coral point. Pointer or arrow keys move a crosshair that reads
   out each point; the same numbers sit in a visually hidden table. */

const PAD = { top: 14, right: 14, bottom: 30, left: 44 };

/** A clean top for the axis, close above the largest value (298 tops at 300, not 500). */
function axisTop(v: number): number {
  if (!Number.isFinite(v) || v <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10].find((s) => s * p >= v * 1.04) ?? 10;
  return step * p;
}

export function AreaChart({
  points,
  caption,
  unit,
  height = 232,
}: {
  points: ColumnPoint[];
  caption: string;
  /** The counted thing, singular and plural. */
  unit: [string, string];
  height?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box, 720);
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();
  const gradId = useId().replace(/:/g, "");

  const n = points.length;
  if (n === 0) return <p className="text-[14px] text-ink-3">Nothing to show yet.</p>;

  const top = axisTop(Math.max(0, ...points.map((p) => p.value)));
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => PAD.top + plotH * (1 - v / top);
  const base = PAD.top + plotH;
  const word = (v: number) => (v === 1 ? unit[0] : unit[1]);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`;
  const ticks = [top, top / 2, 0];
  const labels = Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));

  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const step = n === 1 ? plotW : plotW / (n - 1);
    setActive(Math.min(n - 1, Math.max(0, Math.round((clientX - r.left - PAD.left) / step))));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => Math.min(n - 1, Math.max(0, (a ?? n - 1) + d)));
    } else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
  };

  const a = active === null ? null : points[active];
  return (
    <figure className="m-0">
      <div
        ref={box}
        className="relative rounded-ctl outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label={`${caption}. Use the arrow keys to read each point.`}
        aria-describedby={tableId}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--pill)" stopOpacity="0.12" />
              <stop offset="1" stopColor="var(--pill)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--line-2)" : "var(--line)"} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12.5} fill="var(--ink-3)" className="tabular-nums">
                {fmt(t)}
              </text>
            </g>
          ))}
          {labels.map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={12.5} fill="var(--ink-3)">
              {points[i].label}
            </text>
          ))}
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke="var(--pill)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active !== null ? (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={base} stroke="var(--line-2)" strokeWidth={1} shapeRendering="crispEdges" />
          ) : null}
          {active !== null && active !== n - 1 ? (
            <circle cx={x(active)} cy={y(points[active].value)} r={4.5} fill="var(--pill)" stroke="var(--surface)" strokeWidth={2} />
          ) : null}
          <circle cx={x(n - 1)} cy={y(points[n - 1].value)} r={active === n - 1 ? 6 : 4.5} fill="var(--signal)" stroke="var(--surface)" strokeWidth={2} />
        </svg>
        {a && active !== null ? (
          <ChartTip x={x(active)} y={y(a.value)} width={width}>
            <TipBody value={whole.format(a.value)} unit={word(a.value)} title={active === n - 1 ? `${a.title}, so far` : a.title} />
          </ChartTip>
        ) : null}
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
