"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { PillCTA } from "./ui";
import { WordReveal, Reveal, Magnetic, Float } from "./motion";
import { NotesWidget } from "./NotesEnhanceDemo";

/* ================================================================== */
/*  Hero — a scroll-driven, two-page filmstrip pinned to the viewport.  */
/*  Page one (the live "Q3 GTM sync" capture) slides out to the LEFT    */
/*  and exits as you scroll, while page two (the memory the agent       */
/*  leaves behind) arrives from the RIGHT onto the same screen.         */
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

  // the scroll cue fades the instant you begin
  const cueO = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

  // a gentle camera pull-back as you scroll away into the next section
  const stageScale = useTransform(scrollYProgress, [0.9, 1], [1, 0.97]);

  return (
    <section ref={ref} className="relative" style={{ height: "260vh" }}>
      <div className="mesh-field mesh-anim grain sticky top-0 h-screen overflow-hidden">
        <motion.div className="absolute inset-0" style={{ scale: stageScale }}>
          {/* ---- page one — gathers, then exits to the left ---- */}
          <div
            className={`absolute inset-0 flex items-center ${
              showTwo ? "pointer-events-none" : ""
            }`}
          >
            <SeqPageOne progress={p} />
          </div>

          {/* ---- page two — assembles in place on the same stage ---- */}
          <div
            className={`absolute inset-0 flex items-center ${
              showTwo ? "" : "pointer-events-none"
            }`}
          >
            <SeqPageTwo progress={p} show={showTwo} />
          </div>
        </motion.div>

        {/* ---- scroll cue ---- */}
        <motion.div
          aria-hidden
          style={{ opacity: cueO }}
          className="pointer-events-none absolute inset-x-0 bottom-9 z-30 flex flex-col items-center gap-1.5 text-ink-3"
        >
          <span className="kicker text-[10px]">Scroll</span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown />
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  The cluster of cards + per-card converge interpolation             */
/* ------------------------------------------------------------------ */

type Pose = { x: number; y: number; r: number; s: number };

const POSES: {
  key: string;
  z: number;
  home: Pose;
  stack: Pose;
  node: ReactNode;
}[] = [
  {
    key: "sunburst",
    z: 10,
    home: { x: 70, y: -158, r: 5, s: 1 },
    stack: { x: 36, y: -32, r: -11, s: 0.9 },
    node: <SunburstPanel />,
  },
  {
    key: "clay",
    z: 10,
    home: { x: -300, y: 86, r: -8, s: 1 },
    stack: { x: -44, y: 32, r: 11, s: 0.9 },
    node: <ClayPanel />,
  },
  {
    key: "note",
    z: 30,
    home: { x: 0, y: 0, r: -1.5, s: 1 },
    stack: { x: -16, y: 0, r: -5, s: 0.9 },
    node: <NoteWindow />,
  },
  /* satellites — small product truths orbiting the capture window. Each one
     teases a section further down the page (agents, routing, memory), so the
     hero itself invites the scroll. */
  {
    key: "agents",
    z: 40,
    home: { x: -256, y: -218, r: -6, s: 1 },
    stack: { x: -38, y: -52, r: 8, s: 0.88 },
    node: <AgentsSatellite />,
  },
  {
    key: "routed",
    z: 40,
    home: { x: -252, y: 168, r: -7, s: 1 },
    stack: { x: -56, y: 54, r: -14, s: 0.88 },
    node: <RoutedSatellite />,
  },
  {
    key: "memory",
    z: 35,
    home: { x: 272, y: 118, r: 6, s: 1 },
    stack: { x: 48, y: 40, r: 10, s: 0.88 },
    node: <MemorySatellite />,
  },
];

/* ---- page one (sequence): intro fades + drifts, cards gather then fly left ---- */
function SeqPageOne({ progress }: { progress: MotionValue<number> }) {
  const introO = useTransform(progress, [0, 0.26], [1, 0]);
  const introX = useTransform(progress, [0, 0.34], [0, -90]);
  return (
    <div className="mx-auto grid w-full max-w-[80rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[0.95fr_1.05fr]">
      <motion.div
        style={{ opacity: introO, x: introX }}
        className="relative z-10 max-w-[36rem]"
      >
        <Intro />
      </motion.div>
      <div className="relative hidden lg:block">
        <ConvergingCluster progress={progress} />
      </div>
    </div>
  );
}

function ConvergingCluster({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="relative mx-auto h-[480px] w-[700px] scale-[0.66] xl:scale-90">
      {POSES.map((pose) => (
        <ConvergeCard key={pose.key} pose={pose} progress={progress} />
      ))}
    </div>
  );
}

function ConvergeCard({
  pose,
  progress,
}: {
  pose: (typeof POSES)[number];
  progress: MotionValue<number>;
}) {
  // 0 → 0.3 : the spread "home" poses gather into the centre stack
  // 0.3 → 0.55 : the whole stack slides left and fades out (vanishes)
  const x = useTransform(
    progress,
    [0, 0.3, 0.55],
    [pose.home.x, pose.stack.x, -900],
  );
  const y = useTransform(progress, [0, 0.3], [pose.home.y, pose.stack.y]);
  const rotate = useTransform(
    progress,
    [0, 0.3, 0.55],
    [pose.home.r, pose.stack.r, pose.stack.r - 10],
  );
  const scale = useTransform(progress, [0, 0.3], [pose.home.s, pose.stack.s]);
  const opacity = useTransform(progress, [0.4, 0.54], [1, 0]);
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ zIndex: pose.z }}
    >
      <motion.div style={{ x, y, rotate, scale, opacity }}>{pose.node}</motion.div>
    </div>
  );
}

