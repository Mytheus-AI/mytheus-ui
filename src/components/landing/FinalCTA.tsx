"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "./ui";
import { WordReveal, MaskReveal, Magnetic, ScrollScale } from "./motion";
import { FlowField } from "./FlowField";

/* Closing CTA — one orchestrated moment: the scroll camera pushes into a
   living stage (gradient mesh + the flowing memory line), a breathing clay
   glow swells behind the statement, the statement develops word by word,
   then the supporting line and the magnetic CTA rise in on its heels.
   Reduced motion: static glow, instant text, no sweep. */

export function FinalCTA() {
  const reduce = useReducedMotion();

  return (
    <section className="px-3 pb-3 sm:px-5">
      {/* the scroll camera pushes into the closing stage */}
      <ScrollScale from={0.95}>
      <div className="mesh-field mesh-anim grain relative isolate overflow-hidden rounded-[28px] border border-line">
        {/* flowing "memory" line + travelling pulse, behind the statement */}
        <FlowField className="absolute inset-0 z-0 opacity-60" />

        {/* ambient clay glow, breathing slowly behind the words */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(70vw,30rem)] w-[min(96vw,54rem)] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, var(--signal-glow), transparent 72%)",
            opacity: 0.26,
            filter: "blur(32px)",
          }}
          animate={reduce ? undefined : { opacity: [0.18, 0.34, 0.18], scale: [1, 1.07, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 mx-auto flex max-w-[1340px] flex-col items-center px-5 py-24 text-center sm:px-10 sm:py-32 md:py-36">
          <WordReveal
            as="h2"
            text="Unlimited meeting"
            accent="memory."
            accentClass="text-gradient-signal"
            className="display display-tight mx-auto max-w-[14ch] text-balance text-[clamp(2.5rem,8vw,6.5rem)]"
          />

          <MaskReveal delay={280} y={36}>
            <p className="mx-auto mt-6 max-w-[38ch] text-balance text-[15px] leading-relaxed text-ink-3 sm:text-[17px]">
              Your team&apos;s context, carried forward from your very first
              meeting — and every one after it.
            </p>
          </MaskReveal>

          <MaskReveal delay={460} y={44}>
            <div className="mt-10 sm:mt-12">
              {/* one clean pill, same language as the header CTA — no split
                  arrow knob, no pulsing */}
              <Magnetic strength={0.3}>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2.5 rounded-pill bg-signal py-4 pl-8 pr-7 text-[16px] font-medium text-white shadow-[0_20px_44px_-18px_rgba(189,93,58,0.85)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-signal-deep"
                >
                  Get started free
                  <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
            </div>
          </MaskReveal>

          <MaskReveal delay={620} y={24}>
            <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
              Free to start · No bot joins your call
            </p>
          </MaskReveal>
        </div>
      </div>
      </ScrollScale>
    </section>
  );
}
