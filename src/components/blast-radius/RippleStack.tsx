"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { CaretDown, PlugsConnected } from "@phosphor-icons/react";
import type { RingNumber } from "@/lib/api/why-blast-types";
import { EFFECT, itemLabel, moveFocus, type Focus } from "@/lib/blast-radius";
import { EffectDot, RippleDetail, nodeName } from "./RippleParts";
import type { RingView } from "./RippleMap";

/* The ripple, ring by ring, for a narrow section (a phone, or the decision page's main column
   beside its side column): one coral thread joins the three rings, each ring lists its items, and
   an item opens its detail in place. Same keyboard as the map: one Tab stop per ring, Up and Down
   along it, Left and Right between rings, Home and End. */

export function RippleStack({
  rings,
  selectedId,
  onSelect,
  hubspotMissing,
}: {
  rings: RingView[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  hubspotMissing: boolean;
}) {
  const root = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState<Record<RingNumber, number>>({ 1: 0, 2: 0, 3: 0 });
  const sizes = Object.fromEntries(rings.map((r) => [r.ring, r.items.length])) as Record<RingNumber, number>;

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, at: Focus) => {
    const next = moveFocus(e.key, at, sizes);
    if (!next) return;
    e.preventDefault();
    setActive((a) => ({ ...a, [next.ring]: next.index }));
    root.current?.querySelector<HTMLElement>(`[data-row="${next.ring}-${next.index}"]`)?.focus();
  };

  return (
    <ol ref={root} className="relative space-y-5">
      <span aria-hidden className="absolute bottom-3 left-[13px] top-3 w-[2px] rounded-full bg-[var(--signal-line)] opacity-60" />
      {rings.map((ring) => (
        <li key={ring.ring} className="relative">
          <h3 className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
            <span aria-hidden className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[var(--signal-line)] bg-surface text-[12.5px] font-bold text-signal-ink">
              {ring.ring}
            </span>
            <span>
              <span className="sr-only">Ring {ring.ring}: </span>
              {ring.label}
            </span>
            <span className="tabular-nums font-normal text-ink-3">
              {ring.items.length}
              <span className="sr-only"> {ring.items.length === 1 ? "item" : "items"}</span>
            </span>
          </h3>
          <div className="ml-10 mt-2">
            {ring.items.length === 0 ? (
              <p className="text-[14px] text-ink-3">Nothing here.</p>
            ) : (
              <ul className="space-y-1.5">
                {ring.items.map((item, i) => {
                  const open = item.id === selectedId;
                  return (
                    <li key={item.id} className={`rounded-ctl border ${open ? "border-line-2 bg-surface-2" : "border-transparent"}`}>
                      <button
                        type="button"
                        data-row={`${ring.ring}-${i}`}
                        tabIndex={active[ring.ring] === i ? 0 : -1}
                        aria-expanded={open}
                        aria-label={nodeName(item)}
                        onFocus={() => setActive((a) => ({ ...a, [ring.ring]: i }))}
                        onClick={() => onSelect(open ? null : item.id)}
                        onKeyDown={(e) => onKey(e, { ring: ring.ring, index: i })}
                        className="flex min-h-[44px] w-full items-center gap-2.5 rounded-ctl px-2 py-1.5 text-left hover:bg-surface-2"
                      >
                        <EffectDot effect={item.effect} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[14.5px] leading-snug ${item.redacted ? "italic text-ink-3" : "font-medium text-ink"}`}>
                            {itemLabel(item)}
                          </span>
                          <span className="block text-[12.5px] text-ink-3">{EFFECT[item.effect].label}</span>
                        </span>
                        <CaretDown size={14} weight="bold" aria-hidden className={`shrink-0 text-ink-3 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open ? (
                        <div className="px-3 pb-3 pt-1">
                          <RippleDetail item={item} headingLevel={4} hideTitle />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {ring.ring === 3 && hubspotMissing ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-bg-2 px-3 py-1 text-[13px] text-ink-3">
                <PlugsConnected size={14} aria-hidden />
                HubSpot not connected
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
