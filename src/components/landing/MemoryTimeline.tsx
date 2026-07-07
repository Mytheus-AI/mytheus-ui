"use client";

import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Reveal, CountUp, ScrollScale } from "./motion";
import { Eyebrow } from "./ui";

/* ================================================================== */
/*  MemoryTimeline — a Linear-roadmap-style diagram, retold for memory. */
/*  A week of meetings as swimlane bars; each decision is a clay        */
/*  diamond; threads sweep across the week and converge into Friday's   */
/*  standup — the literal picture of "a decision on Monday is context   */
/*  on Friday." Threads are drawn BY scroll (scrubbed, springed), so    */
/*  memory literally flows across the week as you move; pulses travel   */
/*  them forever after. Below md the SVG (whose type would shrink to    */
/*  ~5px) swaps for a vertical timeline built for narrow screens.       */
/* ================================================================== */

const VBW = 1180;
const VBH = 540;

const EASE = [0.16, 1, 0.3, 1] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const xL = 70;
const xR = 1150;
const COL = (xR - xL) / DAYS.length; // 216
const dayMid = (d: number) => xL + d * COL + COL / 2;
const dayEdge = (d: number) => xL + d * COL;

/* meeting swimlane bars */
const LANES = [
  {
    label: "Roadmap sync",
    day: "Mon",
    x1: 88,
    x2: 472,
    y: 128,
    diamond: { x: 472, y: 151 },
    decision: "Ship date locked",
  },
  {
    label: "Pricing review",
    day: "Wed",
    x1: 522,
    x2: 690,
    y: 218,
    diamond: { x: 690, y: 241 },
    decision: "Tier set · Pro $29",
  },
  {
    label: "Customer call",
    day: "Thu",
    x1: 742,
    x2: 898,
    y: 308,
    diamond: { x: 898, y: 331 },
    decision: "Promised SSO",
  },
];

/* the convergence node — Friday standup, where context lands */
const NODE = { x: 940, y: 420 };
const FRIDAY = { x1: 958, x2: 1128, y: 397 };

/* threads: each decision diamond curving into the memory node */
const THREADS = LANES.map((l) => {
  const sx = l.diamond.x;
  const sy = l.diamond.y;
  const ex = NODE.x;
  const ey = NODE.y;
  const cx = sx + (ex - sx) * 0.55;
  return `M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ey}, ${ex} ${ey}`;
});

