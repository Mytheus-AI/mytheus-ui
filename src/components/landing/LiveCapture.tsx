"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { Reveal } from "./motion";
import { Eyebrow } from "./ui";

/* ================================================================== */
/*  LiveCapture — "in the room". A fast, self-contained live panel: the  */
/*  meeting transcript streams in on the left and your agent's structured */
/*  captures pop out on the right, in sync, one moment at a time. It      */
/*  auto-plays when scrolled into view (no scroll-jacking), holds the     */
/*  finished session, then quietly loops. Fixed size — nothing reflows.   */
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

  const revealed = MOMENTS.slice(0, step);
  const activeKind = step > 0 ? MOMENTS[step - 1].kind : null;

  return (
    <section id="product" className="py-24 sm:py-32">
      <div ref={ref} className="mx-auto max-w-[1100px] px-5 sm:px-7">
        <Reveal className="text-center">
          <Eyebrow>In the room</Eyebrow>
          <h2 className="display mx-auto mt-4 max-w-[18ch] text-[clamp(2rem,5vw,3.6rem)]">
            Intelligence, as it&apos;s said.
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-[17px] leading-relaxed text-ink-3">
            Your agent turns the live conversation into structured, confirmable
            memory — in real time, one moment at a time.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-12">
          <div className="mesh-field mesh-anim grain relative overflow-hidden rounded-[28px] border border-line p-4 pt-3 sm:p-6 sm:pt-4">
            {/* panel header — reads as a live, running session */}
            <div className="relative flex items-center justify-between gap-3 px-1.5 pb-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1.5 text-[13px] font-medium text-ink-2 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="glow-pulse absolute inline-flex h-full w-full rounded-full bg-signal opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                </span>
                Live · Q3 Launch Sync
                <span className="ml-0.5 flex items-end gap-[2px]" aria-hidden>
                  {EQ_BARS.map((b) => (
                    <motion.span
                      key={b}
                      className="w-[2px] rounded-full bg-signal"
                      style={{ height: 11, transformOrigin: "bottom" }}
                      animate={
                        reduce ? { scaleY: 0.45 } : { scaleY: [0.3, 1, 0.5, 0.85, 0.3] }
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
              <span className="hidden items-center gap-1.5 text-[12px] font-medium text-ink-3 sm:inline-flex">
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

            {/* the split: transcript streams in -> captures pop out.
                items-stretch keeps both bordered boxes the same height so the
                panel stays balanced even though the transcript is more compact
                than the stacked capture cards. */}
            <div className="relative grid items-stretch gap-3 lg:grid-cols-[1.05fr_auto_0.95fr] lg:gap-0">
              {/* LEFT — live transcript, grows top-down as lines arrive */}
              <div className="rounded-card border border-line bg-white/55 p-4 backdrop-blur-sm sm:p-5">
                <p className="kicker mb-3 text-ink-3">Transcript</p>
                <motion.div
                  layout={!reduce}
                  className="flex flex-col gap-2"
                >
                  <AnimatePresence initial={false}>
                    {revealed.map((mm, idx) => {
                      const active = idx === step - 1;
                      return (
                        <motion.div
                          key={mm.said}
                          layout={!reduce}
                          initial={reduce ? false : { opacity: 0, x: -14, height: 0 }}
                          animate={{ opacity: active ? 1 : 0.55, x: 0, height: "auto" }}
                          exit={reduce ? undefined : { opacity: 0, x: -14, height: 0 }}
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
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* MIDDLE — flow indicator: a dot pings across on each capture */}
              <div className="relative hidden w-12 lg:block lg:self-stretch" aria-hidden>
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

              {/* RIGHT — structured captures, color-coded by kind */}
              <div className="rounded-card border border-line bg-white/55 p-4 backdrop-blur-sm sm:p-5">
                <p className="kicker mb-3 text-signal">Captured</p>
                <motion.div
                  layout={!reduce}
                  className="flex flex-col gap-2"
                >
                  <AnimatePresence initial={false}>
                    {revealed.map((mm, idx) => {
                      const accent = KIND_ACCENT[mm.kind];
                      const active = idx === step - 1;
                      return (
                        <motion.div
                          key={mm.captured}
                          layout={!reduce}
                          initial={
                            reduce ? false : { opacity: 0, y: 12, scale: 0.96 }
                          }
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={
                            reduce ? undefined : { opacity: 0, y: -8, scale: 0.96 }
                          }
                          transition={{
                            duration: 0.5,
                            ease: EASE,
                            delay: reduce ? 0 : 0.28,
                          }}
                          className="relative flex items-stretch gap-2.5 rounded-xl border border-line bg-white p-3 shadow-[0_18px_36px_-26px_rgba(40,30,20,0.4)]"
                        >
                          <span
                            className={`w-1 flex-none rounded-full ${accent.bar}`}
                          />
                          <div className="min-w-0">
                            <span className={`kicker ${accent.label}`}>
                              {KIND_LABEL[mm.kind]}
                            </span>
                            <p className="mt-1 text-[14px] font-medium leading-snug text-ink">
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
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
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
                      on
                        ? "bg-signal text-white"
                        : "border border-line text-ink-3"
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
