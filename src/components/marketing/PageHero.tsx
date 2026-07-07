"use client";

import type { ReactNode } from "react";
import { Reveal, WordReveal } from "@/components/landing/motion";
import { PillCTA } from "@/components/landing/ui";
import { FlowField } from "@/components/landing/FlowField";

/* Standard page hero for secondary marketing pages — eyebrow + big grotesk
   title + blurb + optional CTA, over the warm mesh field with the flowing
   "signal" ribbon + sweeping orb behind it. String titles get the editorial
   WordReveal treatment; ReactNode titles fall back to a plain Reveal. All
   entrances are reduced-motion-guarded by the primitives. */

const TITLE_CLASS =
  "display display-tight mt-5 max-w-[20ch] text-balance text-[clamp(2.3rem,6.5vw,4.8rem)]";

export function PageHero({
  eyebrow,
  title,
  blurb,
  ctaHref,
  ctaLabel = "Get started free",
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  blurb?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  children?: ReactNode;
}) {
  return (
    <section className="mesh-field mesh-anim grain relative isolate overflow-hidden border-b border-line">
      {/* flowing "signal" ribbon + sweeping orb behind the hero */}
      <FlowField className="absolute inset-0 z-0 opacity-50" />
      <div className="relative z-10 mx-auto max-w-[1340px] px-6 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
        <Reveal y={14}>
          <p className="kicker text-signal">{eyebrow}</p>
        </Reveal>
        {typeof title === "string" ? (
          <WordReveal as="h1" text={title} className={TITLE_CLASS} delay={90} />
        ) : (
          <Reveal delay={90}>
            <h1 className={TITLE_CLASS}>{title}</h1>
          </Reveal>
        )}
        {blurb && (
          <Reveal delay={260}>
            <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-ink-3 sm:text-[18px]">
              {blurb}
            </p>
          </Reveal>
        )}
        {ctaHref && (
          <Reveal delay={360}>
            <div className="mt-9">
              <PillCTA href={ctaHref}>{ctaLabel}</PillCTA>
            </div>
          </Reveal>
        )}
        {children && (
          <Reveal delay={360}>
            <div className="mt-9">{children}</div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
