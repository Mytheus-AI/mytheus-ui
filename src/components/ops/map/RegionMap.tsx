"use client";

import { useMemo, useRef, useState } from "react";
import { REGION_PLACES, regionLabel } from "@/lib/ops-charts";
import { DOT_COLS, DOT_ROWS, DOT_STEP, LAND_RUNS, LAT_TOP, LON_LEFT } from "@/components/ops/map/world-dots";
import { ChartTip, useWidth } from "@/components/ops/viz/frame";

const whole = new Intl.NumberFormat("en-US");

/* The world as a field of land dots, with one hub per data-residency region. A hub's area grows
   with the workspaces it holds; its code and count are printed beside it, so size is never the
   only channel. Pointing at or focusing a hub gives its detail. A move request draws the route
   from where the data lives to where it is asked to go, as the product's one drawn line: the
   only place on this map where coral means "this carries forward".

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
  region: string;
  workspaces: number;
  /** Extra lines for the tooltip, already worded ("12 members"). */
  detail?: string[];
}

export function RegionMap({
  hubs,
  route,
  caption,
  highlight,
  onHighlight,
  compact = false,
}: {
  hubs: MapHub[];
  /** A requested move, drawn from one region to another. */
  route?: { from: string; to: string } | null;
  caption: string;
  /** A region highlighted from outside (the list beside the map). */
  highlight?: string | null;
  onHighlight?: (region: string | null) => void;
  /** The small map in a workspace's panel: smaller labels, no counts. */
  compact?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box, 720);
  const [own, setOwn] = useState<string | null>(null);
  const active = highlight ?? own;
  const set = (r: string | null) => {
    setOwn(r);
    onHighlight?.(r);
  };

  const placed = hubs.filter((h) => REGION_PLACES[h.region]);
  const max = Math.max(1, ...placed.map((h) => h.workspaces));
  const radius = (n: number) => (compact ? 9 : 7 + 17 * Math.sqrt(n / max));
  const scale = width / VB_W;
  const path = useMemo(land, []);

  const routeD = useMemo(() => {
    if (!route || !REGION_PLACES[route.from] || !REGION_PLACES[route.to]) return null;
    const a = project(REGION_PLACES[route.from].lon, REGION_PLACES[route.from].lat);
    const b = project(REGION_PLACES[route.to].lon, REGION_PLACES[route.to].lat);
    const mx = (a.x + b.x) / 2;
    const lift = Math.min(150, Math.abs(b.x - a.x) * 0.32);
    const my = Math.min(a.y, b.y) - lift;
    return `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`;
  }, [route]);

  const tip = active ? placed.find((h) => h.region === active) : null;
  const tipAt = tip ? project(REGION_PLACES[tip.region].lon, REGION_PLACES[tip.region].lat) : null;

  return (
    <figure className="m-0">
      <div ref={box} className="relative" onPointerLeave={() => set(null)}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="block h-auto" role="img" aria-label={caption}>
          <path d={path} stroke="var(--land)" strokeWidth={CELL * 0.52} strokeLinecap="round" fill="none" />
          {routeD ? (
            <path d={routeD} pathLength={1} className="ops-route" fill="none" stroke="var(--signal-line)" strokeWidth={2.2 / scale} strokeLinecap="round" />
          ) : null}
          {placed.map((h) => {
            const p = project(REGION_PLACES[h.region].lon, REGION_PLACES[h.region].lat);
            const r = radius(h.workspaces);
            const on = active === h.region;
            const empty = h.workspaces === 0;
            return (
              <g
                key={h.region}
                tabIndex={0}
                role="button"
                aria-label={`${regionLabel(h.region)}: ${compact ? "" : `${whole.format(h.workspaces)} ${h.workspaces === 1 ? "workspace" : "workspaces"}, `}${h.detail?.join(", ") ?? ""}`}
                onPointerEnter={() => set(h.region)}
                onFocus={() => set(h.region)}
                onBlur={() => set(null)}
                className="cursor-default outline-none [&:focus-visible_.ops-hub-focus]:opacity-100"
              >
                <circle cx={p.x} cy={p.y} r={r + 9} fill="transparent" />
                <circle className="ops-hub-ring" cx={p.x} cy={p.y} r={r + 5} fill="var(--pill)" fillOpacity={on ? 0.14 : 0.07} />
                <circle cx={p.x} cy={p.y} r={r} fill={empty ? "var(--surface)" : "var(--pill)"} stroke={empty ? "var(--ink-4)" : "var(--surface)"} strokeWidth={2 / scale} />
                <circle className="ops-hub-focus opacity-0" cx={p.x} cy={p.y} r={r + 8} fill="none" stroke="var(--signal)" strokeWidth={2 / scale} />
                <text
                  x={p.x + r + 10}
                  y={p.y}
                  dy="0.35em"
                  fontSize={(compact ? 13 : 13.5) / scale}
                  fontWeight={600}
                  fill="var(--ink)"
                  paintOrder="stroke"
                  stroke="var(--surface)"
                  strokeWidth={4 / scale}
                  strokeLinejoin="round"
                >
                  {REGION_PLACES[h.region].short}
                  {compact ? null : <tspan fontWeight={400} fill="var(--ink-3)">{`  ${whole.format(h.workspaces)}`}</tspan>}
                </text>
              </g>
            );
          })}
        </svg>
        {tip && tipAt ? (
          <ChartTip x={tipAt.x * scale} y={(tipAt.y - radius(tip.workspaces)) * scale} width={width}>
            <p className="text-[15px] font-semibold text-ink">{regionLabel(tip.region)}</p>
            <p className="text-[12.5px] tabular-nums text-ink-3">
              {compact ? tip.detail?.join(", ") : `${whole.format(tip.workspaces)} ${tip.workspaces === 1 ? "workspace" : "workspaces"}${tip.detail?.length ? `, ${tip.detail.join(", ")}` : ""}`}
            </p>
          </ChartTip>
        ) : null}
      </div>
    </figure>
  );
}
