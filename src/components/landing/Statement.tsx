"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type Transition,
} from "framer-motion";
import { PinnedScene, Reveal, MaskReveal, Tilt, WordReveal } from "./motion";
import { Eyebrow, ArrowRight } from "./ui";
import {
  mockTeamCapacity,
  mockSourcedAnswer,
  type TeammateCapacity,
} from "@/lib/mock/data";

/* Statement — "between meetings" as THE RELAY: a scroll-pinned, continuously
   scrubbed single shot. The pin lasts four viewport-heights and scroll drives
   every frame of the story — no cuts, no stage swaps:

     beat 1 (the moment)  Q3 planning hands Sarah the pricing rework; the
                          capacity bars fill under your scroll and Sarah's
                          96% flares red — the reason an agent must ask.
     beat 2 (the ask)     the scene widens into the agent network; a query
                          packet leaves your agent and travels the outbound
                          arc — its position on the wire IS your scroll.
     beat 3 (the return)  the packet reaches Sarah's agent, ripples, and a
                          brighter packet rides the return arc home.
     beat 4 (the proof)   the sourced answer lands centre-stage: quote,
                          source, decision lineage, dependency.

   Scrolling back runs the exchange in reverse — the answer un-happens.
   The two agent orbs are deterministic AgentOrb marks (clay core, orbit
   rings, bg-melting halo — ConnectedGraph read as loose bubbles at 96px),
   the answer card tilts under the cursor, and the right-edge beat rail
   jumps the camera between beats. Mobile and reduced motion render the
   story as a calm static stack instead. Data is mockTeamCapacity /
   mockSourcedAnswer; the 96% bar stays the single red attention accent. */

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/*  Relay geometry — two quadratic arcs in a wide 1160×460 stage;      */
/*  flatter than tall so the scene earns the full container width      */
/* ------------------------------------------------------------------ */

type QPath = {
  p0: readonly [number, number];
  p1: readonly [number, number];
  p2: readonly [number, number];
};

/* outbound: your agent (left) up and over to Sarah's agent (right) */
const OUT: QPath = { p0: [120, 230], p1: [580, 58], p2: [1040, 230] };
/* return: Sarah's agent back home along the lower arc */
const RET: QPath = { p0: [1040, 230], p1: [580, 402], p2: [120, 230] };

const qx = (P: QPath, t: number) =>
  (1 - t) ** 2 * P.p0[0] + 2 * (1 - t) * t * P.p1[0] + t * t * P.p2[0];
const qy = (P: QPath, t: number) =>
  (1 - t) ** 2 * P.p0[1] + 2 * (1 - t) * t * P.p1[1] + t * t * P.p2[1];
const qd = (P: QPath) =>
  `M ${P.p0[0]} ${P.p0[1]} Q ${P.p1[0]} ${P.p1[1]} ${P.p2[0]} ${P.p2[1]}`;

/* the scroll windows each beat owns (fractions of the whole pin) */
const T_OUT: [number, number] = [0.28, 0.5];
const T_RET: [number, number] = [0.54, 0.78];

const BEATS = [
  { key: "moment", label: "The moment" },
  { key: "ask", label: "The ask" },
  { key: "return", label: "The return" },
  { key: "proof", label: "The proof" },
];

/* ------------------------------------------------------------------ */
/*  Section shell                                                      */
/* ------------------------------------------------------------------ */

