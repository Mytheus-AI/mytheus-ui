"use client";

import { useMemo, useRef, useState } from "react";
import { DOT_COLS, DOT_ROWS, DOT_STEP, LAND_RUNS, LAT_TOP, LON_LEFT } from "@/components/ops/map/world-dots";
import { ChartTip, useWidth } from "@/components/ops/viz/frame";

const whole = new Intl.NumberFormat("en-US");

/* The world as a field of land dots, with hubs at given coordinates: members by country on the
   overview, a workspace's storage region in its panel. A hub's area grows with its count; its
   short label and count are printed beside it, so size is never the only channel. Pointing at or
   focusing a hub gives its detail. A move request draws the route between two hubs as the
   product's one drawn line: the only place on this map where coral means "this carries
   forward". A hub with a count of 0 is an open ring (a place with nothing there yet).

   The dots are drawn as one path of zero-length strokes with round caps (one element, however
   many dots), on a fixed grid scaled to the card. Server-safe data, client only for hover. */

const CELL = 6;
const VB_W = DOT_COLS * CELL;
const VB_H = DOT_ROWS * CELL;

const project = (lon: number, lat: number) => ({
  x: ((lon - LON_LEFT) / DOT_STEP) * CELL,
  y: ((LAT_TOP - lat) / DOT_STEP) * CELL,
});

let landPath: string | null = null;
function land(): string {
  if (landPath) return landPath;
  const parts: string[] = [];
  LAND_RUNS.forEach((row, r) => {
    if (!row) return;
    const y = r * CELL + CELL / 2;
    for (const run of row.split(";")) {
      const [start, len] = run.split(",").map(Number);
      for (let c = start; c < start + len; c++) parts.push(`M${c * CELL + CELL / 2} ${y}h0`);
    }
  });
  landPath = parts.join("");
  return landPath;
}

export interface MapHub {
  key: string;
  /** Full name for the tooltip and screen readers: "India". */
  label: string;
  /** Printed beside the hub: "IN". */
  short: string;
  lon: number;
  lat: number;
  count: number;
  /** Extra lines for the tooltip, already worded ("12% of members"). */
  detail?: string[];
}

