"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Reveal } from "./motion";
import { Eyebrow } from "./ui";

/* ================================================================== */
/*  MemoryTimeline — a Linear-roadmap-style diagram, retold for memory. */
/*  A week of meetings as swimlane bars; each decision is a clay        */
/*  diamond; threads sweep across the week and converge into Friday's   */
/*  standup — the literal picture of "a decision on Monday is context   */
/*  on Friday." Threads draw on scroll; pulses travel them forever.     */
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
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const go = reduce ? true : inView;

  return (
    <section id="memory" className="px-3 py-24 sm:px-5 sm:py-32">
      <div className="mx-auto max-w-[1340px]">
        <Reveal>
          <Eyebrow>How memory compounds</Eyebrow>
          <h2 className="display mt-5 max-w-[20ch] text-[clamp(2.2rem,5.5vw,4rem)]">
            A decision on Monday is context on Friday.
          </h2>
          <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-ink-3">
            Every meeting feeds one shared memory. Decisions, owners, and
            promises made early in the week are carried forward automatically —
            so by Friday&apos;s standup, nothing has to be re-explained.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
            {/* ---- left ledger card (the "Initiatives" rail) ---- */}
            <div className="rounded-card border border-line bg-surface/70 p-6 backdrop-blur-sm">
              <p className="kicker">This week</p>
              <p className="mt-1 text-[15px] text-ink-3">
                One memory, four meetings.
              </p>
              <ul className="mt-6 space-y-1">
                {LEDGER.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-bg-2"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: row.dot }}
                      />
                      <span className="text-[15px] font-medium text-ink-2">
                        {row.label}
                      </span>
                    </span>
                    <span className="font-mono text-sm tabular-nums text-ink-3">
                      {row.n}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-3 rounded-md border border-line bg-bg-2/60 px-3 py-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal" />
                </span>
                <span className="text-[13px] text-ink-3">
                  Agents writing live — no bot on the call.
                </span>
              </div>
            </div>

            {/* ---- right: the roadmap diagram ---- */}
            <div className="mesh-field relative overflow-hidden rounded-card border border-line p-2">
              <svg
                ref={ref}
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

                {/* ---- threads (drawn under the bars) ---- */}
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
                      initial={{ pathLength: 0 }}
                      animate={go ? { pathLength: 1 } : { pathLength: 0 }}
                      transition={{ duration: 1.3, ease: EASE, delay: 0.7 + i * 0.18 }}
                    />
                    {/* crisp line */}
                    <motion.path
                      d={d}
                      fill="none"
                      stroke="var(--signal)"
                      strokeWidth={2}
                      strokeOpacity={0.75}
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={go ? { pathLength: 1 } : { pathLength: 0 }}
                      transition={{ duration: 1.3, ease: EASE, delay: 0.7 + i * 0.18 }}
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
                    <motion.text
                      x={l.diamond.x + 16}
                      y={l.diamond.y + 4}
                      className="font-sans"
                      fontSize={12.5}
                      fill="var(--signal-deep)"
                      initial={{ opacity: 0, x: l.diamond.x + 8 }}
                      animate={
                        go
                          ? { opacity: 1, x: l.diamond.x + 16 }
                          : { opacity: 0, x: l.diamond.x + 8 }
                      }
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
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const LEDGER = [
  { label: "Decisions", n: 24, dot: "var(--signal)" },
  { label: "Action items", n: 17, dot: "#5a8f6e" },
  { label: "Open questions", n: 6, dot: "#c9a23d" },
  { label: "Conflicts", n: 2, dot: "var(--signal-deep)" },
];
