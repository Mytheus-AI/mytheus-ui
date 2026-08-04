"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { PillCTA } from "./ui";
import { WordReveal, Reveal } from "./motion";
import { NotesWidget } from "./NotesEnhanceDemo";

/* ================================================================== */
/*  Hero — a scroll-driven, two-page filmstrip pinned to the viewport.  */
/*  Page one (the live "Q3 Planning" capture, sitting at the centre of   */
/*  its own meeting timeline) slides out to the LEFT and exits as you   */
/*  scroll, while page two (the memory the agent leaves behind)         */
/*  arrives from the RIGHT onto the same screen.                        */
/*  Fully scroll-reversible. Reduced-motion / mobile = stacked.         */
/* ================================================================== */

export function Hero() {
  const reduce = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  if (reduce || !isDesktop) return <HeroStatic />;
  return <HeroSequence />;
}

/* ------------------------------------------------------------------ */
/*  Scroll-pinned sequence (desktop)                                   */
/* ------------------------------------------------------------------ */

function HeroSequence() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // one fixed stage. `p` drives the whole choreography: page-one cards gather
  // into a stack and fly off to the left, then page-two's text assembles in
  // place (letter by letter) on the same stage — no whole-page sliding.
  const p = useTransform(scrollYProgress, [0.06, 0.94], [0, 1]);

  // page two takes over (interactive + the live widget mounts) once it leads
  const [showTwo, setShowTwo] = useState(false);
  useMotionValueEvent(p, "change", (v) => setShowTwo(v > 0.5));

  // the scroll cue fades the instant you begin. this is a state flip, not a
  // scroll-linked opacity: framer hands a `style` MotionValue to a native
  // ViewTimeline, and inside this sticky/pinned section that timeline samples
  // wrong deep in the scroll — the cue would drift back into view over page two
  const [cueOut, setCueOut] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => setCueOut(v > 0.02));

  // a gentle camera pull-back + lift as you scroll away into the next section
  const stageScale = useTransform(scrollYProgress, [0.9, 1], [1, 0.97]);
  const stageY = useTransform(scrollYProgress, [0.9, 1], [0, -24]);

  return (
    <section ref={ref} className="relative" style={{ height: "260vh" }}>
      <div className="mesh-field mesh-anim grain sticky top-0 h-screen overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ scale: stageScale, y: stageY }}
        >
          {/* ---- page one — gathers, then exits to the left ---- */}
          {/* pt-[92px]: the stage centers content BELOW the fixed SiteHeader
              (pinned-scene rule — see docs/MOTION.md) */}
          <div
            className={`absolute inset-0 flex items-center pt-[92px] ${
              showTwo ? "pointer-events-none" : ""
            }`}
          >
            <SeqPageOne progress={p} />
          </div>

          {/* ---- page two — assembles in place on the same stage ---- */}
          <div
            className={`absolute inset-0 flex items-center pt-[92px] ${
              showTwo ? "" : "pointer-events-none"
            }`}
          >
            <SeqPageTwo progress={p} show={showTwo} />
          </div>
        </motion.div>

        {/* ---- scroll cue — waits for the intro to land, then invites ---- */}
        <motion.div
          aria-hidden
          animate={{ opacity: cueOut ? 0 : 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="pointer-events-none absolute inset-x-0 bottom-9 z-30"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 1.5 }}
            className="flex items-center justify-center gap-2 text-ink-3"
          >
            <span className="text-[13px] font-medium tracking-tight">
              See your agent in action
            </span>
            <motion.span
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown />
            </motion.span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---- page one (sequence): intro fades + drifts, the orbit exits left ---- */
function SeqPageOne({ progress }: { progress: MotionValue<number> }) {
  const introO = useTransform(progress, [0, 0.26], [1, 0]);
  const introX = useTransform(progress, [0, 0.34], [0, -90]);
  // the copy softens out of focus as the cards take the stage
  const introBlur = useTransform(
    progress,
    [0.06, 0.3],
    ["blur(0px)", "blur(7px)"],
  );
  return (
    <div className="mx-auto grid w-full max-w-[80rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <motion.div
        style={{ opacity: introO, x: introX, filter: introBlur }}
        className="relative z-10 max-w-[36rem]"
      >
        <Intro />
      </motion.div>
      <div className="relative hidden lg:block">
        <MeetingOrbit progress={progress} />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Meeting orbit — the graphic that argues the product without words. */
/*  Today's meeting sits at the centre; the meetings behind it recede   */
/*  along a curved track that runs *behind* the window, and the next    */
/*  one waits ahead of it. One clay thread carries a decision out of    */
/*  Q2 Planning and into today — meetings happen, the agent remembers,    */
/*  the context moves forward.                                          */
/* ================================================================== */

const STAGE_W = 820;
const STAGE_H = 560;
/* every chip hangs off its dot; the dot is DOT_INSET in from the chip's edge
   nearest the window, so past meetings read leftward and the next one right */
const DOT_INSET = 22;

type Pt = [number, number];

/** Catmull-Rom → cubic Bézier, one string per segment: a smooth curve that
    passes through every point, so a node dot is always exactly on the track —
    and so the highlighted half can reuse a segment's exact control points
    instead of drawing a second, subtly different curve over it. */
function smoothSegments(pts: Pt[]) {
  const segs: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    const c1x = x1 + (x2 - p0[0]) / 6;
    const c1y = y1 + (y2 - p0[1]) / 6;
    const c2x = x2 - (p3[0] - x1) / 6;
    const c2y = y2 - (p3[1] - y1) / 6;
    segs.push(
      `C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2} ${y2}`,
    );
  }
  return segs;
}

const moveTo = (p: Pt) => `M ${p[0]} ${p[1]}`;

type OrbitNodeSpec = {
  key: string;
  title: string;
  meta: string;
  at: Pt;
  icon: ReactNode;
  scale: number;
  fade: number;
  delay: number;
  source?: boolean;
  future?: boolean;
};

/* chronological, oldest first — the centre of the track is today's meeting,
   which is the window itself, so it needs no chip of its own */
const ORBIT_NODES: OrbitNodeSpec[] = [
  {
    key: "monday",
    title: "Monday sync",
    meta: "3 decisions",
    at: [196, 92],
    icon: <TickGlyph />,
    scale: 0.88,
    fade: 0.7,
    delay: 1.0,
  },
  {
    key: "client",
    title: "Client call",
    meta: "2 actions",
    at: [152, 238],
    icon: <ActionGlyph />,
    scale: 0.94,
    fade: 0.82,
    delay: 0.85,
  },
  {
    key: "q2",
    title: "Q2 Planning",
    meta: "Pricing · $49",
    at: [190, 384],
    icon: <DiamondGlyph />,
    scale: 1,
    fade: 1,
    delay: 0.7,
    source: true,
  },
  {
    key: "next",
    title: "Next meeting",
    meta: "Context ready",
    at: [660, 310],
    icon: <ClockGlyph />,
    scale: 0.95,
    fade: 0.9,
    delay: 1.3,
    future: true,
  },
];

const HUB: Pt = [410, 458]; // where the track passes behind the window

const TRACK_PTS: Pt[] = [
  ORBIT_NODES[0].at,
  ORBIT_NODES[1].at,
  ORBIT_NODES[2].at,
  HUB,
  ORBIT_NODES[3].at,
];
const SEGS = smoothSegments(TRACK_PTS);

/* the whole orbit, hairline — it still has to read as one curve where it
   passes behind the window */
const TRACK = [moveTo(TRACK_PTS[0]), ...SEGS].join(" ");

/* the highlighted thread: everything already decided, running down the track
   from Monday and breaking off at Q2 Planning straight into today's window.
   Segments 0-1 are the track's own, so the two curves coincide exactly. */
const MEMORY_LINE = [
  moveTo(TRACK_PTS[0]),
  SEGS[0],
  SEGS[1],
  "C 206 312, 226 275, 272 275",
].join(" ");

/* ahead of today: still dotted, and carrying context out to the next one */
const AHEAD_LINE = [moveTo(HUB), SEGS[3]].join(" ");

function MeetingOrbit({ progress }: { progress?: MotionValue<number> }) {
  // static callers (mobile / reduced motion) sit at p = 0 — every transform
  // below resolves to its home value, so one component serves both paths
  const parked = useMotionValue(0);
  const p = progress ?? parked;

  // 0 → 0.3 : the orbit collapses toward the window
  // 0.3 → 0.55 : the whole stage leaves to the left
  const exitX = useTransform(p, [0.3, 0.55], [0, -960]);
  const exitO = useTransform(p, [0.36, 0.52], [1, 0]);
  const cardScale = useTransform(p, [0, 0.3], [1, 0.92]);
  const trackO = useTransform(p, [0.06, 0.24], [1, 0]);

  return (
    <motion.div style={{ x: exitX, opacity: exitO }} className="relative">
      {/* zoom (not transform scale) so text re-lays-out at the target size
          and stays pixel-crisp instead of going soft under a 0.6 scale */}
      <div
        className="relative mx-auto [zoom:0.6] xl:[zoom:0.77]"
        style={{ width: STAGE_W, height: STAGE_H }}
      >
        {/* the warm bloom that holds the composition together */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(217,119,87,0.18), rgba(217,119,87,0.06) 45%, transparent 72%)",
          }}
        />

        <OrbitTrack fade={trackO} />

        {ORBIT_NODES.map((n) => (
          <OrbitNode key={n.key} node={n} progress={p} />
        ))}

        {/* today — the one large meeting interface, centred on its own track.
            The centring lives on a plain wrapper: a motion transform on the
            same element would overwrite the -translate-x/y utilities. */}
        <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
          <motion.div style={{ scale: cardScale }}>
            <NoteWindow />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* the track itself: a hairline curve, a bead of dots riding it, the clay
   memory thread arriving from Q2 Planning, and the faint one leaving for the
   next meeting. SMIL drives the packets, so they cost nothing on the main
   thread; under reduced motion only the quiet geometry renders. */
function OrbitTrack({ fade }: { fade: MotionValue<number> }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
      className="absolute inset-0 z-10 h-full w-full overflow-visible"
      style={{ opacity: fade }}
      aria-hidden
    >
      <defs>
        <filter id="orbit-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <linearGradient id="orbit-track" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--signal)" stopOpacity="0.12" />
          <stop offset="0.45" stopColor="var(--signal)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--signal)" stopOpacity="0.14" />
        </linearGradient>
        {/* the thread fades out at the oldest end and lands at full clay */}
        <linearGradient
          id="orbit-memory"
          gradientUnits="userSpaceOnUse"
          x1={196}
          y1={92}
          x2={236}
          y2={300}
        >
          <stop offset="0" stopColor="var(--signal)" stopOpacity="0.18" />
          <stop offset="0.45" stopColor="var(--signal)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--signal-deep)" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* the whole orbit, hairline — including the stretch behind the window */}
      <path d={TRACK} fill="none" stroke="url(#orbit-track)" strokeWidth={1.6} />

      {/* ahead of today: beads, not a line — nothing has happened there yet */}
      <path
        d={AHEAD_LINE}
        fill="none"
        stroke="var(--signal)"
        strokeOpacity={0.5}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeDasharray="0.01 24"
      />
      {!reduce && (
        /* context leaving today for whatever is booked next */
        <circle r={3.4} fill="var(--signal)" opacity={0.8}>
          <animateMotion dur="3.4s" begin="4.2s" repeatCount="indefinite" path={AHEAD_LINE} />
        </circle>
      )}

      {/* the memory thread — drawn in once, then travelled forever */}
      <motion.path
        d={MEMORY_LINE}
        fill="none"
        stroke="url(#orbit-memory)"
        strokeWidth={2.6}
        strokeLinecap="round"
        initial={reduce ? undefined : { pathLength: 0 }}
        animate={reduce ? undefined : { pathLength: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 1.05 }}
      />
      {!reduce && (
        <>
          <circle r={9} fill="var(--signal)" opacity={0.45} filter="url(#orbit-glow)">
            <animateMotion dur="5s" begin="2.5s" repeatCount="indefinite" path={MEMORY_LINE} />
          </circle>
          <circle r={4} fill="var(--signal)">
            <animateMotion dur="5s" begin="2.5s" repeatCount="indefinite" path={MEMORY_LINE} />
          </circle>
          <circle r={1.7} fill="white">
            <animateMotion dur="5s" begin="2.5s" repeatCount="indefinite" path={MEMORY_LINE} />
          </circle>
        </>
      )}
    </motion.svg>
  );
}

