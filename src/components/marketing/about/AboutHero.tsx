"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Reveal,
  Stagger,
  StaggerItem,
  Magnetic,
  Float,
  CountUp,
} from "@/components/landing/motion";

/* ================================================================== */
/*  AboutHero — the cinematic opener for the CyberSprinters page.      */
/*  A letter-cascade headline assembles over a living backdrop:        */
/*  a drifting dot-grid, one slow orbiting dashed ring with a clay     */
/*  satellite, and four floating member chips (SS/SR/SM/YV) that bob   */
/*  and react magnetically. Honest stats count up; a scroll cue        */
/*  closes the frame. Every bespoke animation guards reduced motion    */
/*  by rendering the complete static frame instead.                    */
/* ================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

const TEAM = [
  { name: "Sushan", initials: "SS" },
  { name: "Samar", initials: "SR" },
  { name: "Shaun", initials: "SM" },
  { name: "Yash", initials: "YV" },
];

/* chip poses for the wide-viewport constellation */
const CHIP_POSES = [
  { pos: "left-[5%] top-[24%]", rotate: -6, amount: 8, duration: 7 },
  { pos: "right-[6%] top-[30%]", rotate: 5, amount: 7, duration: 8.2 },
  { pos: "left-[9%] bottom-[27%]", rotate: 4, amount: 9, duration: 6.4 },
  { pos: "right-[8%] bottom-[22%]", rotate: -5, amount: 6, duration: 7.6 },
] as const;

