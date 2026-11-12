"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { PlugsConnected, Scales } from "@phosphor-icons/react";
import type { RingNumber, RippleItem } from "@/lib/api/why-blast-types";
import { MAP, itemLabel, mapCap, mapLayout, moveFocus, pillWidth, type Focus } from "@/lib/blast-radius";
import { EffectDot, nodeName } from "./RippleParts";

/* The ripple map: the decision at the left middle, three rings spreading from it (1 the work it
   changes, 2 goals and other teams, 3 customers), each ring's items standing on its arc. The rings
   draw in once (reduced motion: simply there) and the items settle onto them after.

   Keyboard: each ring is one Tab stop; Up and Down move along a ring, Left and Right step between
   rings, Home and End jump to a ring's ends. Focus shows that item in the detail under the map;
   Enter or a click does the same. A ring with more items than fit shows "N more", which opens it. */

export type RingView = { ring: RingNumber; label: string; items: RippleItem[] };

const RINGS: RingNumber[] = [1, 2, 3];

export function visibleOf(ring: RingView, cap: number, expanded: boolean): { items: RippleItem[]; more: number } {
  if (expanded || ring.items.length <= cap) return { items: ring.items, more: 0 };
  return { items: ring.items.slice(0, cap - 1), more: ring.items.length - (cap - 1) };
}