/* one meeting on the track: a dot sitting exactly on the curve, wearing the
   icon for what came out of it, with its label reading away from the window */
function OrbitNode({
  node,
  progress,
}: {
  node: OrbitNodeSpec;
  progress: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  // gather toward the centre before the stage leaves
  const x = useTransform(progress, [0, 0.3], [0, (STAGE_W / 2 - node.at[0]) * 0.5]);
  const y = useTransform(progress, [0, 0.3], [0, (STAGE_H / 2 - node.at[1]) * 0.5]);
  const scale = useTransform(progress, [0, 0.3], [node.scale, node.scale * 0.72]);
  const opacity = useTransform(progress, [0.04, 0.26], [node.fade, 0]);

  // past meetings sit left of the window and read outward; the next one sits
  // right of it. Either way the dot is the edge nearest today.
  const past = node.at[0] < STAGE_W / 2;

  const tone = node.source
    ? "border-signal/35 bg-white shadow-[0_22px_44px_-22px_rgba(189,93,58,0.55)]"
    : node.future
      ? "border-dashed border-line-2 bg-white/70 shadow-[0_14px_30px_-24px_rgba(40,30,20,0.4)]"
      : "border-line bg-white/90 shadow-[0_18px_38px_-24px_rgba(40,30,20,0.45)]";

  const dot = node.source
    ? "bg-signal text-white"
    : node.future
      ? "border border-dashed border-signal/45 bg-white text-signal"
      : "bg-signal-soft text-signal-deep";

  return (
    /* pinned so the dot lands exactly on the curve, whichever side it hangs from */
    <div
      className="absolute z-20 -translate-y-1/2"
      style={
        past
          ? { right: STAGE_W - node.at[0] - DOT_INSET, top: node.at[1] }
          : { left: node.at[0] - DOT_INSET, top: node.at[1] }
      }
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: node.delay }}
      >
        <motion.div
          style={{
            x,
            y,
            scale,
            opacity,
            transformOrigin: past
              ? `calc(100% - ${DOT_INSET}px) center`
              : `${DOT_INSET}px center`,
          }}
          className={`flex items-center gap-2.5 rounded-2xl border py-2 backdrop-blur-sm ${
            past ? "flex-row-reverse pl-4 pr-2 text-right" : "pl-2 pr-4"
          } ${tone}`}
        >
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${dot}`}>
            {node.icon}
          </span>
          <span className="whitespace-nowrap">
            <span className="block text-[14px] font-semibold leading-tight tracking-tight text-ink-display">
              {node.title}
            </span>
            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {node.meta}
            </span>
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ---- page two (sequence): text assembles letter-by-letter, in place ---- */
function SeqPageTwo({
  progress,
  show,
}: {
  progress: MotionValue<number>;
  show: boolean;
}) {
  const bodyO = useTransform(progress, [0.62, 0.8], [0, 1]);
  const bodyY = useTransform(progress, [0.62, 0.8], [22, 0]);
  const visO = useTransform(progress, [0.56, 0.86], [0, 1]);
  const visScale = useTransform(progress, [0.56, 0.86], [0.94, 1]);
  // the widget rises a beat behind the headline — a soft parallax hand-off
  const visY = useTransform(progress, [0.56, 0.92], [48, 0]);
  return (
    <div className="mx-auto grid w-full max-w-[80rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="relative z-10 max-w-[38rem]">
        <h2
          aria-label="Your shorthand, returned as minutes."
          className="display display-tight max-w-[16ch] text-balance text-[clamp(2.2rem,6vw,5.2rem)]"
        >
          <span aria-hidden>
            <ScrollLetters
              text="Your shorthand, returned as"
              progress={progress}
              start={0.46}
              end={0.72}
            />{" "}
            <RevealWord
              progress={progress}
              start={0.68}
              end={0.86}
              className="italic text-gradient-signal"
            >
              minutes.
            </RevealWord>
          </span>
        </h2>

        <motion.p
          style={{ opacity: bodyO, y: bodyY }}
          className="mt-7 max-w-[44ch] text-[18px] leading-relaxed text-ink-3"
        >
          Jot whatever you catch on the call. Your agent turns the mess into
          clean, structured, shareable notes &mdash; headings, owners, next
          steps.
        </motion.p>

        <motion.div
          style={{ opacity: bodyO, y: bodyY }}
          className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4"
        >
          <PillCTA href="/dashboard">Get started free</PillCTA>
          <a
            href="#product"
            className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            See how it works
          </a>
        </motion.div>
      </div>

      {/* zoom steps: on short viewports the 590px card + PiP tiles can't fit
          between the fixed header and the fold — shrink the whole composition
          (layout box included) so it stays clear of the navbar */}
      <motion.div
        style={{ opacity: visO, scale: visScale, y: visY }}
        className="relative hidden justify-self-center lg:block [@media(min-height:701px)_and_(max-height:820px)]:[zoom:0.9] [@media(max-height:700px)]:[zoom:0.78]"
      >
        {show && <NotesWidget />}
      </motion.div>
    </div>
  );
}

/* per-character, scroll-scrubbed reveal — letters fly in from the right as you
   scroll, word by word (words stay intact, so the heading still wraps cleanly) */
function ScrollLetters({
  text,
  progress,
  start,
  end,
}: {
  text: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const words = text.split(" ");
  const totalChars = text.replace(/ /g, "").length;
  const step = ((end - start) * 0.7) / totalChars;
  const windowSize = step * 5;
  let seen = 0;
  return (
    <>
      {words.map((word, wi) => {
        const chars = word.split("").map((ch) => {
          const i = seen++;
          const cs = start + step * i;
          return (
            <Char
              key={i}
              ch={ch}
              progress={progress}
              start={cs}
              end={cs + windowSize}
            />
          );
        });
        return (
          <span key={wi}>
            <span className="inline-block">{chars}</span>
            {wi < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}

function Char({
  ch,
  progress,
  start,
  end,
}: {
  ch: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const x = useTransform(progress, [start, end], [34, 0]);
  const y = useTransform(progress, [start, end], [10, 0]);
  return (
    <motion.span style={{ opacity, x, y }} className="inline-block">
      {ch}
    </motion.span>
  );
}

/* a whole word that flies in as one piece — keeps gradient text intact */
function RevealWord({
  children,
  progress,
  start,
  end,
  className = "",
}: {
  children: ReactNode;
  progress: MotionValue<number>;
  start: number;
  end: number;
  className?: string;
}) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const x = useTransform(progress, [start, end], [60, 0]);
  return (
    <motion.span style={{ opacity, x }} className={`inline-block ${className}`}>
      {children}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/*  Reduced-motion / mobile fallback — a calm, static spread           */
/* ------------------------------------------------------------------ */

function HeroStatic() {
  return (
    <section className="mesh-field mesh-anim grain relative isolate overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-36">
      <div className="relative z-10 flex flex-col gap-20 lg:gap-28">
        {/* page one */}
        <div className="mx-auto grid w-full max-w-[80rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative z-10 max-w-[36rem]">
            <Intro />
          </div>
          <div className="relative hidden lg:block">
            <MeetingOrbit />
          </div>
        </div>

        {/* page two */}
        <div className="mx-auto grid w-full max-w-[80rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="relative z-10 max-w-[38rem]">
            <h2 className="display display-tight max-w-[16ch] text-balance text-[clamp(2.2rem,6vw,5.2rem)]">
              Your shorthand, returned as{" "}
              <span className="italic text-gradient-signal">minutes.</span>
            </h2>
            <p className="mt-7 max-w-[44ch] text-[18px] leading-relaxed text-ink-3">
              Jot whatever you catch on the call. Your agent turns the mess into
              clean, structured, shareable notes &mdash; headings, owners, next
              steps.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PillCTA href="/dashboard">Get started free</PillCTA>
              <a
                href="#product"
                className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                See how it works
              </a>
            </div>
          </div>
          {/* the widget is the payoff — mobile gets it too, not just lg */}
          <div className="relative mt-4 w-full max-w-[460px] justify-self-center pb-8 lg:mt-0 lg:pb-0">
            <NotesWidget />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Intro block (shared by sequence + static)                          */
/* ------------------------------------------------------------------ */

function Intro() {
  return (
    <div className="max-w-[38rem]">
      {/* announcement pill — the newest headline feature, one glance */}
      <Reveal delay={40} y={14}>
        <a
          href="/features/context-gaps"
          className="group/pill sheen inline-flex min-h-[40px] items-center gap-2.5 rounded-pill border border-signal/25 bg-signal-soft/60 py-1.5 pl-3 pr-4 text-[12.5px] font-medium text-signal-deep transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-signal/50"
        >
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute h-full w-full animate-ping rounded-full bg-signal/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-signal" />
          </span>
          New · Agents now answer across meetings
          <span
            aria-hidden
            className="transition-transform duration-300 group-hover/pill:translate-x-0.5"
          >
            →
          </span>
        </a>
      </Reveal>

      {/* the accent line rides a touch smaller than the roman lines so the
          three-line block squares up instead of bulging at the bottom */}
      <WordReveal
        as="h1"
        text="Every meeting,"
        accent="on repeat."
        accentClass="italic text-gradient-signal text-[0.86em]"
        className="display display-tight mt-4 max-w-[15ch] text-balance text-[clamp(2.4rem,6.4vw,5.6rem)]"
        delay={120}
      />

      <Reveal delay={260}>
        <p className="mt-7 max-w-[42ch] text-[18px] leading-relaxed text-ink-3">
          Everyone gets their own agent. It listens, extracts the decisions, and
          carries them forward — across every meeting, not just this one.
        </p>
      </Reveal>

      <Reveal delay={380}>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <PillCTA href="/dashboard">Get started free</PillCTA>
          <a
            href="#how"
            className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            See how it works
          </a>
        </div>
      </Reveal>

      {/* trust line — quiet, honest, mono */}
      <Reveal delay={480}>
        <p className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
          Free to start
          <span aria-hidden className="h-1 w-1 rounded-full bg-signal/60" />
          No bot in the room
          <span aria-hidden className="h-1 w-1 rounded-full bg-signal/60" />
          Every answer cited
        </p>
      </Reveal>
    </div>
  );
}

/* ================================================================== */
/*  The note window                                                    */
/* ================================================================== */

function NoteWindow() {
  const reduce = !!useReducedMotion();
  const live = useTypewriter("Q3 messaging rollout, are teams ready??", reduce);
  const raw = [
    { text: "confirm ICP alignment", tag: "Action" },
    { text: "Deal stalls — sales input", tag: "Decision" },
  ];

  return (
    <div className="w-[348px] overflow-hidden rounded-[24px] border border-line bg-white/95 shadow-[0_50px_100px_-40px_rgba(40,30,20,0.55),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-sm">
      {/* titlebar chrome — reads as a real app window */}
      <div className="flex items-center gap-1.5 border-b border-line/70 px-5 py-3.5">
        <span className="h-3 w-3 rounded-full bg-[#ec6a5e]" />
        <span className="h-3 w-3 rounded-full bg-[#f4bf4f]" />
        <span className="h-3 w-3 rounded-full bg-[#61c454]" />
        <span className="ml-3 truncate text-[11px] font-medium tracking-tight text-ink-3">
          Mytheus · capturing
        </span>
      </div>

      <div className="px-6 pb-6 pt-5">
        {/* title + meta */}
        <h3 className="text-[clamp(1.5rem,3.2vw,2rem)] font-semibold leading-tight tracking-tight text-ink-display">
          Q3 Planning
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-2/60 px-3 py-1.5 text-[12.5px] font-medium text-ink-2">
            <CalendarIcon /> Today <span className="h-3 w-px bg-line-2" /> <PeopleIcon /> 4
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-3">
            <FolderPlusIcon />
          </span>
        </div>

        {/* agent presence strip — the single primary sign of life */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-bg-2/40 px-3.5 py-2.5">
          <span className="inline-flex items-center gap-2.5 text-[12.5px] font-medium text-ink-2">
            <ListeningOrb reduce={reduce} /> Agent listening
          </span>
          <span className="inline-flex items-center gap-2.5">
            {reduce ? <StaticWaveform /> : <Waveform />}
            <LiveTimer reduce={reduce} />
          </span>
        </div>

        {/* where the memory thread lands: the Q2 decision, already in the room
            before anyone had to look it up */}
        <motion.div
          className="mt-3 flex items-center gap-2.5 rounded-2xl border border-signal/25 bg-signal-soft/70 px-3 py-2.5"
          animate={
            reduce
              ? undefined
              : {
                  boxShadow: [
                    "0 0 0 0 rgba(217,119,87,0)",
                    "0 0 0 0 rgba(217,119,87,0)",
                    "0 0 0 4px rgba(217,119,87,0.18)",
                    "0 0 0 0 rgba(217,119,87,0)",
                  ],
                }
          }
          transition={
            reduce
              ? undefined
              : {
                  // peaks as the packet on the memory thread lands (5s loop)
                  duration: 5,
                  times: [0, 0.9, 0.97, 1],
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 2.5,
                }
          }
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-signal text-white">
            <DiamondGlyph />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium leading-tight text-ink">
              Pricing locked at $49
            </span>
            <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-signal-deep">
              Carried in from Q2 Planning
            </span>
          </span>
        </motion.div>

        {/* transcript: settled shorthand already tagged; live line still classifying */}
        <div className="mt-4 min-h-[124px] space-y-3 text-[15px] leading-relaxed">
          {raw.map((r) => (
            <CapturedLine key={r.text} text={r.text} tag={r.tag} />
          ))}
          <div className="flex items-start justify-between gap-3 pt-0.5">
            <p className="text-ink">
              {live}
              {!reduce && <Caret />}
            </p>
            <span className="mt-px inline-flex min-w-[3.75rem] shrink-0 items-center justify-center rounded-full border border-line bg-bg-2/70 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-ink-3">
              {reduce ? "Action" : <ClassifyingDots />}
            </span>
          </div>
        </div>

        {/* footer — one status widget + one scroll hook */}
        <div className="mt-4 border-t border-line pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-ink-2">Minutes forming</span>
            <span className="font-mono text-[11px] tabular-nums text-signal-deep">3 captured</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-3">
            <div className={`${reduce ? "" : "sheen"} h-full w-[62%] rounded-full bg-signal`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- agent presence: a clay core that breathes under one soft aura ring ---- */
function ListeningOrb({ reduce }: { reduce: boolean }) {
  return (
    <span className="relative grid h-4 w-4 place-items-center" aria-hidden>
      {!reduce && (
        <motion.span
          className="absolute h-2 w-2 rounded-full bg-signal/30"
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: [0.8, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <motion.span
        className="relative h-2 w-2 rounded-full bg-signal shadow-[0_0_0_3px_rgba(217,119,87,0.16)]"
        animate={reduce ? undefined : { scale: [1, 1.18, 1] }}
        transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </span>
  );
}

/* ---- a meeting clock that genuinely ticks (04:12 → …), clamped to 2 digits ---- */
function LiveTimer({ reduce }: { reduce: boolean }) {
  const [secs, setSecs] = useState(252);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setSecs((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [reduce]);
  const t = secs % 6000;
  const mm = String(Math.floor(t / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  return (
    <span className="font-mono text-[11px] uppercase tabular-nums tracking-wider text-ink-3">
      {mm}:{ss}
    </span>
  );
}

/* ---- a settled shorthand line already wearing its structured tag ---- */
function CapturedLine({ text, tag }: { text: string; tag: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-ink-3">{text}</p>
      <span className="mt-px inline-flex min-w-[3.75rem] shrink-0 items-center justify-center rounded-full bg-signal-soft px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-signal-deep">
        {tag}
      </span>
    </div>
  );
}

/* ---- the live line's "classifying" indicator: same pill slot, filling in ---- */
function ClassifyingDots() {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-signal/70"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

/* ---- reduced-motion fallback for Waveform (which loops unguarded) ---- */
function StaticWaveform() {
  const bars = [0.5, 0.9, 0.4, 1, 0.6];
  return (
    <span className="flex h-3.5 items-center gap-[2px]" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-signal"
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </span>
  );
}

function useTypewriter(full: string, reduce: boolean) {
  const [text, setText] = useState(reduce ? full : "");
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    let raf = 0;
    let last = 0;
    const start = (ts: number) => {
      last = ts + 900;
      raf = requestAnimationFrame(tick);
    };
    const tick = (ts: number) => {
      if (ts >= last && i <= full.length) {
        setText(full.slice(0, i));
        i += 1;
        last = ts + 55;
      }
      if (i <= full.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(start);
    return () => cancelAnimationFrame(raf);
  }, [full, reduce]);
  return text;
}

function Caret() {
  return (
    <motion.span
      aria-hidden
      className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] rounded-full bg-signal align-middle"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ---------------- orbit glyphs — what each meeting left behind ------ */

/* confirmed */
function TickGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M2.5 6.2 5 8.5 9.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* an action that left the room with an owner */
function ActionGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M2 6h7m0 0L6.4 3.4M9 6 6.4 8.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* a decision — the same clay diamond the memory timeline uses further down */
function DiamondGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
      <path d="M6 1.4 10.6 6 6 10.6 1.4 6Z" fill="currentColor" />
    </svg>
  );
}

/* still ahead */
function ClockGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3.6V6l1.8 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- small inline icons ---------------- */

function Waveform() {
  const bars = [0.5, 0.9, 0.4, 1, 0.6];
  return (
    <span className="flex h-3.5 items-center gap-[2px]" aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-signal"
          style={{ height: `${h * 100}%` }}
          animate={{ scaleY: [0.4, 1, 0.5, 0.9, 0.4] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <rect x="2.5" y="3" width="11" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6h11M5.5 2v2M10.5 2v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <circle cx="6" cy="5.5" r="2.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 13c0-2 1.6-3.3 3.5-3.3S9.5 11 9.5 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10.5 3.6a2.3 2.3 0 0 1 0 4.4M11.5 13c0-1.4-.5-2.5-1.4-3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function FolderPlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.3l1.2 1.4h5.5A1.5 1.5 0 0 1 14 5.9v5.6A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M8 7.3v3M6.5 8.8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
