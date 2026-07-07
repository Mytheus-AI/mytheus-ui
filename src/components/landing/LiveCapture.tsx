"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { Reveal, WordReveal } from "./motion";
import { Eyebrow } from "./ui";

/* ================================================================== */
/*  LiveCapture — "in the room". A fast, self-contained live panel: the  */
/*  meeting transcript streams in on the left and your agent's           */
/*  structured captures pop out on the right, in sync, one moment at a   */
/*  time. It auto-plays when scrolled into view (no scroll-jacking),     */
/*  holds the finished session, then quietly loops. The two columns      */
/*  reserve their full height up front so the panel never reflows.       */
/* ================================================================== */

type Kind = "note" | "decision" | "action" | "conflict" | "context";

const KIND_LABEL: Record<Kind, string> = {
  note: "Note",
  decision: "Decision",
  action: "Action item",
  conflict: "Conflict",
  context: "Context",
};

// Accents stay inside the warm/terracotta brand palette; intensity carries
// the meaning (conflict is the strongest, context the most muted).
const KIND_ACCENT: Record<Kind, { bar: string; label: string }> = {
  note: { bar: "bg-signal-bright", label: "text-signal" },
  decision: { bar: "bg-signal", label: "text-signal" },
  action: { bar: "bg-signal", label: "text-signal" },
  conflict: { bar: "bg-signal-deep", label: "text-signal-deep" },
  context: { bar: "bg-line-2", label: "text-ink-3" },
};

type Moment = {
  who: string;
  initial: string;
  agent?: boolean;
  said: string;
  kind: Kind;
  captured: string;
};

const MOMENTS: Moment[] = [
  {
    who: "Maya",
    initial: "M",
    said: "Let's lock the Q3 launch — I'm proposing August 12.",
    kind: "decision",
    captured: "Q3 launch targeted for August 12.",
  },
  {
    who: "Raj's agent",
    initial: "R",
    agent: true,
    said: "Raj's out — QA needs two extra days after code freeze.",
    kind: "context",
    captured: "From Raj's agent: QA needs +2 days after freeze.",
  },
  {
    who: "Priya",
    initial: "P",
    said: "Then the 12th is too tight — QA would still be running.",
    kind: "conflict",
    captured: "Aug 12 conflicts with the QA window.",
  },
  {
    who: "Maya",
    initial: "M",
    said: "Good catch — let's move the launch to August 14.",
    kind: "decision",
    captured: "Launch moved to August 14.",
  },
  {
    who: "Maya",
    initial: "M",
    said: "I'll update the launch checklist by Friday.",
    kind: "action",
    captured: "Maya: update checklist — due Fri.",
  },
];

const N = MOMENTS.length;
const STEP_MS = 1150; // time each new moment takes to arrive
const HOLD_MS = 2600; // dwell on the finished session before looping
const EQ_BARS = [0, 1, 2, 3];
const EASE = [0.16, 1, 0.3, 1] as const;

