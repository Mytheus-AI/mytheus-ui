"use client";

import { useRef, useState } from "react";
import { fmt } from "@/lib/ops-charts";
import { ChartTip, useWidth } from "@/components/ops/viz/frame";

const whole = new Intl.NumberFormat("en-US");

/* Shares of one total as nested rectangles (squarified, largest top left), one per workspace and
   one "Other" for the tail. Area is the share. Fill states the quota, not identity: ink for a
   workspace inside its quota, amber past 80% and red past 95%, each named in the legend under the
   map, and every number is in the tooltip and the list beside it. A name and share are printed
   inside a tile only when they fit. */

export interface TreeItem {
  key: string;
  label: string;
  value: number;
  state: "ok" | "medium" | "high" | "other";
  /** The tooltip's second line, already worded ("82% of 2M quota"). */
  note?: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Squarified treemap (Bruls, Huizing, van Wijk) over values already sorted largest first. */
function squarify(values: number[], box: Rect): Rect[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return values.map(() => ({ x: box.x, y: box.y, w: 0, h: 0 }));
  const area = values.map((v) => (v / total) * box.w * box.h);
  const out: Rect[] = [];
  let rest = { ...box };
  let i = 0;
  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0);
    const mx = Math.max(...row);
    const mn = Math.min(...row);
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (i < area.length) {
    const side = Math.min(rest.w, rest.h);
    const row = [area[i]];
    let j = i + 1;
    while (j < area.length && worst([...row, area[j]], side) <= worst(row, side)) row.push(area[j++]);
    const sum = row.reduce((a, b) => a + b, 0);
    if (rest.w >= rest.h) {
      const w = sum / rest.h;
      let y = rest.y;
      for (const a of row) {
        out.push({ x: rest.x, y, w, h: a / w });
        y += a / w;
      }
      rest = { x: rest.x + w, y: rest.y, w: rest.w - w, h: rest.h };
    } else {
      const h = sum / rest.w;
      let x = rest.x;
      for (const a of row) {
        out.push({ x, y: rest.y, w: a / h, h });
        x += a / h;
      }
      rest = { x: rest.x, y: rest.y + h, w: rest.w, h: rest.h - h };
    }
    i = j;
  }
  return out;
}

const FILL: Record<TreeItem["state"], string> = {
  ok: "var(--ord-3)",
  other: "var(--ord-1)",
  medium: "var(--priority-medium)",
  high: "var(--priority-high)",
};
/* Text inside a fill is the one exception to "text wears ink": light on the dark fills, dark on
   the light one, so it holds contrast in both themes. */
const TEXT: Record<TreeItem["state"], string> = {
  ok: "text-pill-on",
  other: "text-ink",
  medium: "text-surface",
  high: "text-surface",
};

export function Treemap({ items, caption, height = 300 }: { items: TreeItem[]; caption: string; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box, 720);
  const [active, setActive] = useState<number | null>(null);
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return <p className="text-[14px] text-ink-3">No agent token use recorded this period.</p>;

  const rects = squarify(
    items.map((i) => i.value),
    { x: 0, y: 0, w: width, h: height },
  );
  const share = (v: number) => `${((v / total) * 100).toFixed(v / total < 0.1 ? 1 : 0)}%`;
  const a = active === null ? null : { item: items[active], rect: rects[active] };

  return (
    <figure className="m-0">
      <div ref={box} className="relative" style={{ height }} role="list" aria-label={caption} onPointerLeave={() => setActive(null)}>
        {items.map((it, i) => {
          const r = rects[i];
          if (r.w < 1 || r.h < 1) return null;
          const roomy = r.w > 96 && r.h > 46;
          return (
            <div
              key={it.key}
              role="listitem"
              tabIndex={0}
              aria-label={`${it.label}: ${whole.format(it.value)} tokens, ${share(it.value)} of all${it.note ? `, ${it.note}` : ""}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={`absolute overflow-hidden rounded-[6px] outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                active !== null && active !== i ? "opacity-60" : ""
              }`}
              style={{ left: r.x + 1, top: r.y + 1, width: Math.max(0, r.w - 2), height: Math.max(0, r.h - 2), background: FILL[it.state] }}
            >
              {roomy ? (
                <div className={`px-2.5 py-2 ${TEXT[it.state]}`} aria-hidden>
                  <p className="truncate text-[13px] font-semibold leading-tight">{it.label}</p>
                  <p className="truncate text-[12.5px] tabular-nums leading-tight opacity-85">
                    {fmt(it.value)}, {share(it.value)}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
        {a ? (
          <ChartTip x={a.rect.x + a.rect.w / 2} y={a.rect.y + Math.min(24, a.rect.h / 2)} width={width}>
            <p className="text-[15px] font-semibold text-ink">{a.item.label}</p>
            <p className="text-[12.5px] tabular-nums text-ink-3">
              {whole.format(a.item.value)} tokens, {share(a.item.value)} of all
              {a.item.note ? `, ${a.item.note}` : ""}
            </p>
          </ChartTip>
        ) : null}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-3">
        {(
          [
            ["ok", "Inside quota"],
            ["medium", "Past 80% of quota"],
            ["high", "Past 95% of quota"],
            ["other", "Every other workspace"],
          ] as const
        ).map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-[3px]" style={{ background: FILL[k] }} />
            {l}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
