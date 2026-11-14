"use client";

import { useState } from "react";
import { RegionMap } from "@/components/ops/map/RegionMap";
import type { MemberPlace } from "@/lib/ops-geo";

const whole = new Intl.NumberFormat("en-US");
const plural = (n: number, one: string, many: string) => `${whole.format(n)} ${n === 1 ? one : many}`;

/* Where members are: the dotted map on the left, countries as a list on the right with each one's
   share and the time zones behind it. Pointing at a country in either place highlights it in
   both. Members who never saved a time zone are counted under the list, never guessed onto the
   map. The storage line under that is a different fact (where data is kept) and says so. */

export function MembersPanel({ places, notSet, total, storage }: { places: MemberPlace[]; notSet: number; total: number; storage: string | null }) {
  const [active, setActive] = useState<string | null>(null);
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const hubs = places.map((p) => ({ ...p, detail: [`${share(p.count)}% of members`] }));

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-center">
      <RegionMap
        hubs={hubs}
        unit={["member", "members"]}
        caption={`World map of members by the time zone they saved: ${places.map((p) => `${p.label} ${p.count}`).join(", ") || "none placed yet"}`}
        highlight={active}
        onHighlight={setActive}
      />
      <div className="min-w-0">
        <ul className="m-0 flex list-none flex-col p-0" aria-label="Members by country">
          {places.length === 0 ? (
            <li className="px-3 py-3 text-[14px] text-ink-3">No member has saved a time zone yet.</li>
          ) : null}
          {places.map((p) => (
            <li
              key={p.key}
              tabIndex={0}
              onPointerEnter={() => setActive(p.key)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(p.key)}
              onBlur={() => setActive(null)}
              className={`rounded-ctl px-3 py-3 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-signal ${active === p.key ? "bg-surface-2" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{p.label}</span>
                <span className="shrink-0 text-[14px] tabular-nums text-ink-2">
                  <span className="font-semibold text-ink">{whole.format(p.count)}</span>
                  <span className="ml-1.5 inline-block w-9 text-right text-ink-3">{share(p.count)}%</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-bg-2" aria-hidden>
                <div className="h-full min-w-1.5 rounded-full bg-pill" style={{ width: `${share(p.count)}%` }} />
              </div>
              <p className="mt-2 truncate text-[13px] text-ink-3" title={p.zones.join(", ")}>
                {p.zones.join(", ")}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-line px-3 pt-3 text-[13px] leading-relaxed text-ink-3">
          <p>
            <span className="font-semibold text-ink-2">{plural(notSet, "member has", "members have")}</span> not saved a time zone, so{" "}
            {notSet === 1 ? "is" : "are"} not on the map.
          </p>
          {storage ? <p className="mt-1.5">{storage}</p> : null}
        </div>
      </div>
    </div>
  );
}
