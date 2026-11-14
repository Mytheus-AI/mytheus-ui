"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";

/* Shared pieces of the ops charts: a width measured from the chart's own box (so SVG marks are
   drawn in real pixels and a 2px line stays 2px), and the one tooltip every chart uses. */

/** The element's content width, following resizes; `fallback` until the first measure. */
export function useWidth(ref: RefObject<HTMLElement>, fallback: number): number {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(120, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** The chart tooltip: a small card above the point, nudged inward near either edge. `x` is the
    anchor in px from the chart's left; `width` the chart's width, so it never spills out. */
export function ChartTip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const side = x < width * 0.25 ? "-12%" : x > width * 0.75 ? "-88%" : "-50%";
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-ctl border border-line bg-surface px-3 py-2 shadow-warm-2"
      style={{ left: x, top: y, transform: `translate(${side}, calc(-100% - 10px))` }}
    >
      {children}
    </div>
  );
}

/** The tooltip's two lines: the figure (with its unit) and what it is. */
export function TipBody({ value, unit, title }: { value: string; unit?: string; title: string }) {
  return (
    <>
      <p className="text-[15px] font-semibold tabular-nums text-ink">
        {value} {unit ? <span className="font-normal text-ink-3">{unit}</span> : null}
      </p>
      <p className="text-[12.5px] text-ink-3">{title}</p>
    </>
  );
}
