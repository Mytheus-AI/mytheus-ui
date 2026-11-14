"use client";

import { useState } from "react";

const whole = new Intl.NumberFormat("en-US");

/* A whole split into a few parts (at most five): a ring with a 2px surface gap between parts, the
   total in the middle, and a legend that names every part with its count and share, so no part
   is identified by colour alone. Pointing at a part or its legend row, or focusing the row, puts
   that part's numbers in the middle and quiets the rest. */

export interface DonutPart {
  key: string;
  label: string;
  value: number;
  /** A CSS colour, normally a token: `var(--ord-3)`. */
  fill: string;
}

const SIZE = 136;
const R = 66;
const THICK = 17;

function arc(a0: number, a1: number): string {
  const r0 = R - THICK;
  const p = (r: number, a: number) => `${(SIZE / 2 + r * Math.sin(a)).toFixed(2)},${(SIZE / 2 - r * Math.cos(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(R, a0)} A${R},${R} 0 ${large} 1 ${p(R, a1)} L${p(r0, a1)} A${r0},${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

export function Donut({ parts, unit, caption }: { parts: DonutPart[]; unit: [string, string]; caption: string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0);
  const shown = parts.filter((p) => p.value > 0);
  if (total === 0) return <p className="text-[14px] text-ink-3">Nothing to show yet.</p>;

  let a = 0;
  const arcs = shown.map((p) => {
    const sweep = (p.value / total) * Math.PI * 2;
    // A single part is a full ring: two half arcs, since one arc cannot start and end together.
    const d = shown.length === 1 ? `${arc(0, Math.PI)} ${arc(Math.PI, Math.PI * 2)}` : arc(a, a + sweep);
    a += sweep;
    return { ...p, d };
  });
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;
  const word = (v: number) => (v === 1 ? unit[0] : unit[1]);
  const focus = active ? parts.find((p) => p.key === active) ?? null : null;

  return (
    <figure className="m-0 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="block">
          {arcs.map((p) => (
            <path
              key={p.key}
              d={p.d}
              fill={p.fill}
              stroke="var(--surface)"
              strokeWidth={2}
              strokeLinejoin="round"
              className="transition-opacity duration-150"
              opacity={active && active !== p.key ? 0.3 : 1}
              onPointerEnter={() => setActive(p.key)}
              onPointerLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
          <span className="display text-[28px] leading-none text-ink">{whole.format(focus ? focus.value : total)}</span>
          <span className="mt-1.5 max-w-[92px] truncate text-[12.5px] text-ink-3">{focus ? focus.label : word(total)}</span>
        </div>
      </div>
      <ul className="m-0 flex w-full min-w-0 list-none flex-col p-0" aria-label={caption}>
        {parts.map((p) => (
          <li
            key={p.key}
            tabIndex={0}
            onPointerEnter={() => setActive(p.key)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(p.key)}
            onBlur={() => setActive(null)}
            className={`flex min-h-10 items-center gap-3 rounded-ctl px-2.5 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-signal ${
              active === p.key ? "bg-surface-2" : ""
            }`}
          >
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: p.fill }} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{p.label}</span>
            <span className="shrink-0 text-[14px] tabular-nums text-ink-2">
              {whole.format(p.value)} <span className="sr-only">{word(p.value)},</span>
              <span className="ml-1.5 inline-block w-10 text-right text-ink-3">{pct(p.value)}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
