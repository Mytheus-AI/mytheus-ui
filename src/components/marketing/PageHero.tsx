"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/landing/motion";
import { PillCTA } from "@/components/landing/ui";
import { FlowField } from "@/components/landing/FlowField";

/* Standard page hero for secondary marketing pages — eyebrow + big grotesk
   title + blurb + optional CTA, over the warm mesh field with the flowing
   "signal" ribbon + sweeping orb behind it. Reveal is reduced-motion-guarded. */

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
      <div className="relative z-10 mx-auto max-w-[1340px] px-6 py-24 sm:px-8 sm:py-28">
        <Reveal>
          <p className="kicker text-signal">{eyebrow}</p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="display display-tight mt-5 max-w-[20ch] text-balance text-[clamp(2.6rem,6vw,4.8rem)]">
            {title}
          </h1>
        </Reveal>
        {blurb && (
          <Reveal delay={160}>
            <p className="mt-6 max-w-[54ch] text-[18px] leading-relaxed text-ink-3">
              {blurb}
            </p>
          </Reveal>
        )}
        {ctaHref && (
          <Reveal delay={240}>
            <div className="mt-9">
              <PillCTA href={ctaHref}>{ctaLabel}</PillCTA>
            </div>
          </Reveal>
        )}
        {children && (
          <Reveal delay={240}>
            <div className="mt-9">{children}</div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