export function Statement() {
  const reduce = useReducedMotion();

  return (
    <section
      className={`px-3 sm:px-5 ${reduce ? "py-24 sm:py-32" : "py-24 sm:py-32 md:py-6"}`}
    >
      {/* mobile / reduced-motion header — the pinned scene carries its own */}
      <div
        className={`mx-auto max-w-[1100px] text-center ${reduce ? "" : "md:hidden"}`}
      >
        <Reveal>
          <Eyebrow>Between meetings</Eyebrow>
        </Reveal>
        <WordReveal
          as="h2"
          text="Your agents don't stop"
          accent="at the meeting."
          accentClass="text-gradient-signal"
          className="display mx-auto mt-4 max-w-[18ch] text-[clamp(2.2rem,5.5vw,4rem)]"
        />
        <Reveal delay={160}>
          <p className="mx-auto mt-5 max-w-[50ch] text-[17px] leading-relaxed text-ink-3">
            When yours needs context, it asks another participant&apos;s agent —
            and the answer comes back sourced, from the exact meeting it
            happened in.
          </p>
        </Reveal>
      </div>

      {/* desktop: the pinned relay — one continuous scroll-scrubbed shot,
          heading and stage fitted together inside the pinned viewport */}
      {!reduce && (
        <PinnedScene count={BEATS.length} className="hidden md:block">
          {({ index, progress, goTo }) => (
            <RelayScene index={index} progress={progress} goTo={goTo} />
          )}
        </PinnedScene>
      )}

      {/* mobile (and desktop reduced-motion): the calm static story */}
      <Reveal delay={120} className={`mt-14 ${reduce ? "" : "md:hidden"}`}>
        <StaticStory />
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  The pinned scene                                                   */
/* ------------------------------------------------------------------ */

function RelayScene({
  index,
  progress,
  goTo,
}: {
  index: number;
  progress: MotionValue<number>;
  goTo: (i: number) => void;
}) {
  /* springed "camera" — every scrubbed value derives from this */
  const cam = useSpring(progress, { stiffness: 90, damping: 28, mass: 0.4 });

  const scale = useTransform(cam, [0, 0.06, 0.94, 1], [0.965, 1, 1, 0.985]);
  const frameOpacity = useTransform(cam, [0, 0.05, 0.95, 1], [0.7, 1, 1, 0.85]);

  /* backdrop: the dot grid drifts against scroll; the clay glow chases the
     packet — left agent, across to Sarah's, and home again for the answer */
  const gridY = useTransform(cam, [0, 1], ["0%", "-9%"]);
  const glowLeft = useTransform(
    cam,
    [0, 0.28, 0.5, 0.78, 1],
    ["38%", "6%", "74%", "6%", "34%"],
  );
  const glowTop = useTransform(
    cam,
    [0, 0.28, 0.5, 0.78, 1],
    ["16%", "40%", "18%", "40%", "30%"],
  );

  return (
    <div className="relative mx-auto flex h-full w-full max-w-[1400px] flex-col px-6 pb-4 pt-[92px]">
      {/* drifting dot-grid texture */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -inset-y-[10%]"
        style={{
          y: gridY,
          backgroundImage:
            "radial-gradient(var(--line-2) 1.1px, transparent 1.1px)",
          backgroundSize: "26px 26px",
          opacity: 0.5,
          maskImage:
            "radial-gradient(70% 66% at 50% 48%, black 24%, transparent 74%)",
          WebkitMaskImage:
            "radial-gradient(70% 66% at 50% 48%, black 24%, transparent 74%)",
        }}
      />

      {/* the glow that rides the exchange */}
      <motion.div
        aria-hidden
        className="orb-glow pointer-events-none absolute h-[400px] w-[400px] opacity-40"
        style={{ left: glowLeft, top: glowTop }}
      />

      {/* the heading stays fitted above the stage for the whole pin */}
      <SceneHeading p={cam} />

      <motion.div
        className="relative min-h-0 w-full flex-1 will-change-transform"
        style={{ scale, opacity: frameOpacity }}
      >
        <MomentOverlay p={cam} />
        <ContextStrip p={cam} />
        <NetworkStage p={cam} />
        <AnswerReveal p={cam} />
      </motion.div>

      <BeatRail index={index} goTo={goTo} />
    </div>
  );
}

/* the in-scene header: pinned with the stage so heading + story always
   share the viewport; it eases back a touch once the relay takes over */
function SceneHeading({ p }: { p: MotionValue<number> }) {
  const scale = useTransform(p, [0.2, 0.32], [1, 0.95]);
  const opacity = useTransform(p, [0.2, 0.32], [1, 0.9]);
  const hintO = useTransform(p, [0.02, 0.07], [1, 0]);

  return (
    <motion.div
      className="relative z-20 shrink-0 text-center"
      style={{ scale, opacity }}
    >
      <Eyebrow>Between meetings</Eyebrow>
      <WordReveal
        as="h2"
        text="Your agents don't stop"
        accent="at the meeting."
        accentClass="text-gradient-signal"
        className="display mx-auto mt-2 max-w-[32ch] text-[clamp(1.9rem,3.4vw,3.1rem)]"
      />
      <p className="mx-auto mt-2.5 max-w-[64ch] text-[16px] leading-relaxed text-ink-3">
        When yours needs context, it asks another participant&apos;s agent — and
        the answer comes back sourced, from the exact meeting it happened in.
      </p>
      <motion.span
        className="mt-2.5 flex items-center justify-center gap-2"
        style={{ opacity: hintO }}
      >
        <motion.span
          aria-hidden
          className="h-1 w-1 rounded-full bg-signal"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="kicker text-[10px] text-ink-3">
          Scroll — run the exchange yourself
        </span>
      </motion.span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Beat 1 — the moment: the room commits Sarah, the bars object       */
/* ------------------------------------------------------------------ */

function MomentOverlay({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, [0.2, 0.27], [1, 0]);
  const y = useTransform(p, [0.2, 0.27], [0, -60]);

  const chipO = useTransform(p, [0, 0.03], [0, 1]);
  const quoteO = useTransform(p, [0.01, 0.05], [0, 1]);
  const quoteY = useTransform(p, [0.01, 0.05], [24, 0]);
  const panelO = useTransform(p, [0.045, 0.085], [0, 1]);
  const panelY = useTransform(p, [0.045, 0.085], [32, 0]);
  const noteO = useTransform(p, [0.185, 0.215], [0, 1]);
  const noteScale = useTransform(p, [0.185, 0.22, 0.26], [0.96, 1.04, 1]);
  /* the trend line draws in step with the bars */
  const tChart = useTransform(p, [0.06, 0.21], [0, 1]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center lg:gap-4 [@media(max-height:740px)]:gap-2"
      style={{ opacity, y }}
    >
      <motion.span
        className="flex items-center gap-2.5 rounded-full border border-line bg-white/90 px-4 py-1.5"
        style={{ opacity: chipO }}
      >
        <motion.span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-priority-high"
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="kicker text-[10px] text-ink-3">Q3 planning · live</span>
      </motion.span>

      <motion.p
        className="display max-w-[28ch] text-[clamp(1.4rem,2.5vw,2.15rem)] leading-tight text-ink-display"
        style={{ opacity: quoteO, y: quoteY }}
      >
        &ldquo;Let&rsquo;s put the pricing rework on Sarah for Q3.&rdquo;
      </motion.p>

      {/* the workload read — bars fill and Sarah's trend line climbs
          into the over-capacity band, all under your scroll */}
      <motion.div
        className="w-full max-w-[780px] rounded-card border border-line bg-white/95 p-4 text-left shadow-[0_40px_80px_-48px_rgba(40,30,20,0.35)] lg:p-5"
        style={{ opacity: panelO, y: panelY }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14.5px] font-medium tracking-tight text-ink-display">
            Team capacity · this sprint
          </p>
          <span className="kicker text-[10.5px] text-ink-3">utilization</span>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_210px] lg:grid-cols-[1fr_264px]">
          <div className="space-y-2.5">
            {mockTeamCapacity.map((t, i) => (
              <ScrubRow key={t.name} t={t} index={i} p={p} />
            ))}
          </div>

          <div className="rounded-xl border border-line bg-bg-2/50 px-2.5 pb-1 pt-2">
            <p className="kicker truncate px-1 text-[9.5px] text-ink-3">
              <span className="lg:hidden">Sarah · daily load</span>
              <span className="hidden lg:inline">Sarah · load, day by day</span>
            </p>
            <div className="mt-1">
              <LoadTrend t={tChart} />
            </div>
          </div>
        </div>

        <motion.div
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-priority-high/25 bg-priority-high-soft px-4 py-2.5"
          style={{ opacity: noteO, scale: noteScale }}
        >
          <span
            aria-hidden
            className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-priority-high"
          />
          <p className="text-[13.5px] font-medium leading-snug text-priority-high">
            Sarah is at 96% — over capacity this sprint.
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const BAR_COLOR: Record<TeammateCapacity["state"], string> = {
  over: "bg-priority-high",
  near: "bg-priority-medium",
  ok: "bg-signal",
};

/* ------------------------------------------------------------------ */
/*  Sarah's load trend — the moving graph inside the capacity read.    */
/*  A single-series line (clay) climbing day by day into the           */
/*  over-capacity band; red is reserved for that status: the band,     */
/*  the end dot, the 96% label. The line draws with the scene          */
/*  (scroll-scrubbed in the pin, time-based in the static story) and   */
/*  the end dot pulses once it crosses the threshold.                  */
/* ------------------------------------------------------------------ */

const LOAD_PTS = [58, 63, 70, 77, 84, 90, 96]; // Sarah, day by day
const LOAD_CAP = 90; // the over-capacity threshold
const LC = { w: 236, h: 118, l: 8, r: 42, t: 14, b: 12 };
const LOAD_SEGS = LOAD_PTS.length - 1;

const loadX = (i: number) => LC.l + (i * (LC.w - LC.l - LC.r)) / LOAD_SEGS;
const loadY = (v: number) =>
  LC.t + (1 - (v - 40) / (105 - 40)) * (LC.h - LC.t - LC.b);
const LOAD_XY = LOAD_PTS.map((v, i) => ({ x: loadX(i), y: loadY(v) }));
/* the draw-progress u (0..1) at which the line crosses the threshold */
const LOAD_CROSS = LOAD_PTS.findIndex((v) => v >= LOAD_CAP) / LOAD_SEGS;

/* Catmull-Rom → cubic beziers, for a calm smooth line */
function loadLinePath() {
  const p = LOAD_XY;
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p3 = p[i + 2] ?? p[i + 1];
    const c1x = p[i].x + (p[i + 1].x - p0.x) / 6;
    const c1y = p[i].y + (p[i + 1].y - p0.y) / 6;
    const c2x = p[i + 1].x - (p3.x - p[i].x) / 6;
    const c2y = p[i + 1].y - (p3.y - p[i].y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p[i + 1].x} ${p[i + 1].y}`;
  }
  return d;
}
const LOAD_LINE = loadLinePath();
const LOAD_AREA = `${LOAD_LINE} L ${LOAD_XY[LOAD_SEGS].x} ${LC.h - LC.b} L ${LOAD_XY[0].x} ${LC.h - LC.b} Z`;

/* point at draw-progress u — linear across the control points */
function loadPointAt(u: number) {
  const s = Math.max(0, Math.min(1, u)) * LOAD_SEGS;
  const i = Math.min(LOAD_SEGS - 1, Math.floor(s));
  const f = s - i;
  return {
    x: LOAD_XY[i].x + (LOAD_XY[i + 1].x - LOAD_XY[i].x) * f,
    y: LOAD_XY[i].y + (LOAD_XY[i + 1].y - LOAD_XY[i].y) * f,
  };
}

/* the chart itself; `t` is draw progress 0..1 (scrolled or animated) */
function LoadTrend({ t }: { t: MotionValue<number> }) {
  const dotX = useTransform(t, (v) => loadPointAt(v).x);
  const dotY = useTransform(t, (v) => loadPointAt(v).y);
  const areaW = useTransform(t, (v) => Math.max(0, loadPointAt(v).x - LC.l));
  /* the dot turns red as the line crosses into the band */
  const redGate = useTransform(t, [LOAD_CROSS - 0.04, LOAD_CROSS + 0.02], [0, 1]);
  const clayGate = useTransform(redGate, (v) => 1 - v);
  const endO = useTransform(t, [0.93, 1], [0, 1]);
  const capY = loadY(LOAD_CAP);
  const end = LOAD_XY[LOAD_SEGS];

  return (
    <svg
      viewBox={`0 0 ${LC.w} ${LC.h}`}
      className="h-auto w-full overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id="load-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
        </linearGradient>
        <clipPath id="load-clip">
          <motion.rect x={LC.l} y="0" height={LC.h} style={{ width: areaW }} />
        </clipPath>
      </defs>

      {/* the over-capacity band + threshold — the only reference lines */}
      <rect
        x={LC.l}
        y={LC.t - 6}
        width={LC.w - LC.l - LC.r + 14}
        height={capY - LC.t + 6}
        rx={4}
        fill="var(--priority-high)"
        opacity={0.06}
      />
      <line
        x1={LC.l}
        x2={LC.w - LC.r + 14}
        y1={capY}
        y2={capY}
        stroke="var(--priority-high)"
        strokeOpacity={0.35}
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <text
        x={LC.w - LC.r + 16}
        y={capY + 3}
        fontSize="8.5"
        fill="var(--ink-3)"
        className="font-mono"
      >
        {LOAD_CAP}%
      </text>

      {/* the filled area, revealed only under the drawn portion */}
      <path d={LOAD_AREA} fill="url(#load-area)" clipPath="url(#load-clip)" />

      {/* the line, drawn by `t` */}
      <motion.path
        d={LOAD_LINE}
        fill="none"
        stroke="var(--signal)"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ pathLength: t }}
      />

      {/* the tip dot — clay on the way up, red once over the line */}
      <motion.g style={{ opacity: endO }}>
        <motion.circle
          cx={0}
          cy={0}
          r={5}
          fill="var(--priority-high)"
          initial={{ scale: 1, opacity: 0.45 }}
          animate={{ scale: [1, 2.1], opacity: [0.45, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          style={{ x: dotX, y: dotY }}
        />
      </motion.g>
      <motion.circle
        cx={0}
        cy={0}
        r={4}
        fill="var(--signal)"
        stroke="white"
        strokeWidth={1.5}
        style={{ x: dotX, y: dotY, opacity: clayGate }}
      />
      <motion.circle
        cx={0}
        cy={0}
        r={4}
        fill="var(--priority-high)"
        stroke="white"
        strokeWidth={1.5}
        style={{ x: dotX, y: dotY, opacity: redGate }}
      />

      {/* the one direct label — Sarah's landing value */}
      <motion.text
        x={end.x + 8}
        y={end.y + 3}
        fontSize="11"
        fontWeight="700"
        fill="var(--priority-high)"
        className="font-mono"
        style={{ opacity: endO }}
      >
        96%
      </motion.text>
    </svg>
  );
}

/* static-story wrapper: draws itself once when scrolled into view */
function LoadTrendAuto({ delay = 0.5 }: { delay?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const t = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      t.set(1);
      return;
    }
    const c = animate(t, 1, { duration: 1.6, delay, ease: EASE });
    return () => c.stop();
  }, [inView, reduce, delay, t]);

  return (
    <div ref={ref}>
      <LoadTrend t={t} />
    </div>
  );
}

/* one capacity bar whose width is driven directly by scroll */
function ScrubRow({
  t,
  index,
  p,
}: {
  t: TeammateCapacity;
  index: number;
  p: MotionValue<number>;
}) {
  const start = 0.055 + index * 0.012;
  const width = useTransform(p, [start, start + 0.095], ["0%", `${t.util}%`]);

  return (
    <div className="grid grid-cols-[64px_1fr_44px] items-center gap-3 sm:grid-cols-[84px_1fr_52px]">
      <span
        className={`truncate text-[14px] ${
          t.state === "over" ? "font-semibold text-priority-high" : "text-ink-2"
        }`}
      >
        {t.name}
      </span>
      <span className="relative h-[16px] overflow-hidden rounded-full bg-bg-2">
        <motion.span
          className={`absolute inset-y-0 left-0 rounded-full ${BAR_COLOR[t.state]}`}
          style={{ width }}
        />
      </span>
      <span
        className={`text-right font-mono text-[12.5px] tabular-nums ${
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
/*  The docked context strip — carries the "why" through beats 2–4     */
/* ------------------------------------------------------------------ */

function ContextStrip({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, [0.24, 0.3], [0, 1]);
  const y = useTransform(p, [0.24, 0.3], [-14, 0]);

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1 z-30 flex max-w-[94%] items-center gap-2.5"
      style={{ opacity, y, x: "-50%" }}
    >
      <span className="min-w-0 truncate rounded-full border border-line bg-white/90 px-4 py-1.5 text-[13px] font-medium text-ink-2">
        &ldquo;Let&rsquo;s put the pricing rework on Sarah for Q3.&rdquo;
      </span>
      <span className="shrink-0 rounded-full border border-priority-high/25 bg-priority-high-soft px-3.5 py-1.5 text-[12px] font-semibold text-priority-high">
        Sarah · 96% over capacity
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Beats 2–3 — the network: two live agents, two arcs, one packet     */
/* ------------------------------------------------------------------ */

function NetworkStage({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, [0.2, 0.28, 0.84, 0.96], [0, 1, 1, 0.22]);
  const rise = useTransform(p, [0.2, 0.3], [40, 0]);

  const tOut = useTransform(p, T_OUT, [0, 1]);
  const tRet = useTransform(p, T_RET, [0, 1]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-6"
      style={{ opacity, y: rise }}
    >
      <div
        className="relative aspect-[1160/460] w-full"
        style={{ maxWidth: "clamp(480px, calc((100vh - 355px) * 2.5217), 1320px)" }}
      >
        <svg
          viewBox="0 0 1160 460"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <filter id="relay-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* the quiet guide wires */}
          <path
            d={qd(OUT)}
            fill="none"
            stroke="var(--line-2)"
            strokeWidth={1.5}
            strokeDasharray="3 8"
            strokeLinecap="round"
          />
          <path
            d={qd(RET)}
            fill="none"
            stroke="var(--line-2)"
            strokeWidth={1.5}
            strokeDasharray="3 8"
            strokeLinecap="round"
          />

          {/* the wires lighting up just behind the packet */}
          <motion.path
            d={qd(OUT)}
            fill="none"
            stroke="var(--signal)"
            strokeWidth={2.2}
            strokeLinecap="round"
            style={{ pathLength: tOut }}
            opacity={0.85}
          />
          <motion.path
            d={qd(RET)}
            fill="none"
            stroke="var(--signal-deep)"
            strokeWidth={2.2}
            strokeLinecap="round"
            style={{ pathLength: tRet }}
            opacity={0.85}
          />

          {/* relay nodes — the network waking up as the packet passes */}
          {[0.22, 0.4, 0.6, 0.78].map((at) => (
            <RelayNode key={`o${at}`} path={OUT} at={at} t={tOut} />
          ))}
          {[0.25, 0.5, 0.75].map((at) => (
            <RelayNode key={`r${at}`} path={RET} at={at} t={tRet} />
          ))}

          {/* the packets — scroll position IS wire position */}
          <Packet path={OUT} t={tOut} p={p} range={T_OUT} halo="var(--signal)" />
          <Packet
            path={RET}
            t={tRet}
            p={p}
            range={T_RET}
            halo="var(--signal-deep)"
          />
        </svg>

        {/* the two agents — live, pointer-reactive constellations */}
        <AgentPost
          className="left-[10.3%]"
          signal
          label="Your agent"
          sub="spots the context gap"
        />
        <AgentPost
          className="left-[89.7%]"
          label="Sarah's agent"
          sub="her meeting memory"
        />

        {/* arrival ripples */}
        <Ripple p={p} win={[0.49, 0.58]} className="left-[89.7%] top-[50%]" />
        <Ripple p={p} win={[0.52, 0.62]} className="left-[89.7%] top-[50%]" />
        <Ripple p={p} win={[0.76, 0.85]} className="left-[10.3%] top-[50%]" />
        <Ripple p={p} win={[0.79, 0.88]} className="left-[10.3%] top-[50%]" />

        {/* what's on the wire */}
        <RelayLabel p={p} win={[0.3, 0.51]} className="top-[7%]">
          <span className="text-signal-deep">asks</span> · &ldquo;who owns the
          pricing decision?&rdquo;
        </RelayLabel>
        <RelayLabel p={p} win={[0.56, 0.77]} className="top-[89%]">
          <span className="text-signal-deep">sourced answer</span> · Q2 Planning
          · Apr 3
        </RelayLabel>
      </div>
    </motion.div>
  );
}

/* a mid-wire node that glows as the packet sweeps over it */
function RelayNode({
  path,
  at,
  t,
}: {
  path: QPath;
  at: number;
  t: MotionValue<number>;
}) {
  const glow = useTransform(t, (v) => Math.max(0, 1 - Math.abs(v - at) / 0.14));
  const x = qx(path, at);
  const y = qy(path, at);

  return (
    <g>
      <circle cx={x} cy={y} r={4} fill="var(--bg)" stroke="var(--line-2)" strokeWidth={1.5} />
      <motion.circle
        cx={x}
        cy={y}
        r={9}
        fill="var(--signal)"
        filter="url(#relay-glow)"
        style={{ opacity: glow }}
      />
      <motion.circle cx={x} cy={y} r={3} fill="var(--signal)" style={{ opacity: glow }} />
    </g>
  );
}

/* the travelling packet: glowing head + comet tail, scrubbed by scroll */
const TAIL = [0.05, 0.1, 0.15];

function Packet({
  path,
  t,
  p,
  range,
  halo,
}: {
  path: QPath;
  t: MotionValue<number>;
  p: MotionValue<number>;
  range: [number, number];
  halo: string;
}) {
  const x = useTransform(t, (v) => qx(path, v));
  const y = useTransform(t, (v) => qy(path, v));
  const opacity = useTransform(
    p,
    [range[0] - 0.015, range[0] + 0.02, range[1] - 0.01, range[1] + 0.02],
    [0, 1, 1, 0],
  );

  return (
    <motion.g style={{ opacity }}>
      {TAIL.map((lag, i) => (
        <TailDot key={lag} path={path} t={t} lag={lag} halo={halo} r={3.6 - i} />
      ))}
      <motion.circle
        cx={0}
        cy={0}
        r={13}
        fill={halo}
        opacity={0.35}
        filter="url(#relay-glow)"
        style={{ x, y }}
      />
      <motion.circle cx={0} cy={0} r={5.5} fill={halo} opacity={0.9} style={{ x, y }} />
      <motion.circle cx={0} cy={0} r={2.6} fill="white" style={{ x, y }} />
    </motion.g>
  );
}

function TailDot({
  path,
  t,
  lag,
  halo,
  r,
}: {
  path: QPath;
  t: MotionValue<number>;
  lag: number;
  halo: string;
  r: number;
}) {
  const x = useTransform(t, (v) => qx(path, Math.max(0, v - lag)));
  const y = useTransform(t, (v) => qy(path, Math.max(0, v - lag)));
  return (
    <motion.circle
      cx={0}
      cy={0}
      r={r}
      fill={halo}
      opacity={0.45 - lag * 2}
      style={{ x, y }}
    />
  );
}

/* the agent core — a 3D gyroscope. Three orbit rings on different axes
   (flat, pitched, yawed) spin at different speeds with satellites riding
   them, a conic radar sweep turns behind everything, a pulse ring emits
   from the core every few seconds, and the clay heart breathes under a
   glassy glint. Deterministic and percentage-sized (36px → 112px), with
   a radial halo that melts into the cream bg — no hard edges anywhere.
   Reduced motion: the gyroscope holds still, tilted and complete. */
function AgentOrb({
  className = "",
  signal = false,
}: {
  className?: string;
  signal?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className={`relative ${className}`}
      style={{ perspective: 320 }}
      aria-hidden
    >
      {/* halo — a warm pool with no edge, so the mark sits IN the page */}
      <div
        className="absolute -inset-[46%] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, var(--signal-soft), transparent 72%)",
        }}
      />

      {/* radar sweep — a soft conic blade turning behind the gyroscope */}
      <motion.div
        className="absolute -inset-[16%] rounded-full opacity-70"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, var(--signal-soft) 34deg, transparent 70deg)",
        }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />

      {/* breathing glow behind the core */}
      <motion.div
        className="absolute inset-[22%] rounded-full bg-signal/25 blur-md"
        animate={
          reduce ? undefined : { scale: [1, 1.22, 1], opacity: [0.4, 0.75, 0.4] }
        }
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* the gyroscope — three rings, three axes, three speeds */}
      <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        {/* flat ring — slow, dashed, the outer cage */}
        <motion.div
          className="absolute inset-[2%]"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        >
          <div
            className={`absolute inset-0 rounded-full border border-dashed ${
              signal ? "border-signal/35" : "border-line-2"
            }`}
          />
          <span className="absolute left-1/2 top-0 h-[8%] min-h-[3px] w-[8%] min-w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_8px_var(--signal-glow)]" />
        </motion.div>

        {/* pitched ring — fast; its satellite orbits in an ellipse */}
        <div
          className="absolute inset-[8%]"
          style={{ transform: reduce ? "rotateX(62deg)" : undefined, transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d", rotateX: 62 }}
            animate={reduce ? undefined : { rotateZ: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute inset-0 rounded-full border border-signal-bright/70" />
            <span className="absolute bottom-0 left-1/2 h-[7%] min-h-[3px] w-[7%] min-w-[3px] -translate-x-1/2 translate-y-1/2 rounded-full bg-signal-bright" />
          </motion.div>
        </div>

        {/* yawed ring — slow counter-spin on the other axis */}
        <div
          className="absolute inset-[12%]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d", rotateY: 64 }}
            animate={reduce ? undefined : { rotateZ: 360 }}
            transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute inset-0 rounded-full border border-line-2/80" />
            <span className="absolute left-0 top-1/2 h-[6%] min-h-[2px] w-[6%] min-w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
          </motion.div>
        </div>
      </div>

      {/* pulse — the core emits a ring every few seconds */}
      {!reduce && (
        <motion.span
          className="absolute inset-[30%] rounded-full border-2 border-signal/50"
          animate={{ scale: [1, 2.1], opacity: [0.55, 0] }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeOut",
            repeatDelay: 0.9,
            delay: signal ? 0 : 1.3,
          }}
        />
      )}

      {/* the core — clay for your agent, warm glass for the peer */}
      <motion.div
        className="absolute inset-[30%] rounded-full"
        style={{
          background: signal
            ? "radial-gradient(circle at 32% 30%, var(--signal-bright), var(--signal) 58%, var(--signal-deep))"
            : "radial-gradient(circle at 32% 30%, white, var(--signal-soft) 58%, var(--signal-bright))",
          boxShadow: "0 8px 22px -8px rgba(40, 30, 20, 0.35)",
        }}
        animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="absolute left-[20%] top-[16%] h-[24%] w-[24%] rounded-full bg-white/75 blur-[1px]" />
      </motion.div>
    </div>
  );
}

/* one of the two live agent orbs, with its nameplate */
function AgentPost({
  className,
  label,
  sub,
  signal = false,
}: {
  className: string;
  label: string;
  sub: string;
  signal?: boolean;
}) {
  return (
    <div
      className={`absolute top-[50%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center ${className}`}
    >
      <AgentOrb signal={signal} className="h-24 w-24 lg:h-28 lg:w-28" />
      <div>
        <p className="text-[14px] font-semibold tracking-tight text-ink-display lg:text-[15px]">
          {label}
        </p>
        <p className="kicker mt-0.5 whitespace-nowrap text-[10px] text-ink-3">{sub}</p>
      </div>
    </div>
  );
}

function Ripple({
  p,
  win,
  className,
}: {
  p: MotionValue<number>;
  win: [number, number];
  className: string;
}) {
  const scale = useTransform(p, win, [0.35, 2.6]);
  const opacity = useTransform(p, [win[0], (win[0] + win[1]) / 2, win[1]], [0, 0.5, 0]);
  return (
    <motion.span
      aria-hidden
      className={`absolute h-24 w-24 rounded-full border-2 border-signal ${className}`}
      style={{ scale, opacity, x: "-50%", y: "-50%" }}
    />
  );
}

function RelayLabel({
  p,
  win,
  className,
  children,
}: {
  p: MotionValue<number>;
  win: [number, number];
  className: string;
  children: ReactNode;
}) {
  const opacity = useTransform(
    p,
    [win[0], win[0] + 0.03, win[1] - 0.03, win[1]],
    [0, 1, 1, 0],
  );
  const y = useTransform(p, win, [8, -8]);
  return (
    <motion.p
      className={`kicker absolute left-1/2 whitespace-nowrap text-[11px] text-ink-3 ${className}`}
      style={{ opacity, y, x: "-50%" }}
    >
      {children}
    </motion.p>
  );
}

/* ------------------------------------------------------------------ */
/*  Beat 4 — the proof: the sourced answer lands centre-stage          */
/* ------------------------------------------------------------------ */

function AnswerReveal({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, [0.76, 0.83], [0, 1]);
  const y = useTransform(p, [0.76, 0.86], [70, 0]);
  const scale = useTransform(p, [0.76, 0.86], [0.92, 1]);
  const metaO = useTransform(p, [0.82, 0.87], [0, 1]);
  const depO = useTransform(p, [0.91, 0.96], [0, 1]);
  const depY = useTransform(p, [0.91, 0.96], [16, 0]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-6">
      <motion.div
        className="pointer-events-auto w-full max-w-[680px]"
        style={{ opacity, y, scale }}
      >
        <Tilt max={6}>
          <div className="rounded-card border border-line bg-white p-6 shadow-[0_60px_120px_-40px_rgba(40,30,20,0.4)] sm:p-8">
            <p className="kicker text-[11px] text-signal-deep">
              Answer · delivered to your agent
            </p>
            <p className="mt-3 text-left text-[clamp(1.3rem,2.2vw,1.75rem)] font-medium leading-snug tracking-tight text-ink-display">
              &ldquo;{mockSourcedAnswer.quote}&rdquo;
            </p>

            <motion.div
              className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"
              style={{ opacity: metaO }}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal text-white">
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

              {/* the FOLLOWS_FROM chain, drawing itself link by link */}
              <span className="flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-line bg-bg-2 px-3 py-1">
                {mockSourcedAnswer.lineage.map((m, i) => (
                  <LineageStep key={m} p={p} index={i} first={i === 0} label={m} />
                ))}
              </span>
            </motion.div>
          </div>
        </Tilt>

        <motion.div
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-priority-medium/30 bg-priority-medium-soft px-4 py-3"
          style={{ opacity: depO, y: depY }}
        >
          <span
            aria-hidden
            className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-priority-medium"
          />
          <p className="text-left text-[13px] font-medium leading-snug text-priority-medium">
            Pricing rework blocks the Q3 launch date.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function LineageStep({
  p,
  index,
  first,
  label,
}: {
  p: MotionValue<number>;
  index: number;
  first: boolean;
  label: string;
}) {
  const start = 0.86 + index * 0.035;
  const opacity = useTransform(p, [start, start + 0.035], [0, 1]);
  const x = useTransform(p, [start, start + 0.035], [-6, 0]);
  return (
    <motion.span className="flex items-center gap-1.5" style={{ opacity, x }}>
      {!first && <ArrowRight className="h-3 w-3 text-ink-3" />}
      <span className="text-[12px] font-medium text-ink-2">{label}</span>
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/*  The beat rail — right edge, jumps the camera between beats         */
/* ------------------------------------------------------------------ */

function BeatRail({ index, goTo }: { index: number; goTo: (i: number) => void }) {
  return (
    <div className="absolute right-2 top-1/2 z-30 hidden -translate-y-1/2 lg:block xl:right-6">
      <ol className="flex flex-col items-end gap-5">
        {BEATS.map((b, i) => {
          const active = i === index;
          return (
            <li key={b.key}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={active ? "step" : undefined}
                aria-label={b.label}
                className="group flex items-center gap-3 py-0.5"
              >
                <span
                  className={`kicker text-[10px] transition-all duration-300 ${
                    active
                      ? "text-signal-deep opacity-100"
                      : "text-ink-3 opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70"
                  }`}
                >
                  {b.label}
                </span>
                <span
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    active
                      ? "scale-125 bg-signal shadow-[0_0_10px_var(--signal-glow)]"
                      : "bg-line-2 group-hover:bg-signal/50"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ================================================================== */
/*  Static story — mobile and reduced motion                           */
/* ================================================================== */

function StaticStory() {
  return (
    <div className="mx-auto max-w-[1180px] px-2 sm:px-5">
      <div className="mesh-field mesh-anim grain relative overflow-hidden rounded-[28px] border border-line p-5 sm:p-10">
        <TriggerLine />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-7">
          <CapacityCard />
          <div className="flex flex-col gap-5">
            <AgentExchange />
            <SourcedCard />
            <DependencyCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function TriggerLine() {
  return (
    <MaskReveal y={40} className="mx-auto max-w-[640px]">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/90 px-4 py-3 shadow-[0_24px_48px_-32px_rgba(40,30,20,0.35)] sm:gap-4 sm:px-5">
        <span className="kicker shrink-0 text-[10px] text-ink-3">
          <span className="sm:hidden">Live</span>
          <span className="hidden sm:inline">Q3 planning · live</span>
        </span>
        <p className="min-w-0 flex-1 text-left text-[14px] font-medium text-ink line-clamp-2 sm:line-clamp-1 sm:text-[15px]">
          &ldquo;Let&rsquo;s put the pricing rework on Sarah for Q3.&rdquo;
        </p>
        <AgentOrb signal className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
      </div>
    </MaskReveal>
  );
}

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

      {/* Sarah's load trend — the moving read behind the red note */}
      <div className="mt-4 rounded-xl border border-line bg-bg-2/50 px-2.5 pb-1 pt-2">
        <p className="kicker truncate px-1 text-[9.5px] text-ink-3">
          <span className="sm:hidden">Sarah · daily load</span>
          <span className="hidden sm:inline">Sarah · load, day by day</span>
        </p>
        <div className="mt-1">
          <LoadTrendAuto delay={1.1} />
        </div>
      </div>

      <motion.div
        initial={false}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 10 }}
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

/* the query pulse between the two agents — mobile's compact exchange */
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
      className="rounded-card border border-line bg-white/80 px-3 py-3.5 sm:px-5"
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
    <div className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-[76px]">
      <AgentOrb signal={signal} className="h-10 w-10 sm:h-12 sm:w-12" />
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
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal text-white">
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

          <span className="flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-line bg-bg-2 px-3 py-1">
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
