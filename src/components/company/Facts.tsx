import type { ReactNode } from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";

/* Quiet, aligned fact layouts for the company pages. No cards and no hover lift: each item
   opens on a hairline, so a row of them reads as one aligned grid.

   IconFacts  a grid of short points, each with a regular-weight icon, a title and a line.
   FactList   a definition list: serif term on the left, the explanation on the right.
   CheckList  a plain list of commitments, each with a small coral check. */

const COLS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function IconFacts({
  items,
  cols = 3,
  className = "",
}: {
  items: { icon: ReactNode; title: ReactNode; body: ReactNode }[];
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <ul className={`grid gap-x-8 gap-y-10 ${COLS[cols]} ${className}`}>
      {items.map((it, i) => (
        <li key={i} className="border-t border-line-2 pt-6">
          <span aria-hidden className="block text-signal [&_svg]:h-7 [&_svg]:w-7">
            {it.icon}
          </span>
          <h3 className="mt-4 text-[18px] font-semibold leading-snug text-ink">{it.title}</h3>
          <p className="mt-2 max-w-[42ch] text-[15.5px] leading-relaxed text-ink-3">{it.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function FactList({
  items,
  className = "",
}: {
  items: { term: ReactNode; detail: ReactNode; id?: string }[];
  className?: string;
}) {
  return (
    <dl className={`border-b border-line-2 ${className}`}>
      {items.map((it, i) => (
        <div
          key={i}
          id={it.id}
          className="grid scroll-mt-28 gap-x-12 gap-y-2 border-t border-line-2 py-6 md:grid-cols-[minmax(0,.75fr)_minmax(0,1.5fr)] md:py-7"
        >
          <dt className="font-display text-[1.35rem] font-medium leading-snug tracking-[-0.012em] text-ink">{it.term}</dt>
          <dd className="max-w-[64ch] text-[16.5px] leading-relaxed text-ink-2">{it.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CheckList({ items, className = "" }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={`border-b border-line-2 ${className}`}>
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3.5 border-t border-line-2 py-4 text-[16.5px] leading-relaxed text-ink-2">
          <Check aria-hidden weight="bold" className="mt-[5px] h-4 w-4 flex-none text-signal" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
