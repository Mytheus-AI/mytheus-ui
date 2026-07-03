"use client";

import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { Reveal, MaskReveal, ScrollScale } from "./motion";
import { Eyebrow, ArrowRight } from "./ui";
import { ConnectedGraph } from "./ConnectedGraph";
import {
  mockTeamCapacity,
  mockSourcedAnswer,
  type TeammateCapacity,
} from "@/lib/mock/data";

/* Statement — "between meetings" as one enterprise cause→effect story
   (4-July Part 2): Q3 planning proposes handing the pricing rework to Sarah;
   the agents read the team's workload and catch that she's over capacity;
   ContextGapAgent asks her agent for the prior pricing decision and a sourced
   answer returns, with its decision lineage. Left: the capacity bar chart
   (the hero visual). Right: the agent exchange + sourced answer. Everything
   is data-driven from mockTeamCapacity / mockSourcedAnswer; the 95% bar is
   the single red attention accent. Reduced motion renders final frames. */

const EASE = [0.16, 1, 0.3, 1] as const;

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

      <Reveal delay={120} className="mx-auto mt-14 max-w-[1180px] px-2 sm:px-5">
        <ScrollScale from={0.96}>
          <div className="mesh-field mesh-anim grain relative overflow-hidden rounded-[28px] border border-line p-5 sm:p-10">
            {/* Beat 1 — the trigger: what the room just said */}
            <TriggerLine />

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-7">
              {/* Beat 2 — the workload read (the hero visual) */}
              <CapacityCard />

              {/* Beat 3 — the sourced context */}
              <div className="flex flex-col gap-5">
                <AgentExchange />
                <SourcedCard />
                <DependencyCard />
              </div>
            </div>
          </div>
        </ScrollScale>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Beat 1 — the transcript line that sets everything off              */
/* ------------------------------------------------------------------ */

function TriggerLine() {
  return (
    <MaskReveal y={40} className="mx-auto max-w-[640px]">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/90 px-4 py-3 shadow-[0_24px_48px_-32px_rgba(40,30,20,0.35)] sm:gap-4 sm:px-5">
        <span className="kicker shrink-0 text-[10px] text-ink-3">Q3 planning · live</span>
        <p className="min-w-0 flex-1 truncate text-left text-[14px] font-medium text-ink sm:text-[15px]">
          &ldquo;Let&rsquo;s put the pricing rework on Sarah for Q3.&rdquo;
        </p>
        {/* your agent leans in */}
        <ConnectedGraph signal className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
      </div>
    </MaskReveal>
  );
}

/* ------------------------------------------------------------------ */
/*  Beat 2 — the team-capacity bar chart                               */
/* ------------------------------------------------------------------ */

const BAR_COLOR: Record<TeammateCapacity["state"], string> = {
  over: "bg-priority-high",
  near: "bg-priority-medium",
  ok: "bg-signal",
};

function CapacityCard() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const show = inView || !!reduce;

  return (
    <div
      ref={ref}
      className="rounded-card border border-line bg-white p-5 shadow-[0_40px_80px_-48px_rgba(40,30,20,0.35)] sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-medium tracking-tight text-ink-display">
          Team capacity · this sprint
        </p>
        <span className="kicker text-[10px] text-ink-3">utilization</span>
      </div>

      <div className="mt-5 space-y-3.5">
        {mockTeamCapacity.map((t, i) => (
          <CapacityRow key={t.name} t={t} index={i} show={show} reduce={!!reduce} />
        ))}
      </div>

      {/* ProactiveAgent's 95% warning — the single red attention accent */}
      <motion.div
        initial={false}
        animate={
          show
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: reduce ? 0 : 10 }
        }
        transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 1.7 }}
        className="mt-5 flex items-start gap-2.5 rounded-xl border border-priority-high/25 bg-priority-high-soft px-4 py-3"
      >
        <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-priority-high" />
        <p className="text-left text-[13px] font-medium leading-snug text-priority-high">
          Sarah is at 96% — over capacity this sprint.
        </p>
      </motion.div>
    </div>
  );
}

