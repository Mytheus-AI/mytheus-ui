"use client";

import { useState } from "react";
import { RegionMap } from "@/components/ops/map/RegionMap";
import { REGION_PLACES, regionLabel } from "@/lib/ops-charts";
import type { OpsRegion } from "@/lib/ops";

const whole = new Intl.NumberFormat("en-US");
const plural = (n: number, one: string, many: string) => `${whole.format(n)} ${n === 1 ? one : many}`;

/* Where workspaces live: the dotted map on the left, the regions as a list on the right with each
   one's share, members, meetings and database cells. Pointing at a region in either place
   highlights it in both. Workspaces with no residency row are listed but not mapped. */

export function RegionsPanel({ regions, total }: { regions: OpsRegion[]; total: number }) {
  const [active, setActive] = useState<string | null>(null);
  const mapped = regions.filter((r) => REGION_PLACES[r.region]);
  // Every region the platform offers is on the map, an empty one as an open ring.
  const hubs = Object.keys(REGION_PLACES).map((code) => {
    const r = regions.find((x) => x.region === code);
    return {
      region: code,
      workspaces: r?.workspaces ?? 0,
      detail: r ? [plural(r.members, "member", "members"), plural(r.meetings_7d, "meeting this week", "meetings this week")] : ["nothing placed here"],
    };
  });
  const listed = [...mapped, ...regions.filter((r) => !REGION_PLACES[r.region])];

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-center">
      <RegionMap hubs={hubs} caption="World map of workspaces by data-residency region" highlight={active} onHighlight={setActive} />
      <ul className="m-0 flex list-none flex-col p-0" aria-label="Workspaces by region">
        {listed.length === 0 ? <li className="text-[14px] text-ink-3">No workspaces yet.</li> : null}
        {listed.map((r) => {
          const share = total ? r.workspaces / total : 0;
          const onMap = Boolean(REGION_PLACES[r.region]);
          return (
            <li
              key={r.region}
              tabIndex={onMap ? 0 : undefined}
              onPointerEnter={() => onMap && setActive(r.region)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => onMap && setActive(r.region)}
              onBlur={() => setActive(null)}
              className={`rounded-ctl px-3 py-3 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-signal ${active === r.region ? "bg-surface-2" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{regionLabel(r.region)}</span>
                <span className="shrink-0 text-[14px] tabular-nums text-ink-2">
                  <span className="font-semibold text-ink">{whole.format(r.workspaces)}</span>
                  <span className="ml-1.5 inline-block w-9 text-right text-ink-3">{Math.round(share * 100)}%</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-bg-2" aria-hidden>
                <div className={`h-full rounded-full ${onMap ? "bg-pill" : "bg-ink-4"} ${r.workspaces ? "min-w-1.5" : ""}`} style={{ width: `${share * 100}%` }} />
              </div>
              <p className="mt-2 text-[13px] text-ink-3">
                {plural(r.active, "active", "active")}, {plural(r.members, "member", "members")}, {plural(r.meetings_7d, "meeting", "meetings")} this week
              </p>
              {r.cells.length ? (
                <p className="mt-1 truncate text-[13px] text-ink-3">
                  {onMap ? "Cells: " : "Not on the map. "}
                  {onMap ? r.cells.map((c) => `${c.db_cell} (${c.workspaces})`).join(", ") : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