export function RegionMap({
  hubs,
  route,
  caption,
  unit = ["workspace", "workspaces"],
  highlight,
  onHighlight,
  compact = false,
}: {
  hubs: MapHub[];
  /** A requested move, drawn from one hub to another, by key. */
  route?: { from: string; to: string } | null;
  caption: string;
  /** What a hub counts, singular and plural. */
  unit?: [string, string];
  /** A hub highlighted from outside (the list beside the map). */
  highlight?: string | null;
  onHighlight?: (key: string | null) => void;
  /** The small map in a workspace's panel: one size of hub, no counts printed. */
  compact?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box, 720);
  const [own, setOwn] = useState<string | null>(null);
  const active = highlight ?? own;
  const set = (k: string | null) => {
    setOwn(k);
    onHighlight?.(k);
  };

  const max = Math.max(1, ...hubs.map((h) => h.count));
  const radius = (n: number) => (compact ? 9 : 6 + 18 * Math.sqrt(n / max));
  const scale = width / VB_W;
  const path = useMemo(land, []);
  const word = (n: number) => (n === 1 ? unit[0] : unit[1]);
  const byKey = new Map(hubs.map((h) => [h.key, h]));

  const routeD = useMemo(() => {
    const from = route ? hubs.find((h) => h.key === route.from) : null;
    const to = route ? hubs.find((h) => h.key === route.to) : null;
    if (!from || !to) return null;
    const a = project(from.lon, from.lat);
    const b = project(to.lon, to.lat);
    const lift = Math.min(150, Math.abs(b.x - a.x) * 0.32);
    return `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - lift} ${b.x} ${b.y}`;
  }, [route, hubs]);

  const tip = active ? byKey.get(active) ?? null : null;
  const tipAt = tip ? project(tip.lon, tip.lat) : null;
  // Smaller hubs drawn last, so a small country beside a large one stays reachable.
  const drawn = [...hubs].sort((a, b) => b.count - a.count);
  const fontSize = (compact ? 13 : 13.5) / scale;
  // A label goes right of its hub unless another hub sits where it would land; then it goes left.
  // Labels are drawn after every hub, so no hub ever covers one.
  const labels = drawn.map((h) => {
    const p = project(h.lon, h.lat);
    const r = radius(h.count);
    const text = compact ? h.short : `${h.short}  ${whole.format(h.count)}`;
    const w = text.length * fontSize * 0.62 + r + 10;
    const crowded = hubs.some((o) => {
      if (o.key === h.key) return false;
      const q = project(o.lon, o.lat);
      return q.x > p.x && q.x - radius(o.count) < p.x + w && Math.abs(q.y - p.y) < radius(o.count) + fontSize;
    });
    return { h, p, r, left: crowded };
  });

  return (
    <figure className="m-0">
      <div ref={box} className="relative" onPointerLeave={() => set(null)}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="block h-auto" role="img" aria-label={caption}>
          <path d={path} stroke="var(--land)" strokeWidth={CELL * 0.52} strokeLinecap="round" fill="none" />
          {routeD ? (
            <path d={routeD} pathLength={1} className="ops-route" fill="none" stroke="var(--signal-line)" strokeWidth={2.2 / scale} strokeLinecap="round" />
          ) : null}
          {drawn.map((h) => {
            const p = project(h.lon, h.lat);
            const r = radius(h.count);
            const on = active === h.key;
            const empty = h.count === 0;
            return (
              <g
                key={h.key}
                tabIndex={0}
                role="button"
                aria-label={`${h.label}: ${compact ? "" : `${whole.format(h.count)} ${word(h.count)}${h.detail?.length ? ", " : ""}`}${h.detail?.join(", ") ?? ""}`}
                onPointerEnter={() => set(h.key)}
                onFocus={() => set(h.key)}
                onBlur={() => set(null)}
                className="cursor-default outline-none [&:focus-visible_.ops-hub-focus]:opacity-100"
              >
                <circle cx={p.x} cy={p.y} r={r + 9} fill="transparent" />
                <circle className="ops-hub-ring" cx={p.x} cy={p.y} r={r + 5} fill="var(--pill)" fillOpacity={on ? 0.14 : 0.07} />
                <circle cx={p.x} cy={p.y} r={r} fill={empty ? "var(--surface)" : "var(--pill)"} stroke={empty ? "var(--ink-4)" : "var(--surface)"} strokeWidth={2 / scale} />
                <circle className="ops-hub-focus opacity-0" cx={p.x} cy={p.y} r={r + 8} fill="none" stroke="var(--signal)" strokeWidth={2 / scale} />
              </g>
            );
          })}
          <g aria-hidden className="pointer-events-none">
            {labels.map(({ h, p, r, left }) => (
              <text
                key={h.key}
                x={left ? p.x - r - 10 : p.x + r + 10}
                y={p.y}
                dy="0.35em"
                textAnchor={left ? "end" : "start"}
                fontSize={fontSize}
                fontWeight={600}
                fill="var(--ink)"
                paintOrder="stroke"
                stroke="var(--surface)"
                strokeWidth={4 / scale}
                strokeLinejoin="round"
              >
                {h.short}
                {compact ? null : <tspan fontWeight={400} fill="var(--ink-3)">{`  ${whole.format(h.count)}`}</tspan>}
              </text>
            ))}
          </g>
        </svg>
        {tip && tipAt ? (
          <ChartTip x={tipAt.x * scale} y={(tipAt.y - radius(tip.count)) * scale} width={width}>
            <p className="text-[15px] font-semibold text-ink">{tip.label}</p>
            <p className="text-[12.5px] tabular-nums text-ink-3">
              {compact ? tip.detail?.join(", ") : `${whole.format(tip.count)} ${word(tip.count)}${tip.detail?.length ? `, ${tip.detail.join(", ")}` : ""}`}
            </p>
          </ChartTip>
        ) : null}
      </div>
    </figure>
  );
}
