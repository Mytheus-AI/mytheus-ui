"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import { Reveal, Parallax, WordReveal, MaskReveal, Tilt } from "./motion";
import { MockWindow, NoteLine, Avatar, Chip } from "./mockups";

/* ------------------------------------------------------------------ */
/*  "How it works" — a motion-controlled scroll-spy. A single           */
/*  `useScroll` progress value drives BOTH the springed fill of the      */
/*  sticky sidebar rail and which phase is active. The right column      */
/*  scrolls through three blocks, each with its own parallaxing mockup.  */
/* ------------------------------------------------------------------ */

type Phase = {
  id: string;
  nav: string;
  heading: string;
  accent: string;
  body: string;
};

const PHASES: Phase[] = [
  {
    id: "before",
    nav: "Before the meeting",
    heading: "Start every meeting",
    accent: "prepared.",
    body: "Before every call, Reprise preps a Brief from the meetings that came before — the open decisions, the unanswered questions, the context you'd otherwise dig for.",
  },
  {
    id: "during",
    nav: "In the meeting",
    heading: "Give it your full",
    accent: "attention.",
    body: "Don't choose between listening and taking good notes. Your agent captures decisions, action items, and the questions worth asking — while you stay present in the room.",
  },
  {
    id: "after",
    nav: "After the meeting",
    heading: "Post-meeting admin,",
    accent: "done.",
    body: "The moment a meeting ends, your notes, action items, and follow-ups are ready — assigned to the right owners and shared with the people who couldn't make it.",
  },
];

export function ScrollStory() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const blockRefs = useRef<(HTMLElement | null)[]>([]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const fill = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(PHASES.length - 1, Math.max(0, Math.floor(v * PHASES.length)));
    setActive(idx);
  });

  return (
    <section id="how" className="mx-auto max-w-[80rem] overflow-x-clip px-6 py-16 sm:py-20 lg:py-36">
      {/* section header */}
      <div className="mb-12 max-w-2xl sm:mb-16 lg:mb-24">
        <Reveal>
          <p className="kicker mb-5 text-signal">How it works</p>
        </Reveal>
        <WordReveal
          as="h2"
          className="display-serif text-[clamp(1.8rem,7vw,3.6rem)] text-ink"
          text="Before, during, and after —"
          accent="handled."
          accentClass="italic text-signal-deep"
        />
      </div>

      <div ref={sectionRef} className="grid gap-10 sm:gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        {/* LEFT — sticky scroll-spy sidebar with a motion-driven rail */}
        <div className="lg:sticky lg:top-28 lg:h-fit lg:self-start">
          <div className="hidden items-stretch lg:flex lg:gap-6">
            {/* the rail: a track with a springed fill bound to scroll progress */}
            <div className="relative w-px flex-none self-stretch bg-line">
              <motion.div
                aria-hidden
                className="absolute inset-0 w-px origin-top bg-signal"
                style={{ scaleY: fill }}
              />
            </div>

            <ul className="flex flex-col gap-7">
              {PHASES.map((p, i) => {
                const on = i === active;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() =>
                        blockRefs.current[i]?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        })
                      }
                      className="group flex w-full items-baseline gap-4 text-left"
                    >
                      <motion.span
                        className="font-mono text-sm tabular-nums"
                        animate={{
                          color: on ? "var(--signal)" : "var(--line-strong)",
                          opacity: on ? 1 : 0.6,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </motion.span>
                      <motion.span
                        className="font-serif text-2xl tracking-tight"
                        animate={{
                          color: on ? "var(--ink)" : "var(--ink-soft)",
                          opacity: on ? 1 : 0.5,
                          x: on ? 0 : -2,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {p.nav}
                      </motion.span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* RIGHT — scrolling content blocks */}
        <div className="flex flex-col gap-16 sm:gap-20 lg:gap-40">
          {PHASES.map((p, i) => (
            <article
              key={p.id}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
              className="scroll-mt-28"
            >
              <p className="kicker mb-4 flex items-center gap-2 text-signal lg:hidden">
                <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>
                {p.nav}
              </p>
              <WordReveal
                as="h3"
                className="display-serif text-[clamp(1.7rem,6vw,3rem)] text-ink"
                text={p.heading}
                accent={p.accent}
                accentClass="italic text-signal-deep"
              />
              <MaskReveal delay={140} className="mt-5">
                <p className="max-w-md text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
                  {p.body}
                </p>
              </MaskReveal>

              <Reveal delay={120} y={28} className="mt-9">
                <Parallax distance={28}>
                  <Tilt max={6}>
                    <StoryMock index={i} />
                  </Tilt>
                </Parallax>
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----- the three product mockups, one per phase ----- */

function StoryMock({ index }: { index: number }) {
  if (index === 0) {
    return (
      <MockWindow title="Northwind Sync" meta="brief">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2">
            <Chip accent>brief · ready</Chip>
            <span className="font-mono text-[0.62rem] text-ink-soft/70">
              external · 30 min
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            <NoteLine accent>3 open questions carried from the last call.</NoteLine>
            <NoteLine>Last decision: ship the pilot to 5 accounts.</NoteLine>
            <NoteLine dim>Still unresolved: the pricing tier rename.</NoteLine>
          </ul>
          <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
            <span className="text-xs text-ink-soft">Attendees</span>
            <div className="flex -space-x-2">
              {["NM", "MA", "DK", "YV"].map((a) => (
                <Avatar key={a} initials={a} className="h-6 w-6 ring-2 ring-white" />
              ))}
            </div>
          </div>
        </div>
      </MockWindow>
    );
  }

  if (index === 1) {
    return (
      <MockWindow title="Live · Q3 GTM sync" meta="14:32" tone="dark">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <Chip accent dark>live transcript</Chip>
            <span className="flex items-end gap-[2px] h-3">
              {[0, 1, 2, 3].map((b) => (
                <span
                  key={b}
                  className="eq-bar w-[2px] rounded-full bg-signal"
                  style={{ height: "100%", animationDelay: `${b * 0.12}s` }}
                />
              ))}
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            <NoteLine dark accent>Decision: cut migration scope for Q2.</NoteLine>
            <NoteLine dark>Action: Yash owns the cutover — due Thursday.</NoteLine>
            <NoteLine dark dim>Question to ask: who signs off on the rename?</NoteLine>
          </ul>
        </div>
      </MockWindow>
    );
  }

  return (
    <MockWindow title="After · Q3 GTM sync" meta="ready">
      <div className="px-5 py-5">
        <Chip accent>action items · assigned</Chip>
        <ul className="mt-4 space-y-2.5">
          {[
            { t: "Re-time the Q2 migration plan", who: "MA" },
            { t: "Reconcile the May 12 decision", who: "DK" },
            { t: "Own the Thursday cutover", who: "YV" },
          ].map((item) => (
            <li
              key={item.t}
              className="flex items-center justify-between rounded-lg border border-line bg-paper-2/40 px-3 py-2"
            >
              <span className="flex items-center gap-2.5">
                <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-signal text-white">
                  <svg viewBox="0 0 10 10" className="h-2 w-2" aria-hidden>
                    <path d="M1 5l2.5 2.5L9 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-[0.84rem] text-ink/85">{item.t}</span>
              </span>
              <Avatar initials={item.who} className="h-5 w-5" />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
          <Chip>owners assigned</Chip>
          <Chip>follow-ups sent</Chip>
        </div>
      </div>
    </MockWindow>
  );
}
