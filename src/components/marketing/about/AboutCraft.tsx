"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { Reveal, WordReveal, Stagger, StaggerItem, Tilt } from "@/components/landing/motion";
import { Eyebrow, ArrowRight } from "@/components/landing/ui";

/* ================================================================== */
/*  AboutCraft — "What we build". Two beats:                           */
/*  1. A flagship strip for Mytheus: a wide tilting card with a live   */
/*     agent-activity ticker (capturing → labeling → routing →         */
/*     remembering) and a pill link home.                              */
/*  2. A disciplines grid — six cards, each with a tiny hand-built     */
/*     glyph that loops one calm motion and pauses off-screen.         */
/*  Every bespoke animation guards useReducedMotion with a complete    */
/*  static frame, and only runs while in view.                         */
/* ================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/** live = in the viewport AND motion is allowed. Glyphs animate only then. */
function useLive() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px -10% 0px" });
  return { ref, live: inView && !reduce, reduce: !!reduce };
}

/* ------------------------------------------------------------------ */
/*  Beat 1 — the flagship ticker                                       */
/* ------------------------------------------------------------------ */

const STAGES = ["capturing", "labeling", "routing", "remembering"] as const;

function AgentTicker() {
  const { ref, live, reduce } = useLive();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % STAGES.length), 1700);
    return () => clearInterval(id);
  }, [live]);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl border border-line bg-bg-2 p-5 sm:p-6"
    >
      {/* console header */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          {live && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-signal"
              animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <span className="relative h-2 w-2 rounded-full bg-signal" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          agent · in the room
        </span>
      </div>

      {/* the cycling verb */}
      <div className="mt-4 flex items-baseline gap-1 text-[clamp(1.5rem,4.5vw,2.1rem)] font-medium tracking-tight text-ink">
        {reduce ? (
          <span className="text-signal-deep">remembering</span>
        ) : (
          <span className="relative block h-[1.25em] min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={idx}
                className="block truncate text-signal-deep"
                initial={{ y: "115%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-115%", opacity: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
              >
                {STAGES[idx]}
              </motion.span>
            </AnimatePresence>
          </span>
        )}
      </div>

      {/* the full chain, current stage lit */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-4">
        {STAGES.map((s, i) => {
          const active = reduce ? i === STAGES.length - 1 : i === idx;
          return (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className={`h-1 w-1 rounded-full transition-colors duration-300 ${
                  active ? "bg-signal" : "bg-line-2"
                }`}
              />
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-300 ${
                  active ? "text-signal-deep" : "text-ink-3/70"
                }`}
              >
                {s}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Beat 2 — the discipline glyphs (tiny, one focal motion each)       */
/* ------------------------------------------------------------------ */

/** Three dots relaying a pulse left → right. Static: pulse has arrived. */
function GlyphRelay({ live }: { live: boolean }) {
  return (
    <div className="flex items-center">
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span aria-hidden className="h-px w-6 bg-line-2" />}
          <span className="relative h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-line-2" />
            <motion.span
              className="absolute inset-0 rounded-full bg-signal"
              initial={false}
              animate={
                live
                  ? { opacity: [0, 1, 0], scale: [0.6, 1.25, 0.6] }
                  : { opacity: i === 2 ? 1 : 0, scale: 1 }
              }
              transition={
                live
                  ? {
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 1.4,
                      delay: i * 0.34,
                      ease: "easeInOut",
                    }
                  : { duration: 0 }
              }
            />
          </span>
        </span>
      ))}
    </div>
  );
}

/** An EQ / stream of bars. Static: a varied, fully-drawn waveform. */
const BAR_HEIGHTS = [10, 20, 13, 24, 16, 22, 11];

function GlyphStream({ live }: { live: boolean }) {
  return (
    <div className="flex h-6 items-end gap-1">
      {BAR_HEIGHTS.map((h, i) => (
        <motion.span
          key={i}
          className="w-1 origin-bottom rounded-full bg-signal"
          style={{ height: h, opacity: 0.4 + (h / 24) * 0.6 }}
          initial={false}
          animate={live ? { scaleY: [1, 0.35, 0.8, 0.5, 1] } : { scaleY: 1 }}
          transition={
            live
              ? {
                  duration: 1.6 + i * 0.13,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.09,
                }
              : { duration: 0 }
          }
        />
      ))}
    </div>
  );
}

/** A tiny satellite orbiting a still center. Static: parked at 12 o'clock. */
function GlyphOrbit({ live }: { live: boolean }) {
  return (
    <div className="relative h-12 w-12">
      <span aria-hidden className="absolute inset-0 rounded-full border border-line-2" />
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
      <motion.span
        aria-hidden
        className="absolute inset-0"
        initial={false}
        animate={live ? { rotate: 360 } : { rotate: 0 }}
        transition={
          live ? { duration: 7, repeat: Infinity, ease: "linear" } : { duration: 0 }
        }
      >
        <span className="absolute left-1/2 top-[-3px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-signal" />
      </motion.span>
    </div>
  );
}

/** Memory nodes linking up — edges redraw in a slow loop. Static: linked. */
function GlyphGraph({ live }: { live: boolean }) {
  const edges = [
    { d: "M10 34 L28 12" },
    { d: "M28 12 L50 22" },
    { d: "M10 34 L50 22" },
    { d: "M50 22 L62 38" },
  ];
  return (
    <svg viewBox="0 0 72 46" className="h-11 w-[72px]" fill="none" aria-hidden>
      {edges.map((e, i) => (
        <path key={`base-${i}`} d={e.d} stroke="var(--line-2)" strokeWidth="1" />
      ))}
      {edges.map((e, i) => (
        <motion.path
          key={`draw-${i}`}
          d={e.d}
          stroke="var(--signal)"
          strokeWidth="1.4"
          strokeLinecap="round"
          initial={false}
          animate={live ? { pathLength: [0, 1, 1, 0] } : { pathLength: 1 }}
          transition={
            live
              ? {
                  duration: 3.6,
                  times: [0, 0.35, 0.8, 1],
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }
              : { duration: 0 }
          }
        />
      ))}
      {[
        { cx: 10, cy: 34 },
        { cx: 28, cy: 12 },
        { cx: 50, cy: 22 },
        { cx: 62, cy: 38 },
      ].map((n, i) => (
        <circle
          key={i}
          cx={n.cx}
          cy={n.cy}
          r="3"
          fill={i === 2 ? "var(--signal)" : "var(--bg)"}
          stroke={i === 2 ? "var(--signal-deep)" : "var(--ink-3)"}
          strokeWidth="1.2"
        />
      ))}
    </svg>
  );
}

/** A sprint dash filling in a loop. Static: shipped (full bar). */
function GlyphSprint({ live }: { live: boolean }) {
  return (
    <div className="flex w-full max-w-[120px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-3">
        <motion.div
          className="h-full rounded-full bg-signal"
          initial={false}
          animate={
            live
              ? { width: ["6%", "44%", "58%", "100%"], opacity: [1, 1, 1, 1] }
              : { width: "100%" }
          }
          transition={
            live
              ? {
                  duration: 2.6,
                  times: [0, 0.35, 0.55, 1],
                  repeat: Infinity,
                  repeatDelay: 0.9,
                  ease: "easeInOut",
                }
              : { duration: 0 }
          }
        />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">
        ship
      </span>
    </div>
  );
}

/** A confirm check drawing itself inside a ring. Static: confirmed. */
function GlyphConfirm({ live }: { live: boolean }) {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="17" stroke="var(--line-2)" strokeWidth="1.4" />
      <motion.path
        d="M14.5 22.5 L20 28 L30 16.5"
        stroke="var(--signal)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={live ? { pathLength: [0, 1, 1, 0], opacity: [1, 1, 1, 0] } : { pathLength: 1 }}
        transition={
          live
            ? {
                duration: 3.2,
                times: [0, 0.3, 0.85, 1],
                repeat: Infinity,
                repeatDelay: 0.6,
                ease: "easeInOut",
              }
            : { duration: 0 }
        }
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Discipline card                                                    */
/* ------------------------------------------------------------------ */

const DISCIPLINES: {
  title: string;
  blurb: string;
  Glyph: (props: { live: boolean }) => ReactNode;
}[] = [
  {
    title: "Agentic systems",
    blurb:
      "Agents that plan, call tools, and hand work to each other — never losing the thread between steps.",
    Glyph: GlyphRelay,
  },
  {
    title: "Realtime pipelines",
    blurb:
      "Streams over batches. Captions, tokens, and events render the moment they happen, not after.",
    Glyph: GlyphStream,
  },
  {
    title: "Motion-obsessed interfaces",
    blurb:
      "Calm, physical UI where every state change earns its animation — and steps aside when asked.",
    Glyph: GlyphOrbit,
  },
  {
    title: "Cross-meeting memory",
    blurb:
      "Retrieval that links what was said today to what was decided months ago, across every room.",
    Glyph: GlyphGraph,
  },
  {
    title: "Ship-fast sprints",
    blurb:
      "Small crew, short loops. Scope tight, ship, learn, repeat — momentum is the methodology.",
    Glyph: GlyphSprint,
  },
  {
    title: "Guardrailed autonomy",
    blurb:
      "Nothing persists silently. The system proposes, a person confirms — autonomy with a hand on the wheel.",
    Glyph: GlyphConfirm,
  },
];

function DisciplineCard({
  title,
  blurb,
  Glyph,
}: {
  title: string;
  blurb: string;
  Glyph: (props: { live: boolean }) => ReactNode;
}) {
  const { ref, live } = useLive();
  return (
    <div
      ref={ref}
      className="card-interactive flex h-full flex-col rounded-card border border-line bg-white p-6 sm:p-7"
    >
      <div className="flex h-12 items-center" aria-hidden>
        <Glyph live={live} />
      </div>
      <h3 className="mt-5 text-[17px] font-medium tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{blurb}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

export function AboutCraft() {
  return (
    <section id="what-we-build" className="relative px-6 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        {/* ---- heading ---- */}
        <Reveal>
          <Eyebrow>What we build</Eyebrow>
        </Reveal>
        <WordReveal
          as="h2"
          text="Agentic software"
          accent="that remembers."
          accentClass="text-gradient-signal"
          className="display mt-4 max-w-[16ch] text-balance text-[clamp(2rem,5.5vw,3.6rem)]"
          delay={100}
        />
        <Reveal delay={220}>
          <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-ink-3 sm:text-[17px]">
            We design AI systems that act — listening, deciding, and carrying
            context forward — and we sweat the interface as hard as the
            inference.
          </p>
        </Reveal>

        {/* ---- beat 1: the flagship strip ---- */}
        <Reveal className="mt-12" delay={120}>
          <Tilt max={4}>
            <div className="sheen card-interactive relative overflow-hidden rounded-card border border-line bg-white shadow-[0_30px_60px_-42px_rgba(40,30,20,0.4)]">
              <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:p-12">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal-soft px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-signal-deep">
                    Flagship
                  </span>
                  <h3 className="mt-4 text-[clamp(1.7rem,4vw,2.5rem)] font-medium tracking-tight text-ink">
                    Mytheus
                  </h3>
                  <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-3 sm:text-[16px]">
                    A meeting platform where every participant brings a
                    personal AI agent — one that captures the room live and
                    remembers it across every meeting after.
                  </p>
                  <Link
                    href="/"
                    className="group mt-6 inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-medium text-white transition-colors duration-300 hover:bg-signal-deep"
                  >
                    Explore Mytheus
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <AgentTicker />
              </div>
            </div>
          </Tilt>
        </Reveal>

        {/* ---- beat 2: the disciplines grid ---- */}
        <Stagger className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {DISCIPLINES.map((d) => (
            <StaggerItem key={d.title} className="h-full">
              <DisciplineCard title={d.title} blurb={d.blurb} Glyph={d.Glyph} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
