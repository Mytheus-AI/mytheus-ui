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

// legend chips in the order each kind first appears in the session
// (Note closes the range — this session happens not to produce one)
const LEGEND_ORDER: Kind[] = ["decision", "context", "conflict", "action", "note"];

const STEP_MS = 1150; // time each new moment takes to arrive
const HOLD_MS = 2600; // dwell on the finished session before looping
const EQ_BARS = [0, 1, 2, 3];
const EASE = [0.16, 1, 0.3, 1] as const;

// ONE slot height, shared by all three columns per breakpoint, so every
// transcript line sits exactly opposite the capture it produced and the
// connector beam pings on the right row. Sized to the worst-case wrapped
// line count of each tier.
const SLOT =
  "min-h-[80px] min-[360px]:min-h-[68px] sm:min-h-[62px] lg:min-h-[78px] xl:min-h-[60px]";

/* the active line streams in word by word — live captions, as it's said */
function StreamWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <p className="text-[14px] leading-snug text-ink-2">
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.3, ease: EASE, delay: 0.06 + i * 0.05 }}
        >
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </p>
  );
}

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

  // running tally per kind — the legend doubles as the session scoreboard
  const counts: Partial<Record<Kind, number>> = {};
  for (const m of MOMENTS.slice(0, step)) {
    counts[m.kind] = (counts[m.kind] ?? 0) + 1;
  }

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

            {/* session progress — fills a notch per capture, drains on loop */}
            <div className="relative mx-1.5 mb-3 h-[3px] overflow-hidden rounded-full bg-line/60">
              <motion.div
                className="h-full rounded-full bg-signal"
                initial={false}
                animate={{ width: `${(step / N) * 100}%` }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            </div>

            {/* the split: transcript streams in -> captures pop out. All
                three columns share the SAME slot heights (SLOT), so every
                line sits exactly opposite the capture it produced and the
                beam pings on that row. Pre-laid ghost slots keep the panel
                pixel-constant from step 0 to step N. */}
            <div className="relative grid items-stretch gap-3 lg:grid-cols-[1.05fr_44px_0.95fr] lg:gap-0">
              {/* LEFT — live transcript, lines land in their slots */}
              <div className="rounded-card border border-line bg-white/55 p-4 backdrop-blur-sm sm:p-5">
                <p className="kicker mb-3 text-ink-3">Transcript</p>
                <div className="flex flex-col gap-2">
                  {MOMENTS.map((mm, idx) => {
                    const revealed = idx < step;
                    const active = idx === step - 1;
                    return (
                      <div key={mm.said} className={`${SLOT} flex`}>
                        <AnimatePresence initial={false} mode="wait">
                          {revealed ? (
                            <motion.div
                              key="line"
                              initial={reduce ? false : { opacity: 0, x: -14 }}
                              animate={{ opacity: active ? 1 : 0.55, x: 0 }}
                              transition={{ duration: 0.45, ease: EASE }}
                              className="flex min-w-0 flex-1 items-center gap-2.5"
                            >
                              <span
                                className={`inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-medium ${
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
                                {active && !reduce ? (
                                  <StreamWords text={mm.said} />
                                ) : (
                                  <p className="text-[14px] leading-snug text-ink-2">
                                    {mm.said}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="ghost"
                              exit={reduce ? undefined : { opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex min-w-0 flex-1 items-center gap-2.5"
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

              {/* MIDDLE — one connector per row: the hairline brightens and a
                  dot beams across the moment its row's capture lands */}
              <div
                className="hidden py-4 sm:py-5 lg:flex lg:flex-col"
                aria-hidden
              >
                <p className="kicker mb-3 select-none opacity-0">·</p>
                <div className="flex flex-1 flex-col gap-2">
                  {MOMENTS.map((mm, idx) => {
                    const active = idx === step - 1;
                    return (
                      <div key={mm.said} className={`${SLOT} relative`}>
                        <div
                          className={`absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 -translate-y-1/2 transition-colors duration-500 ${
                            idx < step ? "bg-signal/40" : "bg-line-2"
                          }`}
                        />
                        {active && !reduce && (
                          <motion.span
                            key={`beam-${step}`}
                            className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_8px_rgba(217,119,87,0.7)]"
                            initial={{ left: "8%", opacity: 0 }}
                            animate={{ left: "80%", opacity: [0, 1, 1, 0] }}
                            transition={{
                              duration: 0.55,
                              ease: "easeInOut",
                              delay: 0.25,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT — structured captures land in their slots */}
              <div className="rounded-card border border-line bg-white/55 p-4 backdrop-blur-sm sm:p-5">
                <p className="kicker mb-3 text-signal">Captured</p>
                <div className="flex flex-col gap-2">
                  {MOMENTS.map((mm, idx) => {
                    const revealed = idx < step;
                    const accent = KIND_ACCENT[mm.kind];
                    const active = idx === step - 1;
                    return (
                      <div key={mm.captured} className={`${SLOT} flex`}>
                        <AnimatePresence initial={false} mode="wait">
                          {revealed ? (
                            <motion.div
                              key="card"
                              initial={
                                reduce ? false : { opacity: 0, y: 14, scale: 0.94 }
                              }
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={
                                reduce
                                  ? { duration: 0.5, ease: EASE }
                                  : {
                                      type: "spring",
                                      stiffness: 380,
                                      damping: 26,
                                      delay: 0.5,
                                    }
                              }
                              className="relative flex min-w-0 flex-1 items-stretch gap-2.5 rounded-xl border border-line bg-white p-2.5 shadow-[0_18px_36px_-26px_rgba(40,30,20,0.4)] sm:p-3"
                            >
                              <span
                                className={`w-1 flex-none rounded-full ${accent.bar}`}
                              />
                              <div className="min-w-0 self-center">
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
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: [0, 0.7, 0] }}
                                  transition={{
                                    duration: 1.1,
                                    ease: "easeOut",
                                    delay: 0.5,
                                  }}
                                />
                              )}
                            </motion.div>
                          ) : (
                            <motion.div
                              key="ghost"
                              exit={reduce ? undefined : { opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex min-w-0 flex-1 items-stretch gap-2.5 rounded-xl border border-dashed border-line-2 p-2.5 sm:p-3"
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

            {/* footer legend — a live tally, in the order each kind enters
                the session: the active kind pops solid, kinds already
                captured stay warm with their running count, the rest wait */}
            <div className="relative mt-3.5 flex flex-wrap items-center justify-center gap-1.5 px-1">
              {LEGEND_ORDER.map((k) => {
                const on = k === activeKind;
                const n = counts[k] ?? 0;
                return (
                  <motion.span
                    key={on && !reduce ? `${k}-${step}` : k}
                    initial={on && !reduce ? { scale: 0.82 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 20 }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors duration-500 ${
                      on
                        ? "bg-signal text-white"
                        : n > 0
                          ? "border border-signal/25 bg-signal-soft/70 text-signal-deep"
                          : "border border-line text-ink-3"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        on ? "bg-white" : n > 0 ? "bg-signal" : "bg-line-2"
                      }`}
                    />
                    {KIND_LABEL[k]}
                    {n > 0 && (
                      <motion.span
                        key={`n-${n}`}
                        initial={reduce ? false : { scale: 1.45 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        className={`tabular-nums text-[11px] font-semibold ${
                          on ? "text-white/90" : "text-signal-deep/80"
                        }`}
                      >
                        {n}
                      </motion.span>
                    )}
                  </motion.span>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