/* the card cluster held at its spread "home" poses — the whole page slides as
   one now, so the cards no longer animate individually. */
function StaticCluster() {
  return (
    <div className="relative mx-auto h-[480px] w-[700px] scale-[0.66] xl:scale-90">
      {POSES.map((pose) => (
        <div
          key={pose.key}
          className="absolute inset-0 grid place-items-center"
          style={{ zIndex: pose.z }}
        >
          <div
            style={{
              transform: `translate(${pose.home.x}px, ${pose.home.y}px) rotate(${pose.home.r}deg)`,
            }}
          >
            {pose.node}
          </div>
        </div>
      ))}
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
  return (
    <div className="mx-auto grid w-full max-w-[80rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="relative z-10 max-w-[38rem]">
        <h2
          aria-label="Your shorthand, returned as minutes."
          className="display display-tight max-w-[16ch] text-balance text-[clamp(2.6rem,6vw,5.2rem)]"
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
          className="mt-10 flex items-center gap-6"
        >
          <Magnetic strength={0.3}>
            <PillCTA href="/dashboard">Get started free</PillCTA>
          </Magnetic>
          <a
            href="#product"
            className="text-[15px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            See how it works
          </a>
        </motion.div>
      </div>

      <motion.div
        style={{ opacity: visO, scale: visScale }}
        className="relative hidden justify-self-center lg:block"
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
    <section className="mesh-field mesh-anim grain relative isolate overflow-hidden py-16 lg:py-24">
      <div className="relative z-10 flex flex-col gap-20 lg:gap-28">
        {/* page one */}
        <div className="mx-auto grid w-full max-w-[80rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative z-10 max-w-[36rem]">
            <Intro />
          </div>
          <div className="relative hidden lg:block">
            <StaticCluster />
          </div>
        </div>

        {/* page two */}
        <div className="mx-auto grid w-full max-w-[80rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative z-10 max-w-[38rem]">
            <h2 className="display display-tight max-w-[16ch] text-balance text-[clamp(2.6rem,6vw,5.2rem)]">
              Your shorthand, returned as{" "}
              <span className="italic text-gradient-signal">minutes.</span>
            </h2>
            <p className="mt-7 max-w-[44ch] text-[18px] leading-relaxed text-ink-3">
              Jot whatever you catch on the call. Your agent turns the mess into
              clean, structured, shareable notes &mdash; headings, owners, next
              steps.
            </p>
            <div className="mt-10 flex items-center gap-6">
              <Magnetic strength={0.3}>
                <PillCTA href="/dashboard">Get started free</PillCTA>
              </Magnetic>
              <a
                href="#product"
                className="text-[15px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                See how it works
              </a>
            </div>
          </div>
          <div className="relative hidden justify-self-center lg:block">
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
          className="group/pill sheen inline-flex items-center gap-2.5 rounded-pill border border-signal/25 bg-signal-soft/60 py-1.5 pl-3 pr-4 text-[12.5px] font-medium text-signal-deep transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-signal/50"
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

      <WordReveal
        as="h1"
        text="Every meeting,"
        accent="on repeat."
        accentClass="italic text-gradient-signal"
        className="display display-tight mt-6 max-w-[15ch] text-balance text-[clamp(2.8rem,6.4vw,5.6rem)]"
        delay={120}
      />

      <Reveal delay={260}>
        <p className="mt-7 max-w-[42ch] text-[18px] leading-relaxed text-ink-3">
          Everyone gets their own agent. It listens, extracts the decisions, and
          carries them forward — across every meeting, not just this one.
        </p>
      </Reveal>

      <Reveal delay={380}>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Magnetic strength={0.3}>
            <PillCTA href="/dashboard">Get started free</PillCTA>
          </Magnetic>
          <a
            href="#how"
            className="text-[15px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
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
    <div className="w-[336px] overflow-hidden rounded-[24px] border border-line bg-white/95 shadow-[0_50px_100px_-40px_rgba(40,30,20,0.55),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-sm">
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
          Q3 GTM sync
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
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-signal-deep">
            See it become minutes
            <motion.span
              aria-hidden
              animate={reduce ? undefined : { y: [0, 2, 0] }}
              transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown />
            </motion.span>
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

/* ================================================================== */
/*  Satellites — floating product truths around the note window        */
/* ================================================================== */

/** Fade-lift entrance for a satellite, staggered after the hero copy. */
function SatEnter({ children, delay }: { children: ReactNode; delay: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function SatAvatar({
  initials,
  className = "",
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={`grid h-6 w-6 place-items-center rounded-full border-[1.5px] border-white bg-signal-soft font-mono text-[8.5px] font-bold text-signal-deep ${className}`}
    >
      {initials}
    </span>
  );
}

/* "one agent per person" — the core promise, worn as a badge */
function AgentsSatellite() {
  return (
    <SatEnter delay={0.55}>
      <Float amount={7} duration={7.5}>
        <div className="flex items-center gap-2.5 rounded-full border border-line bg-white/95 py-2 pl-2.5 pr-4 shadow-[0_24px_48px_-24px_rgba(40,30,20,0.45)] backdrop-blur-sm">
          <span className="flex -space-x-1.5">
            <SatAvatar initials="PR" />
            <SatAvatar initials="MA" />
            <SatAvatar initials="DI" />
            <span className="grid h-6 w-6 place-items-center rounded-full border-[1.5px] border-white bg-signal font-mono text-[8.5px] font-bold text-white">
              +1
            </span>
          </span>
          <span className="whitespace-nowrap text-[12px] font-medium text-ink-2">
            One agent per person
          </span>
        </div>
      </Float>
    </SatEnter>
  );
}

/* a decision that already left the room — teases Confirm → Route */
function RoutedSatellite() {
  return (
    <SatEnter delay={0.7}>
      <Float amount={6} duration={8.5}>
        <div className="w-[212px] rounded-[20px] border border-line bg-white/95 p-4 shadow-[0_30px_60px_-30px_rgba(40,30,20,0.45)] backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="kicker text-[9.5px] text-signal">
              Decision · routed
            </span>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-signal text-white">
              <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                <path
                  d="M2.5 6.2 5 8.5 9.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-[13px] font-semibold leading-snug tracking-tight text-ink-display">
            Pricing locked at $49
          </p>
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
            <SatAvatar initials="SA" />
            <span className="text-[11px] leading-tight text-ink-3">
              Sarah owns it · shared with 2
            </span>
          </div>
        </div>
      </Float>
    </SatEnter>
  );
}

/* a fact carried across meetings — teases the memory timeline below */
function MemorySatellite() {
  return (
    <SatEnter delay={0.85}>
      <Float amount={8} duration={6.5}>
        <div className="w-[224px] rounded-[20px] border border-signal/25 bg-signal-soft/85 p-4 shadow-[0_30px_60px_-32px_rgba(189,93,58,0.5)] backdrop-blur-sm">
          <span className="kicker text-[9.5px] text-signal-deep">
            Cross-meeting memory
          </span>
          <p className="mt-2 text-[12.5px] font-medium leading-snug text-ink">
            &ldquo;Q2 pricing decision&rdquo; resurfaced for today&rsquo;s sync
          </p>
          <p className="mt-2.5 font-mono text-[9.5px] uppercase tracking-wider text-signal-deep">
            Apr 3 &rarr; Today
          </p>
        </div>
      </Float>
    </SatEnter>
  );
}

/* ================================================================== */
/*  Backdrop panels                                                    */
/* ================================================================== */

function SunburstPanel() {
  return (
    <div className="h-[300px] w-[320px] overflow-hidden rounded-[26px] shadow-[0_40px_80px_-40px_rgba(189,93,58,0.5)]">
      <div className="sunburst grain absolute inset-0" />
    </div>
  );
}

function ClayPanel() {
  return (
    <div className="h-[260px] w-[180px] rounded-[24px] border border-signal/15 bg-signal-soft shadow-[0_30px_60px_-36px_rgba(189,93,58,0.45)]" />
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
