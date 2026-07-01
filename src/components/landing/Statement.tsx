"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion, type Transition } from "framer-motion";
import { Reveal, MaskReveal, Float } from "./motion";
import { Eyebrow, ArrowRight } from "./ui";
import { ConnectedGraph } from "./ConnectedGraph";

/* Statement — "between meetings". One focused idea: when your agent needs
   context, it asks another participant's agent, and a sourced answer returns.
   A single animated exchange carries it — no list of beats. */

export function Statement() {
  return (
    <section className="px-3 py-24 sm:px-5 sm:py-32">
      <div className="mx-auto max-w-[1100px] text-center">
        <Reveal>
          <Eyebrow>Between meetings</Eyebrow>
          <h2 className="display mx-auto mt-4 max-w-[16ch] text-[clamp(2.2rem,5.5vw,4rem)]">
            Your agents don&apos;t stop at the meeting.
          </h2>
          <p className="mx-auto mt-5 max-w-[50ch] text-[17px] leading-relaxed text-ink-3">
            When yours needs context, it asks another participant&apos;s agent —
            and the answer comes back sourced, from the exact meeting it happened
            in.
          </p>
        </Reveal>
      </div>

      <Reveal delay={120} className="mx-auto mt-14 max-w-[920px] px-2 sm:px-5">
        <div className="mesh-field mesh-anim grain relative overflow-hidden rounded-[28px] border border-line p-7 sm:p-14">
          {/* the two agents and the exchange between them */}
          <div className="relative flex items-start justify-between gap-3 sm:gap-6">
            <AgentNode
              signal
              label="Your agent"
              sub="needs a number"
              floatDuration={6.2}
              floatAmount={9}
            />
            <Exchange />
            <AgentNode
              label="Sarah's agent"
              sub="was in Q2 planning"
              floatDuration={8.4}
              floatAmount={12}
            />
          </div>

          {/* the sourced answer returning */}
          <MaskReveal delay={200} className="mx-auto mt-10 max-w-[540px]">
            <div className="card-interactive rounded-card border border-line bg-white p-6 shadow-[0_40px_80px_-32px_rgba(40,30,20,0.25)] sm:p-7">
              <p className="text-[clamp(1.15rem,2.2vw,1.5rem)] font-medium leading-snug tracking-tight text-ink-display">
                &ldquo;Pricing was locked at $49 in the Q2 planning call.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal text-white">
                  <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                    <path
                      d="M2.5 6.2 5 8.5 9.5 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="kicker text-ink-3">Sourced · Q2 Planning · Apr 3</span>
              </div>
            </div>
          </MaskReveal>
        </div>
      </Reveal>
    </section>
  );
}

function AgentNode({
  label,
  sub,
  signal = false,
  floatDuration = 7,
  floatAmount = 10,
}: {
  label: string;
  sub: string;
  signal?: boolean;
  floatDuration?: number;
  floatAmount?: number;
}) {
  return (
    <div className="flex w-[92px] shrink-0 flex-col items-center gap-3 text-center sm:w-[150px]">
      {/* each orb bobs on its own clock so the pair never moves in lockstep */}
      <Float duration={floatDuration} amount={floatAmount}>
        <ConnectedGraph signal={signal} className="h-16 w-16 sm:h-24 sm:w-24" />
      </Float>
      <div>
        <p className="text-[13px] font-medium tracking-tight text-ink-display sm:text-[14px]">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-3 sm:text-[12px]">{sub}</p>
      </div>
    </div>
  );
}

/* two thin tracks driven as one live exchange: the question pulse travels
   right, and only after it lands does the sourced answer travel back left —
   sequenced so cause → effect reads clearly, looping while in view. */
function Exchange() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -15% 0px" });
  const active = inView && !reduce;

  const TRAVEL = 1.7; // time a token takes to cross a track (s)
  const CYCLE = 4.4; // full loop (s)
  const GAP = CYCLE - TRAVEL; // repeatDelay so each token fires once per loop
  const ANSWER_DELAY = 2.0; // answer departs after the question has arrived

  const dotTransition = (delay: number): Transition => ({
    left: {
      duration: TRAVEL,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: GAP,
      delay,
    },
    opacity: {
      duration: TRAVEL,
      ease: "easeInOut",
      times: [0, 0.12, 0.85, 1],
      repeat: Infinity,
      repeatDelay: GAP,
      delay,
    },
  });

  const labelPulse = (delay: number): Transition =>
    active
      ? {
          duration: TRAVEL,
          times: [0, 0.3, 1],
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: GAP,
          delay,
        }
      : { duration: 0.3 };

  return (
    <div ref={ref} className="flex flex-1 flex-col justify-center gap-3 pt-5 sm:pt-7">
      {/* asks — pulses, then the question travels right */}
      <div className="flex items-center gap-2">
        <motion.span
          className="kicker shrink-0 text-signal"
          animate={active ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
          transition={labelPulse(0)}
        >
          asks
        </motion.span>
        <span className="relative h-px flex-1 overflow-hidden bg-line-2">
          <motion.span
            className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-signal"
            animate={
              active
                ? { left: ["-4%", "104%"], opacity: [0, 1, 1, 0] }
                : { left: "-4%", opacity: 0 }
            }
            transition={active ? dotTransition(0) : { duration: 0.3 }}
          />
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-signal" />
      </div>

      {/* sourced — the answer returns left, after the question lands */}
      <div className="flex items-center gap-2">
        <ArrowRight className="h-4 w-4 shrink-0 rotate-180 text-ink-display" />
        <span className="relative h-px flex-1 overflow-hidden bg-line-2">
          <motion.span
            className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-ink-display"
            animate={
              active
                ? { left: ["104%", "-4%"], opacity: [0, 1, 1, 0] }
                : { left: "104%", opacity: 0 }
            }
            transition={active ? dotTransition(ANSWER_DELAY) : { duration: 0.3 }}
          />
        </span>
        <motion.span
          className="kicker shrink-0 text-ink-3"
          animate={active ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
          transition={labelPulse(ANSWER_DELAY)}
        >
          sourced
        </motion.span>
      </div>
    </div>
  );
}