export function RippleMap({
  rings,
  width,
  selectedId,
  onSelect,
  expanded,
  onExpand,
  hubspotMissing,
  animate,
}: {
  rings: RingView[];
  width: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: Set<RingNumber>;
  onExpand: (ring: RingNumber) => void;
  hubspotMissing: boolean;
  animate: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const clipId = `br-clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [active, setActive] = useState<Record<RingNumber, number>>({ 1: 0, 2: 0, 3: 0 });
  const cap = mapCap(width);
  const views = RINGS.map((r) => {
    const ring = rings.find((x) => x.ring === r) ?? { ring: r, label: "", items: [] };
    return { ring, ...visibleOf(ring, cap, expanded.has(r)) };
  });
  const focusable = (k: number) => views[k].items.length + (views[k].more ? 1 : 0);
  const slots: [number, number, number] = [focusable(0), focusable(1), focusable(2) + (hubspotMissing ? 1 : 0)];
  const want = views.map((v, k) =>
    Math.max(
      0,
      ...v.items.map((i) => pillWidth(itemLabel(i))),
      v.more ? 90 : 0,
      k === 2 && hubspotMissing ? 196 : 0,
      pillWidth(v.ring.label) - 10,
    ),
  ) as [number, number, number];
  const layout = mapLayout(width, slots, want);
  const sizes: Record<RingNumber, number> = { 1: focusable(0), 2: focusable(1), 3: focusable(2) };

  const focusNode = (f: Focus) => {
    setActive((a) => ({ ...a, [f.ring]: f.index }));
    root.current?.querySelector<HTMLElement>(`[data-node="${f.ring}-${f.index}"]`)?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, at: Focus) => {
    const next = moveFocus(e.key, at, sizes);
    if (!next) return;
    e.preventDefault();
    focusNode(next);
  };

  const ringDelay = (k: number) => `${0.1 + k * 0.28}s`;
  const nodeDelay = (k: number, i: number) => `${0.55 + k * 0.28 + i * 0.04}s`;

  return (
    <div ref={root} className="relative" style={{ height: layout.height }}>
      <svg
        aria-hidden
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className={`absolute inset-0 overflow-hidden ${animate ? "mx-draw" : ""}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={MAP.head - 6} width={layout.width} height={layout.height - MAP.head + 6} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {layout.radii.map((r, k) => (
            <circle
              key={k}
              cx={layout.cx}
              cy={layout.cy}
              r={r}
              pathLength={1}
              className={`br-ring ${k === 2 ? "is-outer" : ""}`}
              style={{ ["--dl" as string]: ringDelay(k) }}
            />
          ))}
        </g>
      </svg>

      {/* ring names, over their column */}
      {RINGS.map((r, k) => {
        const x = layout.cx + layout.radii[k] - 16;
        const n = views[k].ring.items.length;
        return (
          <p
            key={r}
            aria-hidden
            className="absolute top-1 flex items-center gap-1.5 text-[13px] font-semibold text-ink-3"
            style={{ left: x, maxWidth: layout.columns[k] }}
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--signal-line)] text-[11.5px] font-bold text-signal-ink">
              {r}
            </span>
            <span className="truncate">{views[k].ring.label}</span>
            <span className="tabular-nums text-ink-4">{n}</span>
          </p>
        );
      })}

      {/* the decision */}
      <div aria-hidden className="absolute flex w-[92px] flex-col items-center" style={{ left: layout.cx - 46, top: layout.cy - 22 }}>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-signal text-pill-on shadow-[0_0_0_6px_var(--signal-soft)]">
          <Scales size={20} weight="fill" />
        </span>
        <span className="mt-2.5 text-center text-[12.5px] font-semibold leading-tight text-ink-3">This decision</span>
      </div>

      <div role="group" aria-label="Ripple map">
        {views.map((v, k) => {
          const ring = v.ring.ring;
          const nodes = layout.nodes.filter((n) => n.ring === ring);
          return (
            <div key={ring} role="group" aria-label={`Ring ${ring}, ${v.ring.label}: ${v.ring.items.length} ${v.ring.items.length === 1 ? "item" : "items"}`}>
              {v.items.map((item, i) => {
                const pos = nodes[i];
                if (!pos) return null;
                const selected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-node={`${ring}-${i}`}
                    tabIndex={active[ring] === i ? 0 : -1}
                    aria-label={nodeName(item)}
                    aria-pressed={selected}
                    title={itemLabel(item)}
                    onFocus={() => {
                      setActive((a) => ({ ...a, [ring]: i }));
                      onSelect(item.id);
                    }}
                    onClick={() => onSelect(item.id)}
                    onKeyDown={(e) => onKey(e, { ring, index: i })}
                    className={`absolute flex h-9 items-center gap-2 rounded-full border bg-surface pl-1 pr-3 text-left text-[13.5px] shadow-warm-1 transition-[border-color,box-shadow] duration-150 hover:border-ink-4 ${
                      selected ? "border-signal shadow-[0_0_0_3px_var(--signal-soft)]" : "border-line"
                    } ${animate ? "mx-bead-in" : ""}`}
                    style={{ left: pos.x - 18, top: pos.y - 18, maxWidth: pos.maxW, ["--dl" as string]: nodeDelay(k, i) }}
                  >
                    <EffectDot effect={item.effect} />
                    <span className={`truncate ${item.redacted ? " text-ink-3" : "font-medium text-ink"}`}>{itemLabel(item)}</span>
                  </button>
                );
              })}
              {v.more && nodes[v.items.length] ? (
                <button
                  type="button"
                  data-node={`${ring}-${v.items.length}`}
                  tabIndex={active[ring] === v.items.length ? 0 : -1}
                  onClick={() => onExpand(ring)}
                  onFocus={() => setActive((a) => ({ ...a, [ring]: v.items.length }))}
                  onKeyDown={(e) => onKey(e, { ring, index: v.items.length })}
                  aria-label={`Show ${v.more} more in ${v.ring.label}`}
                  className={`absolute flex h-9 items-center rounded-full border border-dashed border-line-2 bg-surface px-3.5 text-[13.5px] font-semibold text-ink-2 hover:bg-surface-2 ${animate ? "mx-bead-in" : ""}`}
                  style={{
                    left: nodes[v.items.length].x - 18,
                    top: nodes[v.items.length].y - 18,
                    ["--dl" as string]: nodeDelay(k, v.items.length),
                  }}
                >
                  {v.more} more
                </button>
              ) : null}
              {ring === 3 && hubspotMissing ? (
                <p
                  className="absolute flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-bg-2 px-3 text-[13px] text-ink-3"
                  style={{ left: nodes[nodes.length - 1].x - 18, top: nodes[nodes.length - 1].y - 18, maxWidth: nodes[nodes.length - 1].maxW }}
                >
                  <PlugsConnected size={14} aria-hidden />
                  HubSpot not connected
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