export function MemoryTimeline() {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inView = useInView(svgRef, { once: true, margin: "0px 0px -15% 0px" });
  const go = reduce ? true : inView;

  /* scroll-linked thread draw — the lines lay themselves down as the
     diagram travels up the viewport, each thread a beat behind the last */
  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ["start 0.92", "end 0.55"],
  });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });
  const draw0 = useTransform(p, [0.12, 0.6], [0, 1]);
  const draw1 = useTransform(p, [0.24, 0.74], [0, 1]);
  const draw2 = useTransform(p, [0.36, 0.88], [0, 1]);
  const draws = [draw0, draw1, draw2];

  return (
    <section id="memory" className="px-3 py-24 sm:px-5 sm:py-32">
      <div className="mx-auto max-w-[1340px]">
        {/* heading centered over the chart, and deliberately COMPACT — the
            heading and the diagram must share one viewport (a full-size
            display heading pushed the chart below the fold on laptops) */}
        <Reveal className="text-center">
          <Eyebrow>How memory compounds</Eyebrow>
          <h2 className="display mx-auto mt-4 max-w-[26ch] text-balance text-[clamp(1.9rem,3.4vw,2.8rem)]">
            A decision on Monday is context on Friday.
          </h2>
          <p className="mx-auto mt-3 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-3">
            Every meeting feeds one shared memory. Decisions, owners, and
            promises made early in the week are carried forward automatically —
            so by Friday&apos;s standup, nothing has to be re-explained.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <ScrollScale from={0.96}>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 lg:grid-cols-[300px_1fr]">
            {/* ---- left ledger card (the "Initiatives" rail) ----
                 a flex column so it distributes to the graph panel's full
                 height: header top, stats centered, live strip at the base */}
            <div className="flex flex-col rounded-card border border-line bg-surface/70 p-5 backdrop-blur-sm sm:p-6">
              <p className="kicker">This week</p>
              <p className="mt-1 text-[15px] text-ink-3">
                One memory, four meetings.
              </p>
              <ul className="flex flex-1 flex-col justify-center gap-1.5 py-6">
                {LEDGER.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-bg-2"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: row.dot }}
                      />
                      <span className="text-[15px] font-medium text-ink-2">
                        {row.label}
                      </span>
                    </span>
                    <span className="font-mono text-sm tabular-nums text-ink-3">
                      <CountUp to={row.n} duration={1.2} />
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center gap-3 rounded-md border border-line bg-bg-2/60 px-3 py-3">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal" />
                </span>
                <span className="text-[13px] text-ink-3">
                  Agents writing live — no bot on the call.
                </span>
              </div>
            </div>

            {/* ---- right (md+): the roadmap diagram ---- */}
            <div
              ref={panelRef}
              className="mesh-field relative hidden overflow-hidden rounded-card border border-line p-2 md:block"
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${VBW} ${VBH}`}
                className="h-auto w-full"
                role="img"
                aria-label="A week of meetings whose decisions converge into Friday's standup as shared context."
              >
                {/* faint day gridlines */}
                {DAYS.map((_, i) => (
                  <line
                    key={`grid-${i}`}
                    x1={dayEdge(i)}
                    x2={dayEdge(i)}
                    y1={96}
                    y2={478}
                    stroke="var(--line)"
                    strokeWidth={1}
                    strokeDasharray="2 7"
                  />
                ))}
                {/* day headers */}
                {DAYS.map((d, i) => (
                  <text
                    key={`day-${d}`}
                    x={dayMid(i)}
                    y={74}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={13}
                    letterSpacing={3}
                    fill="var(--ink-3)"
                  >
                    {d.toUpperCase()}
                  </text>
                ))}
                {/* Friday spotlight column */}
                <motion.rect
                  x={dayEdge(4)}
                  y={96}
                  width={COL}
                  height={382}
                  fill="var(--signal)"
                  initial={{ opacity: 0 }}
                  animate={go ? { opacity: 0.06 } : { opacity: 0 }}
                  transition={{ duration: 1, delay: 0.2 }}
                />

                {/* ---- threads (drawn under the bars, BY scroll) ---- */}
                {THREADS.map((d, i) => (
                  <g key={`thread-${i}`}>
                    {/* soft underlay */}
                    <motion.path
                      d={d}
                      fill="none"
                      stroke="var(--signal)"
                      strokeWidth={7}
                      strokeOpacity={0.12}
                      strokeLinecap="round"
                      style={reduce ? undefined : { pathLength: draws[i] }}
                    />
                    {/* crisp line */}
                    <motion.path
                      d={d}
                      fill="none"
                      stroke="var(--signal)"
                      strokeWidth={2}
                      strokeOpacity={0.75}
                      strokeLinecap="round"
                      style={reduce ? undefined : { pathLength: draws[i] }}
                    />
                    {/* traveling pulse (skipped under reduced motion) */}
                    {!reduce && (
                      <circle r={3.2} fill="var(--signal-deep)">
                        <animateMotion
                          dur={`${3.2 + i * 0.5}s`}
                          begin={`${1.6 + i * 0.2}s`}
                          repeatCount="indefinite"
                          path={d}
                          keyPoints="0;1"
                          keyTimes="0;1"
                          calcMode="linear"
                        />
                      </circle>
                    )}
                  </g>
                ))}

                {/* ---- meeting bars + decision diamonds ---- */}
                {LANES.map((l, i) => (
                  <g key={l.label}>
                    <text
                      x={l.x1}
                      y={l.y - 10}
                      className="font-mono"
                      fontSize={11}
                      letterSpacing={2}
                      fill="var(--ink-3)"
                    >
                      {l.day.toUpperCase()}
                    </text>
                    <motion.rect
                      x={l.x1}
                      y={l.y}
                      width={l.x2 - l.x1}
                      height={42}
                      rx={12}
                      fill="var(--surface)"
                      stroke="var(--line-2)"
                      strokeWidth={1}
                      style={{ transformBox: "fill-box", transformOrigin: "left" }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={
                        go ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }
                      }
                      transition={{ duration: 0.7, ease: EASE, delay: i * 0.14 }}
                    />
                    <motion.g
                      initial={{ opacity: 0 }}
                      animate={go ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.4, delay: 0.25 + i * 0.14 }}
                    >
                      <circle cx={l.x1 + 18} cy={l.y + 21} r={4} fill="var(--signal)" />
                      <text
                        x={l.x1 + 32}
                        y={l.y + 26}
                        className="font-sans"
                        fontSize={15}
                        fontWeight={500}
                        fill="var(--ink-display)"
                      >
                        {l.label}
                      </text>
                    </motion.g>

                    {/* decision diamond */}
                    <motion.rect
                      x={l.diamond.x - 8}
                      y={l.diamond.y - 8}
                      width={16}
                      height={16}
                      rx={3}
                      fill="var(--signal)"
                      stroke="var(--bg)"
                      strokeWidth={2}
                      transform={`rotate(45 ${l.diamond.x} ${l.diamond.y})`}
                      style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      initial={{ scale: 0 }}
                      animate={go ? { scale: 1 } : { scale: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 18,
                        delay: 0.5 + i * 0.14,
                      }}
                    />
                    {/* NB: framer `x` on SVG text is a transform ADDED to the
                        x attribute — animate a small relative slide only */}
                    <motion.text
                      x={l.diamond.x + 16}
                      y={l.diamond.y + 4}
                      className="font-sans"
                      fontSize={12.5}
                      fill="var(--signal-deep)"
                      initial={{ opacity: 0, x: -8 }}
                      animate={go ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                      transition={{ duration: 0.5, delay: 0.65 + i * 0.14 }}
                    >
                      {l.decision}
                    </motion.text>
                  </g>
                ))}

                {/* ---- Friday standup: the convergence ---- */}
                <text
                  x={FRIDAY.x1}
                  y={FRIDAY.y - 10}
                  className="font-mono"
                  fontSize={11}
                  letterSpacing={2}
                  fill="var(--ink-3)"
                >
                  FRI
                </text>
                <motion.rect
                  x={FRIDAY.x1}
                  y={FRIDAY.y}
                  width={FRIDAY.x2 - FRIDAY.x1}
                  height={42}
                  rx={12}
                  fill="var(--signal-soft)"
                  stroke="var(--signal)"
                  strokeWidth={1.5}
                  style={{ transformBox: "fill-box", transformOrigin: "left" }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={go ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 1.5 }}
                />
                <motion.text
                  x={FRIDAY.x1 + 16}
                  y={FRIDAY.y + 26}
                  className="font-sans"
                  fontSize={15}
                  fontWeight={550}
                  fill="var(--signal-deep)"
                  initial={{ opacity: 0 }}
                  animate={go ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.5, delay: 1.7 }}
                >
                  Standup
                </motion.text>

                {/* memory node — where threads land */}
                <motion.circle
                  cx={NODE.x}
                  cy={NODE.y}
                  r={11}
                  fill="var(--signal)"
                  stroke="var(--bg)"
                  strokeWidth={3}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  initial={{ scale: 0 }}
                  animate={go ? { scale: 1 } : { scale: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16, delay: 1.9 }}
                />
                {!reduce && (
                  <motion.circle
                    cx={NODE.x}
                    cy={NODE.y}
                    r={11}
                    fill="none"
                    stroke="var(--signal)"
                    strokeWidth={2}
                    initial={{ scale: 1, opacity: 0 }}
                    animate={
                      go
                        ? { scale: [1, 2.4], opacity: [0.5, 0] }
                        : { scale: 1, opacity: 0 }
                    }
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 2,
                    }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                )}
                <motion.text
                  x={NODE.x - 14}
                  y={NODE.y + 5}
                  textAnchor="end"
                  className="font-sans"
                  fontSize={12.5}
                  fontWeight={500}
                  fill="var(--ink-display)"
                  initial={{ opacity: 0 }}
                  animate={go ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.5, delay: 2.1 }}
                >
                  Full context, recalled
                </motion.text>
              </svg>
            </div>

            {/* ---- right (< md): the same week, told vertically ---- */}
            <MobileWeek reduce={!!reduce} />
          </div>
          </ScrollScale>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  MobileWeek — the narrow-screen retelling: a clay rail draws down    */
/*  the week, decision diamonds hang off it, and everything lands in    */
/*  Friday's standup. The SVG diagram's type would render ~5px here.    */
/* ------------------------------------------------------------------ */

function MobileWeek({ reduce }: { reduce: boolean }) {
  return (
    <div className="mesh-field relative overflow-hidden rounded-card border border-line p-5 md:hidden">
      <div className="relative pl-8">
        {/* the memory rail */}
        <motion.span
          aria-hidden
          className="absolute bottom-3 left-[5px] top-2 w-px origin-top bg-signal/35"
          initial={reduce ? false : { scaleY: 0 }}
          whileInView={reduce ? undefined : { scaleY: 1 }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 1.4, ease: EASE }}
        />
        {/* a pulse of memory travelling the rail, forever */}
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute left-[5px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-signal-deep"
            animate={{ top: ["2%", "95%"], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.6,
            }}
          />
        )}

        <ol className="flex flex-col gap-7">
          {LANES.map((l, i) => (
            <motion.li
              key={l.label}
              className="relative"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.55, ease: EASE, delay: i * 0.12 }}
            >
              {/* decision diamond on the rail */}
              <span
                aria-hidden
                className="absolute -left-[31px] top-[3px] h-2.5 w-2.5 rotate-45 rounded-[2px] border border-bg bg-signal"
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
                {l.day}
              </p>
              <p className="mt-1 text-[15px] font-medium leading-snug text-ink-display">
                {l.label}
              </p>
              <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-signal-soft px-2.5 py-1 text-[12px] font-medium text-signal-deep">
                <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-signal-deep" />
                {l.decision}
              </p>
            </motion.li>
          ))}

          {/* Friday — where it all lands */}
          <motion.li
            className="relative"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.4 }}
          >
            <span
              aria-hidden
              className="absolute -left-[33px] top-[5px] flex h-3.5 w-3.5"
            >
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-50" />
              )}
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-bg bg-signal" />
            </span>
            <div className="rounded-xl border border-signal/40 bg-signal-soft/60 px-4 py-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal-deep">
                Fri · Standup
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                Full context, recalled — every decision above arrives already
                remembered.
              </p>
            </div>
          </motion.li>
        </ol>
      </div>
    </div>
  );
}

const LEDGER = [
  { label: "Decisions", n: 24, dot: "var(--signal)" },
  { label: "Action items", n: 17, dot: "var(--priority-low)" },
  { label: "Open questions", n: 6, dot: "var(--priority-medium)" },
  { label: "Conflicts", n: 2, dot: "var(--priority-high)" },
];
