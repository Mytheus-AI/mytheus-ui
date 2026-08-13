"use client";

import Link from "next/link";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ScrubReveal, WordReveal, MaskReveal } from "@/components/landing/motion";
import { Eyebrow, ArrowRight } from "@/components/landing/ui";

/* ------------------------------------------------------------------ */
/*  AboutManifesto — the closing movement of the team page.            */
/*  1. A scroll-developed manifesto: four short lines that brighten    */
/*     and rise as you scrub through them, the key word of each set    */
/*     in the animated clay gradient.                                  */
/*  2. The sprint loop — a runner dot lapping a horizontal track,      */
/*     lighting up plan → build → ship → repeat as it passes (a nod    */
/*     to the name CyberSprinters). Pauses off-screen; fully static    */
/*     under prefers-reduced-motion.                                   */
/*  3. The closing band — mesh-field card, kicker, statement, one      */
/*     magnetic clay pill to "/" and a quiet link to /careers.         */
/*  Last section before the footer, so it ends on soft bottom          */
/*  padding, not a hard band edge.                                     */
/* ------------------------------------------------------------------ */

const MANIFESTO: { lead: string; key: string }[] = [
  { lead: "Ship in", key: "sprints." },
  { lead: "Let agents do the", key: "remembering." },
  { lead: "Motion is a", key: "feature." },
  { lead: "Small team,", key: "whole product." },
];

const STATIONS = ["plan", "build", "ship", "repeat"] as const;

/** The lap the dot takes, in seconds. */
const LAP_SECONDS = 8;

/* ------------------------- sprint loop ---------------------------- */

function SprintLoop() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // pause the lap whenever the track is off-screen
  const inView = useInView(ref, { margin: "-10% 0px -10% 0px" });

  const progress = useMotionValue(0);
  const dotLeft = useTransform(progress, (v) => `${v * 100}%`);
  const [active, setActive] = useState(0);

  useMotionValueEvent(progress, "change", (v) => {
    setActive(Math.min(STATIONS.length - 1, Math.round(v * (STATIONS.length - 1))));
  });

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(progress, [0, 1], {
      duration: LAP_SECONDS,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
      repeatDelay: 0.6, // a breath at "repeat" before the next lap
    });
    return () => controls.stop();
  }, [reduce, inView, progress]);

  return (
    <div ref={ref} aria-hidden className="mx-auto w-full max-w-[720px] px-2">
      {/* the track */}
      <div className="relative h-[2px] rounded-full bg-line-2">
        {/* fill that trails the runner */}
        {!reduce && (
          <motion.div
            className="absolute inset-y-0 left-0 origin-left rounded-full bg-signal/40"
            style={{ scaleX: progress, width: "100%" }}
          />
        )}
        {/* station ticks */}
        {STATIONS.map((s, i) => (
          <span
            key={s}
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300 ${
              reduce || active >= i ? "bg-signal" : "bg-line-2"
            }`}
            style={{ left: `${(i / (STATIONS.length - 1)) * 100}%` }}
          />
        ))}
        {/* the runner */}
        {!reduce && (
          <motion.span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_16px_4px_var(--signal-glow)]"
            style={{ left: dotLeft }}
          />
        )}
      </div>

      {/* mono labels: plan → build → ship → repeat */}
      <div className="relative mt-4 h-5">
        {STATIONS.map((s, i) => {
          const lit = reduce || active === i;
          const pos = (i / (STATIONS.length - 1)) * 100;
          const align =
            i === 0
              ? "left-0"
              : i === STATIONS.length - 1
                ? "right-0"
                : "-translate-x-1/2";
          return (
            <span
              key={s}
              className={`absolute top-0 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors duration-300 sm:text-[11px] ${align} ${
                lit ? "text-signal-deep" : "text-ink-3/60"
              }`}
              style={i === 0 || i === STATIONS.length - 1 ? undefined : { left: `${pos}%` }}
            >
              {s}
            </span>
          );
        })}
        {/* connector arrows between stations */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute top-0 hidden -translate-x-1/2 font-mono text-[10px] text-ink-3/40 sm:inline"
            style={{ left: `${((2 * i + 1) / (2 * (STATIONS.length - 1))) * 100}%` }}
          >
            &rarr;
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- section ------------------------------ */

export function AboutManifesto() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-6 pt-24 sm:pb-8 sm:pt-32">
      {/* 1 — the manifesto */}
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Eyebrow className="text-center">How we sprint</Eyebrow>
        <h2 className="sr-only">The CyberSprinters manifesto</h2>

        <div className="mt-10 flex flex-col items-center gap-5 text-center sm:mt-14 sm:gap-7">
          {MANIFESTO.map((line) => (
            <ScrubReveal key={line.key}>
              <p className="display text-balance text-[clamp(2rem,6.5vw,4.75rem)]">
                {line.lead}{" "}
                <span className="text-gradient-signal">{line.key}</span>
              </p>
            </ScrubReveal>
          ))}
        </div>
      </div>

      {/* 2 — the sprint loop */}
      <div className="mx-auto mt-20 max-w-[1200px] px-5 sm:mt-28 sm:px-8">
        <SprintLoop />
        <p className="sr-only">Plan, build, ship, repeat — the sprint loop.</p>
      </div>

      {/* 3 — the closing band */}
      <div className="mx-auto mt-20 max-w-[1340px] px-3 sm:mt-28 sm:px-5">
        <div className="mesh-field mesh-anim grain relative isolate overflow-hidden rounded-[28px] border border-line">
          {/* ambient clay glow behind the statement */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(64vw,26rem)] w-[min(92vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, var(--signal-glow), transparent 72%)",
              opacity: 0.24,
              filter: "blur(30px)",
            }}
            animate={
              reduce ? undefined : { opacity: [0.16, 0.3, 0.16], scale: [1, 1.06, 1] }
            }
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 mx-auto flex max-w-[1100px] flex-col items-center px-5 py-20 text-center sm:px-10 sm:py-28 md:py-32">
            <Eyebrow>CyberSprinters &times; Mytheus</Eyebrow>

            <WordReveal
              as="h2"
              text="Built in sprints."
              accent="Remembered forever."
              accentClass="text-gradient-signal"
              className="display display-tight mx-auto mt-6 max-w-[16ch] text-balance text-[clamp(2.25rem,7vw,5.5rem)]"
              delay={120}
            />

            <MaskReveal delay={300} y={36}>
              <p className="mx-auto mt-6 max-w-[42ch] text-balance text-[15px] leading-relaxed text-ink-3 sm:text-[17px]">
                Four builders, six agents, one flagship. Every sprint ships;
                every meeting is remembered.
              </p>
            </MaskReveal>

            <MaskReveal delay={460} y={44}>
              <div className="mt-10 flex flex-col items-center gap-5 sm:mt-12 sm:flex-row sm:gap-7">
                <Link
                  href="/"
                  className="group inline-flex items-center gap-2.5 rounded-pill bg-signal py-4 pl-8 pr-7 text-[16px] font-medium text-white shadow-[var(--shadow-cta)] transition-colors duration-300 hover:bg-signal-deep"
                >
                  Explore Mytheus
                  <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href="/careers"
                  className="link-underline text-[14px] font-medium text-ink-3 transition-colors duration-300 hover:text-ink sm:text-[15px]"
                >
                  Join the sprint
                </Link>
              </div>
            </MaskReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