export function AboutHero() {
  const reduce = useReducedMotion();

  return (
    <section className="mesh-field mesh-anim grain relative isolate overflow-hidden">
      {/* ---------------- living backdrop ---------------- */}
      <Backdrop reduce={!!reduce} />
      <OrbitRing reduce={!!reduce} />

      {/* floating member chips — the constellation (wide viewports only) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        {TEAM.map((m, i) => (
          <div
            key={m.initials}
            className={`pointer-events-auto absolute ${CHIP_POSES[i].pos}`}
            style={{ transform: `rotate(${CHIP_POSES[i].rotate}deg)` }}
          >
            <ChipEnter delay={1.1 + i * 0.14} reduce={!!reduce}>
              <Float amount={CHIP_POSES[i].amount} duration={CHIP_POSES[i].duration}>
                <Magnetic strength={0.5}>
                  <MemberChip name={m.name} initials={m.initials} />
                </Magnetic>
              </Float>
            </ChipEnter>
          </div>
        ))}
      </div>

      {/* ---------------- content column ---------------- */}
      <div className="relative z-10 mx-auto flex min-h-[92svh] w-full max-w-[80rem] flex-col items-center px-6 pt-20 text-center sm:px-8 sm:pt-28">
        {/* eyebrow pill */}
        <Reveal delay={40} y={12}>
          <span className="sheen inline-flex min-h-[36px] items-center gap-2.5 rounded-pill border border-signal/25 bg-signal-soft/60 px-4 py-1.5">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              {!reduce && (
                <span className="absolute h-full w-full animate-ping rounded-full bg-signal/60" />
              )}
              <span className="relative h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-signal-deep">
              CyberSprinters
            </span>
          </span>
        </Reveal>

        {/* the headline — assembles letter by letter, then the accent line
            rises word by word. Static under reduced motion. */}
        <h1
          aria-label="Four minds. One sprint."
          className="display display-tight mt-7 max-w-[12ch] text-balance text-[clamp(2.7rem,10vw,7rem)]"
        >
          {reduce ? (
            <>
              <span className="block">Four minds.</span>
              <span className="text-gradient-signal block">One sprint.</span>
            </>
          ) : (
            <span aria-hidden>
              <LetterCascade text="Four minds." delay={0.3} />
              <WordRise text="One sprint." delay={0.85} wordClass="text-gradient-signal" />
            </span>
          )}
        </h1>

        <Reveal delay={520}>
          <p className="mx-auto mt-7 max-w-[46ch] text-[16px] leading-relaxed text-ink-3 sm:text-[18px]">
            We build agentic AI &mdash; software that listens, decides, and
            remembers. Mytheus is that promise shipped: every meeting, carried
            forward.
          </p>
        </Reveal>

        {/* member chips inline — the small-viewport constellation */}
        <Reveal delay={640} className="lg:hidden">
          <div aria-hidden className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {TEAM.map((m) => (
              <MemberChip key={m.initials} name={m.name} initials={m.initials} compact />
            ))}
          </div>
        </Reveal>

        {/* honest stats, counting up in view */}
        <Stagger className="mt-12 flex flex-wrap items-start justify-center gap-x-10 gap-y-8 sm:mt-16 sm:gap-x-14">
          <StaggerItem>
            <StatBlock label="builders">
              <CountUp to={4} prefix="0" className="tabular-nums" />
            </StatBlock>
          </StaggerItem>
          <StaggerItem className="hidden self-center sm:block">
            <span aria-hidden className="block h-14 w-px bg-line-2" />
          </StaggerItem>
          <StaggerItem>
            <StatBlock label="flagship &middot; Mytheus">
              <CountUp to={1} prefix="0" className="tabular-nums" />
            </StatBlock>
          </StaggerItem>
          <StaggerItem className="hidden self-center sm:block">
            <span aria-hidden className="block h-14 w-px bg-line-2" />
          </StaggerItem>
          <StaggerItem>
            <StatBlock label="sprints, and counting">
              <span className="text-signal-deep">&infin;</span>
            </StatBlock>
          </StaggerItem>
        </Stagger>

        {/* scroll cue */}
        <div className="mt-auto pb-9 pt-14">
          <Reveal delay={900} y={10}>
            <div aria-hidden className="flex flex-col items-center gap-1.5 text-ink-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em]">
                Meet the four
              </span>
              <motion.span
                animate={reduce ? undefined : { y: [0, 6, 0] }}
                transition={
                  reduce
                    ? undefined
                    : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                }
              >
                <ChevronDown />
              </motion.span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Backdrop — two drifting dot-grids (parallax speeds) + a clay glow.  */
/*  Static (grids + glow still render) under reduced motion.            */
/* ------------------------------------------------------------------ */

function Backdrop({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* soft clay halo behind the headline */}
      <div className="orb-glow absolute left-1/2 top-[38%] h-[min(70vw,480px)] w-[min(70vw,480px)] -translate-x-1/2 -translate-y-1/2 opacity-60" />

      {/* dot-grids, masked to fade at the edges */}
      <div
        className="absolute inset-0"
        style={{
          maskImage:
            "radial-gradient(72% 64% at 50% 44%, black 32%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(72% 64% at 50% 44%, black 32%, transparent 80%)",
        }}
      >
        <motion.div
          className="absolute -inset-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(var(--line-2) 1.1px, transparent 1.1px)",
            backgroundSize: "30px 30px",
          }}
          animate={reduce ? undefined : { x: [0, 30], y: [0, 30] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -inset-16 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(var(--signal-glow) 1.4px, transparent 1.4px)",
            backgroundSize: "64px 64px",
          }}
          animate={reduce ? undefined : { x: [0, -64], y: [0, 64] }}
          transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  OrbitRing — a dashed ring behind the headline; a clay satellite     */
/*  (with a faint trailing glow) circles it slowly. Static ring + dot   */
/*  under reduced motion.                                               */
/* ------------------------------------------------------------------ */

function OrbitRing({ reduce }: { reduce: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[42%] h-[min(96vw,620px)] w-[min(96vw,620px)] -translate-x-1/2 -translate-y-1/2"
    >
      {/* outer faint ring */}
      <div className="absolute -inset-10 rounded-full border border-line/70" />
      {/* the dashed orbit */}
      <div className="absolute inset-0 rounded-full border border-dashed border-signal/25" />
      {/* the satellite */}
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-1/2 top-0 -ml-[7px] -mt-[7px] grid h-3.5 w-3.5 place-items-center">
          <span className="absolute h-3.5 w-3.5 rounded-full bg-signal/25 blur-[2px]" />
          <span className="relative h-2 w-2 rounded-full bg-signal" />
        </span>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Headline choreography                                               */
/* ------------------------------------------------------------------ */

const letterVar: Variants = {
  hidden: { y: "115%", rotate: 5 },
  show: {
    y: 0,
    rotate: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

const wordVar: Variants = {
  hidden: { y: "115%" },
  show: { y: 0, transition: { duration: 0.9, ease: EASE } },
};

/* per-letter masked rise; words stay intact so the line wraps cleanly */
function LetterCascade({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <motion.span
      className="block"
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.045, delayChildren: delay }}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split("").map((ch, ci) => (
            <span
              key={ci}
              className="inline-block overflow-hidden align-bottom"
              style={{ paddingBottom: "0.2em", marginBottom: "-0.2em" }}
            >
              <motion.span className="inline-block" variants={letterVar}>
                {ch}
              </motion.span>
            </span>
          ))}
          {wi < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.span>
  );
}

/* per-word masked rise — keeps the gradient continuous within each word */
function WordRise({
  text,
  delay = 0,
  wordClass = "",
}: {
  text: string;
  delay?: number;
  wordClass?: string;
}) {
  const words = text.split(" ");
  return (
    <motion.span
      className="block"
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.12, delayChildren: delay }}
    >
      {words.map((word, wi) => (
        <span
          key={wi}
          className="inline-block overflow-hidden align-bottom"
          style={{ paddingBottom: "0.2em", marginBottom: "-0.2em" }}
        >
          <motion.span className={`inline-block ${wordClass}`} variants={wordVar}>
            {word}
            {wi < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/*  Small pieces                                                        */
/* ------------------------------------------------------------------ */

/* one member chip: initials disc + first name */
function MemberChip({
  name,
  initials,
  compact = false,
}: {
  name: string;
  initials: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill border border-line bg-surface/90 shadow-[0_18px_36px_-22px_rgba(40,30,20,0.45)] backdrop-blur-sm ${
        compact ? "gap-1.5 py-1 pl-1 pr-3" : "gap-2 py-1.5 pl-1.5 pr-4"
      }`}
    >
      <span
        className={`grid place-items-center rounded-full bg-signal-soft font-mono font-bold text-signal-deep ${
          compact ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]"
        }`}
      >
        {initials}
      </span>
      <span
        className={`whitespace-nowrap font-medium text-ink-2 ${
          compact ? "text-[11.5px]" : "text-[12.5px]"
        }`}
      >
        {name}
      </span>
    </span>
  );
}

/* fade-lift entrance for the constellation chips, after the headline lands */
function ChipEnter({
  children,
  delay,
  reduce,
}: {
  children: React.ReactNode;
  delay: number;
  reduce: boolean;
}) {
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* one stat: a big display number over a mono kicker label */
function StatBlock({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <span className="display inline-block min-w-[2ch] text-[clamp(2.1rem,5vw,3.4rem)]">
        {children}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
        {label}
      </span>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
