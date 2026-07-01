"use client";

import { PillCTA } from "./ui";
import { WordReveal, Magnetic } from "./motion";
import { FlowField } from "./FlowField";

/* Closing CTA — a big rounded stage echoing the hero: a living gradient mesh,
   a flowing line of "memory" with a pulse travelling across it, one large
   statement that develops word by word, and the split-pill CTA. */

export function FinalCTA() {
  return (
    <section className="px-3 pb-3 sm:px-5">
      <div className="mesh-field mesh-anim grain relative isolate overflow-hidden rounded-[28px] border border-line">
        {/* flowing "memory" line + travelling pulse, behind the statement */}
        <FlowField className="absolute inset-0 z-0 opacity-60" />
        <div className="relative z-10 mx-auto flex max-w-[1340px] flex-col items-center gap-12 px-6 py-28 text-center sm:px-10 sm:py-36">
          <WordReveal
            as="h2"
            text="Unlimited meeting"
            accent="memory."
            accentClass="text-gradient-signal"
            className="display display-tight mx-auto max-w-[14ch] text-balance text-[clamp(2.6rem,8vw,6.5rem)]"
          />
          <Magnetic strength={0.3}>
            <PillCTA href="/sign-up">Get started free</PillCTA>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
