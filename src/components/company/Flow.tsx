import type { ReactNode } from "react";
import { InView } from "@/components/site/InView";

/* A mechanism, step by step: the steps sit on a grid and one straight coral thread joins their
   beads, drawn segment by segment when the list scrolls into view (the reference's notes window
   uses the same thread and beads). Columns from `md`; below that the thread runs down the left.
   The last segment runs on to the edge: what happens here carries forward.
   Reduced motion: the thread and beads appear in their final state. */

export type FlowStep = { title: ReactNode; body: ReactNode; tag?: ReactNode };

const COLS: Record<number, string> = {
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};

export function Flow({ steps, className = "" }: { steps: FlowStep[]; className?: string }) {
  return (
    <InView as="ol" threshold={0.35} className={`group grid gap-y-8 md:gap-x-6 ${COLS[steps.length] ?? "md:grid-cols-4"} ${className}`}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const delay = { transitionDelay: `${0.15 + i * 0.4}s` };
        return (
          <li key={i} className="relative pl-9 md:pl-0 md:pt-10">
            {/* the thread segment from this bead to the next (to the edge, for the last one) */}
            <span
              aria-hidden
              className={`absolute left-[5.5px] top-[19px] h-[calc(100%+16px)] w-[2px] rounded-full bg-line-2 md:left-[19px] md:top-[5.5px] md:h-[2px] ${
                last ? "hidden md:block md:w-[calc(100%-19px)]" : "md:w-[calc(100%+8px)]"
              }`}
            >
              <span
                className="block h-full w-full origin-top scale-y-0 rounded-full bg-signal-line transition-transform duration-500 ease-[cubic-bezier(.55,.1,.3,1)] group-[.in]:scale-y-100 motion-reduce:scale-y-100 motion-reduce:transition-none md:origin-left md:scale-x-0 md:scale-y-100 md:group-[.in]:scale-x-100 md:motion-reduce:scale-x-100"
                style={delay}
              />
            </span>
            {/* the bead */}
            <span
              aria-hidden
              className="absolute left-0 top-[3px] z-[1] block h-[13px] w-[13px] rounded-full border-2 border-line-2 bg-surface transition-[background-color,border-color,box-shadow] duration-300 group-[.in]:border-signal-line group-[.in]:bg-signal-line group-[.in]:shadow-[0_0_0_5px_var(--signal-soft)] motion-reduce:border-signal-line motion-reduce:bg-signal-line motion-reduce:transition-none md:top-0"
              style={{ transitionDelay: `${i * 0.4}s` }}
            />
            {s.tag ? <div className="mb-2">{s.tag}</div> : null}
            <h3 className="font-display text-[1.4rem] font-medium leading-tight tracking-[-0.015em] text-ink">{s.title}</h3>
            <p className="mt-2 max-w-[34ch] text-[15.5px] leading-relaxed text-ink-3">{s.body}</p>
          </li>
        );
      })}
    </InView>
  );
}
