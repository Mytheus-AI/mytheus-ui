import type { ReactNode } from "react";

/* Questions, the reference's way: a title and lead on the left, native details/summary rows on
   the right with a coral plus that turns into a minus when open. No script needed; keyboard and
   screen readers get the native disclosure behaviour. */
export function Faq({
  title,
  lead,
  items,
}: {
  title: ReactNode;
  lead?: ReactNode;
  items: { q: string; a: ReactNode }[];
}) {
  return (
    <div className="grid items-start gap-x-16 gap-y-7 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
      <div>
        <h2 className="display max-w-[14ch] text-[clamp(2.1rem,4.6vw,3.5rem)]">{title}</h2>
        {lead ? <p className="mt-4 max-w-[40ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-ink-3">{lead}</p> : null}
      </div>
      <div className="border-b border-line-2">
        {items.map((it, i) => (
          <details key={it.q} open={i === 0} className="group border-t border-line-2">
            <summary className="relative cursor-pointer list-none py-5 pr-11 font-display text-[1.35rem] font-medium leading-tight tracking-[-0.012em] text-ink transition-colors hover:text-signal-ink [&::-webkit-details-marker]:hidden">
              {it.q}
              <span aria-hidden className="absolute right-1.5 top-1/2 h-0.5 w-4 -translate-y-1/2 rounded-full bg-signal-line" />
              <span
                aria-hidden
                className="absolute right-1.5 top-1/2 h-0.5 w-4 -translate-y-1/2 rotate-90 rounded-full bg-signal-line transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-0 motion-reduce:transition-none"
              />
            </summary>
            <div className="max-w-[62ch] pb-6 pr-11 text-[16.5px] leading-relaxed text-ink-3">{it.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