export function LiveCapture() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-15% 0px -15% 0px" });

  // `step` = how many moments have arrived (0..N). step-1 is the latest.
  const [step, setStep] = useState(0);

  // Reduced motion: show the whole finished session, no animation/loop.
  useEffect(() => {
    if (reduce) setStep(N);
  }, [reduce]);

  // Self-scheduling loop: each step queues the next; the end holds, then resets.
  useEffect(() => {
    if (reduce || !inView) return;
    const atEnd = step >= N;
    const id = window.setTimeout(
      () => setStep(atEnd ? 0 : step + 1),
      atEnd ? HOLD_MS : STEP_MS,
    );
    return () => window.clearTimeout(id);
  }, [step, inView, reduce]);

  const activeKind = step > 0 ? MOMENTS[step - 1].kind : null;

  return (
    <section id="product" className="py-24 sm:py-32">
      <div ref={ref} className="mx-auto max-w-[1100px] px-5 sm:px-7">
        <Reveal className="text-center">
          <Eyebrow>In the room</Eyebrow>
          <WordReveal
            as="h2"
            text="Intelligence,"
            accent="as it's said."
            accentClass="text-gradient-signal"
            className="display mx-auto mt-4 max-w-[18ch] text-[clamp(2rem,5vw,3.6rem)]"
          />
          <p className="mx-auto mt-4 max-w-[48ch] text-[17px] leading-relaxed text-ink-3">
            Your agent turns the live conversation into structured, confirmable
            memory — in real time, one moment at a time.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-12">
          <div className="mesh-field mesh-anim grain relative overflow-hidden rounded-[28px] border border-line p-3 pt-2.5 sm:p-5 sm:pt-3.5">
            {/* panel header — reads as a live, running session */}
            <div className="relative flex items-center justify-between gap-3 px-1.5 pb-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1.5 text-[13px] font-medium text-ink-2 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="glow-pulse absolute inline-flex h-full w-full rounded-full bg-signal opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                </span>
                <span className="whitespace-nowrap">
                  Live
                  <span className="hidden min-[420px]:inline">
                    {" · Q3 Launch Sync"}
                  </span>
                </span>
                <span className="ml-0.5 flex items-end gap-[2px]" aria-hidden>
                  {EQ_BARS.map((b) => (
                    <motion.span
                      key={b}
                      className="w-[2px] rounded-full bg-signal"
                      style={{ height: 11, transformOrigin: "bottom" }}
                      animate={
                        reduce
                          ? { scaleY: 0.45 }
                          : { scaleY: [0.3, 1, 0.5, 0.85, 0.3] }
                      }
                      transition={
                        reduce
                          ? undefined
                          : {
                              duration: 1.1,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: b * 0.13,
                            }
                      }
                    />
                  ))}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-ink-3">
                <motion.span
                  key={`c-${step}`}
                  initial={reduce ? false : { scale: 1.3, color: "var(--signal)" }}
                  animate={{ scale: 1, color: "var(--ink-3)" }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="tabular-nums"
                >
                  {step}
                </motion.span>
                captured
              </span>
            </div>

            {/* the split: transcript streams in -> captures pop out. Every
                moment has a pre-laid slot (ghost placeholder until it
                arrives), so the panel is the same size at step 0 and step 5
                — nothing grows, nothing reflows, at any breakpoint. */}
            <div className="relative grid items-stretch gap-3 lg:grid-cols-[1.05fr_auto_0.95fr] lg:gap-0">
              {/* LEFT — live transcript, lines land in their slots */}
              <div className="rounded-card border border-line bg-white/55 p-4 backdrop-blur-sm sm:p-5">
                <p className="kicker mb-3 text-ink-3">Transcript</p>
                <div className="flex flex-col gap-2.5">
                  {MOMENTS.map((mm, idx) => {
                    const revealed = idx < step;
                    const active = idx === step - 1;
                    return (
                      // slot heights reserve the worst-case wrapped line count
                      // per breakpoint tier, so a landing line never grows the
                      // panel (3 lines <360px, 2 lines to sm and again around
                      // lg where the column narrows, 1 line elsewhere)
                      <div
                        key={mm.said}
                        className="min-h-[76px] min-[360px]:min-h-[58px] sm:min-h-[42px] lg:min-h-[58px] xl:min-h-[42px]"
                      >
                        <AnimatePresence initial={false} mode="wait">
                          {revealed ? (
                            <motion.div
                              key="line"
                              initial={reduce ? false : { opacity: 0, x: -14 }}
                              animate={{ opacity: active ? 1 : 0.55, x: 0 }}
                              transition={{ duration: 0.45, ease: EASE }}
                              className="flex items-start gap-2.5"
                            >
                              <span
                                className={`mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-medium ${
                                  mm.agent
                                    ? "border border-dashed border-signal bg-signal-soft text-signal-deep"
                                    : "bg-white text-ink-2 ring-1 ring-line"
                                }`}
                              >
                                {mm.initial}
                              </span>
                              <div className="min-w-0">
                                <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
                                  {mm.who}
                                  {mm.agent && (
                                    <span className="rounded-full bg-signal-soft px-1.5 py-px text-[9px] uppercase tracking-wide text-signal-deep">
                                      agent
                                    </span>
                                  )}
                                </span>
                                <p className="text-[14px] leading-snug text-ink-2">
                                  {mm.said}
                                </p>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="ghost"
                              exit={reduce ? undefined : { opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-2.5 pt-1"
                              aria-hidden
                            >
                              <span className="h-6 w-6 flex-none rounded-full border border-dashed border-line-2" />
                              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <span className="h-1.5 w-14 rounded-full bg-line-2/70" />
                                <span
                                  className="h-1.5 rounded-full bg-line-2/50"
                                  style={{ width: `${58 + (idx % 3) * 13}%` }}
                                />
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MIDDLE — flow indicator: a dot pings across on each capture */}
              <div
                className="relative hidden w-12 lg:block lg:self-stretch"
                aria-hidden
              >
                <div className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 bg-line-2" />
                {!reduce && step > 0 && (
                  <motion.span
                    key={`beam-${step}`}
                    className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_8px_rgba(217,119,87,0.7)]"
                    initial={{ left: "18%", opacity: 0 }}
                    animate={{ left: "82%", opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />
                )}
              </div>

              {/* RIGHT — structured captures land in their slots */}
              <div className="rounded-card border border-line bg-white/55 p-4 backdrop-blur-sm sm:p-5">
                <p className="kicker mb-3 text-signal">Captured</p>
                <div className="flex flex-col gap-2.5">
                  {MOMENTS.map((mm, idx) => {
                    const revealed = idx < step;
                    const accent = KIND_ACCENT[mm.kind];
                    const active = idx === step - 1;
                    return (
                      <div
                        key={mm.captured}
                        className="min-h-[80px] sm:min-h-[66px] lg:min-h-[84px] xl:min-h-[66px]"
                      >
                        <AnimatePresence initial={false} mode="wait">
                          {revealed ? (
                            <motion.div
                              key="card"
                              initial={
                                reduce ? false : { opacity: 0, y: 10, scale: 0.97 }
                              }
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{
                                duration: 0.5,
                                ease: EASE,
                                delay: reduce ? 0 : 0.28,
                              }}
                              className="relative flex h-full items-stretch gap-2.5 rounded-xl border border-line bg-white p-2.5 shadow-[0_18px_36px_-26px_rgba(40,30,20,0.4)] sm:p-3"
                            >
                              <span
                                className={`w-1 flex-none rounded-full ${accent.bar}`}
                              />
                              <div className="min-w-0">
                                <span className={`kicker ${accent.label}`}>
                                  {KIND_LABEL[mm.kind]}
                                </span>
                                <p className="mt-0.5 text-[14px] font-medium leading-snug text-ink">
                                  {mm.captured}
                                </p>
                              </div>
                              {active && !reduce && (
                                <motion.span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-signal"
                                  initial={{ opacity: 0.7 }}
                                  animate={{ opacity: 0 }}
                                  transition={{ duration: 0.9, ease: "easeOut" }}
                                />
                              )}
                            </motion.div>
                          ) : (
                            <motion.div
                              key="ghost"
                              exit={reduce ? undefined : { opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex h-full items-stretch gap-2.5 rounded-xl border border-dashed border-line-2 p-2.5 sm:p-3"
                              aria-hidden
                            >
                              <span className="w-1 flex-none rounded-full bg-line-2/60" />
                              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                                <span className="h-1.5 w-16 rounded-full bg-line-2/70" />
                                <span
                                  className="h-1.5 rounded-full bg-line-2/50"
                                  style={{ width: `${52 + ((idx + 1) % 3) * 15}%` }}
                                />
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* footer legend — the full range; the active kind lights up */}
            <div className="relative mt-4 flex flex-wrap items-center justify-center gap-1.5 px-1">
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => {
                const on = k === activeKind;
                return (
                  <span
                    key={k}
                    className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors duration-500 ${
                      on ? "bg-signal text-white" : "border border-line text-ink-3"
                    }`}
                  >
                    {KIND_LABEL[k]}
                  </span>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