function CapacityRow({
  t,
  index,
  show,
  reduce,
}: {
  t: TeammateCapacity;
  index: number;
  show: boolean;
  reduce: boolean;
}) {
  const grow: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.9, ease: EASE, delay: 0.3 + index * 0.12 };

  return (
    <div className="grid grid-cols-[64px_1fr_44px] items-center gap-3 sm:grid-cols-[76px_1fr_48px]">
      <span
        className={`truncate text-left text-[13px] ${
          t.state === "over" ? "font-semibold text-priority-high" : "text-ink-2"
        }`}
      >
        {t.name}
      </span>

      <span className="relative h-[18px] overflow-hidden rounded-full bg-bg-2">
        <motion.span
          className={`absolute inset-y-0 left-0 rounded-full ${BAR_COLOR[t.state]}`}
          initial={false}
          animate={{ width: show ? `${t.util}%` : "0%" }}
          transition={grow}
        />
        {/* the over-capacity bar pulses once, after it lands */}
        {t.state === "over" && !reduce && show && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-full bg-priority-high"
            style={{ width: `${t.util}%` }}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.55, 0], scale: [1, 1.06, 1.1] }}
            transition={{ duration: 1.1, delay: 1.5, ease: "easeOut" }}
          />
        )}
      </span>

      <span
        className={`text-right font-mono text-[12px] tabular-nums ${
          t.state === "over"
            ? "font-bold text-priority-high"
            : t.state === "near"
              ? "text-priority-medium"
              : "text-ink-3"
        }`}
      >
        {t.util}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Beat 3 — the agent exchange + the sourced answer                   */
/* ------------------------------------------------------------------ */

/* the query pulse: ContextGapAgent asks Sarah's agent, the answer returns.
   Fires once per in-view loop; the orbs are identity glyphs, subordinate to
   the chart. */
function AgentExchange() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -15% 0px" });
  const active = inView && !reduce;

  const TRAVEL = 1.6;
  const CYCLE = 4.6;
  const GAP = CYCLE - TRAVEL;
  const ANSWER_DELAY = 2.0;

  const dot = (delay: number, back = false): Transition => ({
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
      times: back ? [0, 0.15, 0.85, 1] : [0, 0.12, 0.85, 1],
      repeat: Infinity,
      repeatDelay: GAP,
      delay,
    },
  });

  return (
    <div
      ref={ref}
      className="rounded-card border border-line bg-white/80 px-4 py-3.5 sm:px-5"
    >
      <div className="flex items-center gap-3">
        <AgentGlyph signal label="Your agent" />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="kicker shrink-0 text-[9.5px] text-signal">asks</span>
            <span className="relative h-px flex-1 overflow-hidden bg-line-2">
              <motion.span
                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-signal"
                animate={
                  active
                    ? { left: ["-4%", "104%"], opacity: [0, 1, 1, 0] }
                    : { left: "-4%", opacity: 0 }
                }
                transition={active ? dot(0) : { duration: 0.3 }}
              />
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-signal" />
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 rotate-180 text-ink-display" />
            <span className="relative h-px flex-1 overflow-hidden bg-line-2">
              <motion.span
                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-ink-display"
                animate={
                  active
                    ? { left: ["104%", "-4%"], opacity: [0, 1, 1, 0] }
                    : { left: "104%", opacity: 0 }
                }
                transition={active ? dot(ANSWER_DELAY, true) : { duration: 0.3 }}
              />
            </span>
            <span className="kicker shrink-0 text-[9.5px] text-ink-3">sourced</span>
          </div>
        </div>

        <AgentGlyph label="Sarah's agent" />
      </div>
    </div>
  );
}

function AgentGlyph({ label, signal = false }: { label: string; signal?: boolean }) {
  return (
    <div className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-[76px]">
      <ConnectedGraph signal={signal} className="h-10 w-10 sm:h-12 sm:w-12" />
      <p className="text-[10.5px] font-medium leading-tight tracking-tight text-ink-2 sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

function SourcedCard() {
  return (
    <MaskReveal delay={250} y={56}>
      <div className="card-interactive rounded-card border border-line bg-white p-5 shadow-[0_40px_80px_-32px_rgba(40,30,20,0.25)] sm:p-6">
        <p className="text-left text-[clamp(1.05rem,1.8vw,1.3rem)] font-medium leading-snug tracking-tight text-ink-display">
          &ldquo;{mockSourcedAnswer.quote}&rdquo;
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2">
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
            <span className="kicker text-ink-3">
              Sourced · {mockSourcedAnswer.source.meeting} ·{" "}
              {mockSourcedAnswer.source.date}
            </span>
          </span>

          {/* decision lineage — the FOLLOWS_FROM chain */}
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-3 py-1">
            {mockSourcedAnswer.lineage.map((m, i) => (
              <span key={m} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="h-3 w-3 text-ink-3" />}
                <span className="text-[11.5px] font-medium text-ink-2">{m}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </MaskReveal>
  );
}

function DependencyCard() {
  return (
    <MaskReveal delay={420} y={40}>
      <div className="flex items-start gap-2.5 rounded-xl border border-priority-medium/30 bg-priority-medium-soft px-4 py-3">
        <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-priority-medium" />
        <p className="text-left text-[13px] font-medium leading-snug text-priority-medium">
          Pricing rework blocks the Q3 launch date.
        </p>
      </div>
    </MaskReveal>
  );
}
