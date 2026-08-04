"use client";

import { type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  PinnedScene,
  StageSwitch,
  ScrubReveal,
  Reveal,
  WordReveal,
} from "./motion";
import {
  CaptureDemo,
  LabelDemo,
  ConfirmDemo,
  RouteDemo,
  RememberDemo,
} from "./steps/demos";

/* "How it works" as a scroll-pinned sequential scene: below the heading the
   section pins for five viewport-heights and the five stages of follow-through
   (Capture → Label → Confirm → Route → Remember) swap in place — a vertical
   progress spine on the left ties the swap to scroll, and each stage plays a
   mini live demo of the product moment. The viewport never jumps; only the
   stage inside the pinned frame changes (StageSwitch). On top of the swap
   sits a scroll-linked cinematic layer (SceneFrame): a camera push into the
   frame at the start of the pin and a gentle pull-back at the end, a
   drifting dot-grid texture + traveling clay glow behind the content, and a
   slow push-in on each demo card during its dwell. Mobile and reduced-motion
   render the five stages as a calm static stack instead.

   The section is deliberately label-light: no section eyebrow, no per-stage
   kicker and no stage-word watermark. The left rail names the active stage;
   everything else would be the same word again in the same viewport. */

function MicIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function SortIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function ShieldCheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SendIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4.5 12 20 4.5 15 20l-3.5-5.5L4.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function LoopIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 9a7 7 0 0 1 12-3.2L18.5 8M20 15a7 7 0 0 1-12 3.2L5.5 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 4v4h-4M5.5 20v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Card = {
  key: string;
  n: string;
  flow: string;
  title: string;
  body: string;
  /** one-liner shown in the spine while this stage dwells */
  hint: string;
  icon: ReactNode;
  tokens: { label: string; clay?: boolean }[];
  visual: (still: boolean) => ReactNode;
};

const CARDS: Card[] = [
  {
    key: "capture",
    n: "01",
    flow: "Capture",
    title: "Every word, captured",
    body: "No bot joins the call — and no two people get the same notes.",
    hint: "Your agent listens with your role in mind",
    icon: <MicIcon />,
    tokens: [{ label: "Role-relevant notes" }, { label: "Live transcript" }],
    visual: (still) => <CaptureDemo still={still} />,
  },
  {
    key: "label",
    n: "02",
    flow: "Label",
    title: "Decisions, sorted",
    body: "Nothing is left for you to categorize afterwards.",
    hint: "Tagged the second it leaves someone's mouth",
    icon: <SortIcon />,
    tokens: [
      { label: "Decision", clay: true },
      { label: "Action item", clay: true },
      { label: "Conflict", clay: true },
    ],
    visual: (still) => <LabelDemo still={still} />,
  },
  {
    key: "confirm",
    n: "03",
    flow: "Confirm",
    title: "Never committed silently",
    body: "The agent proposes. You decide what becomes real.",
    hint: "The agent waits for your tap",
    icon: <ShieldCheckIcon />,
    tokens: [{ label: "One-tap confirm" }],
    visual: (still) => <ConfirmDemo still={still} />,
  },
  {
    key: "route",
    n: "04",
    flow: "Route",
    title: "Sent to the right people",
    body: "Nobody has to chase anyone for a status update.",
    hint: "Owner set, absentees briefed",
    icon: <SendIcon />,
    tokens: [{ label: "Owner assigned" }, { label: "Shared with absentees" }],
    visual: (still) => <RouteDemo still={still} />,
  },
  {
    key: "remember",
    n: "05",
    flow: "Remember",
    title: "Carried to the next meeting",
    body: "It resurfaces on its own, without anyone searching for it.",
    hint: "Monday's call, remembered on Friday",
    icon: <LoopIcon />,
    tokens: [{ label: "→ Next meeting" }, { label: "Cross-meeting memory" }],
    visual: (still) => <RememberDemo still={still} />,
  },
];

export function Steps() {
  const reduce = useReducedMotion();

  return (
    <section
      id="how"
      className={`px-3 sm:px-5 ${reduce ? "py-24 sm:py-32" : "py-24 sm:py-32 md:py-6"}`}
    >
      <div className="mx-auto max-w-[1340px]">
        {/* mobile / reduced-motion header — the pinned scene carries its own */}
        <div
          className={`mx-auto max-w-[900px] text-center ${reduce ? "" : "md:hidden"}`}
        >
          <ScrubReveal>
            {/* no eyebrow: the numbered 01–05 cards below already say
                "how it works" — see PinHeading for the same call */}
            <h2 className="display mx-auto max-w-[18ch] text-[clamp(2.2rem,5.5vw,4rem)]">
              Follow-through, without{" "}
              <span className="text-gradient-signal">the follow-up</span>.
            </h2>
          </ScrubReveal>
        </div>

        {/* desktop: the pinned sequential scene — heading and stages fitted
            together inside the pinned viewport */}
        {!reduce && (
          <PinnedScene count={CARDS.length} className="hidden md:block">
            {({ index, progress, goTo }) => (
              <SceneFrame progress={progress}>
                <Spine index={index} progress={progress} goTo={goTo} />
                <Stage index={index} progress={progress} />
              </SceneFrame>
            )}
          </PinnedScene>
        )}

        {/* mobile (and desktop reduced-motion): a calm static stack */}
        <Reveal
          delay={120}
          className={`mt-12 grid gap-4 sm:mt-14 sm:gap-5 ${
            reduce ? "md:grid-cols-2" : "md:hidden"
          }`}
        >
          {CARDS.map((c) => (
            <article
              key={c.key}
              className="rounded-card border border-line bg-white p-5 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-signal">
                  <span className="font-mono text-sm tabular-nums">{c.n}</span>
                  <span className="kicker">{c.flow}</span>
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-soft text-signal-deep">
                  {c.icon}
                </span>
              </div>
              <h3 className="mt-4 text-[1.35rem] font-medium tracking-tight text-ink-display">
                {c.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{c.body}</p>
              <div className="mt-5">{c.visual(true)}</div>
              <Tokens tokens={c.tokens} className="mt-5" />
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** 0→1 within the current stage's scroll segment (sawtooth over the pin). */
function toStageLocal(v: number) {
  const s = Math.min(v, 0.9999) * CARDS.length;
  return s - Math.floor(s);
}

/* ---------------- the cinematic frame around the pinned scene ---------------- */

/* takes no `index` — the frame is pure scroll-driven texture now that the
   per-stage watermark is gone; the stage itself is the `children` */
function SceneFrame({
  progress,
  children,
}: {
  progress: MotionValue<number>;
  children: ReactNode;
}) {
  const cam = useSpring(progress, { stiffness: 90, damping: 28, mass: 0.4 });

  /* camera push: the frame settles in over the first beats of the pin and
     eases back out at the end — a zoom the scrubber drives, never a cut */
  const scale = useTransform(cam, [0, 0.08, 0.92, 1], [0.96, 1, 1, 0.98]);
  const opacity = useTransform(cam, [0, 0.07, 0.93, 1], [0.7, 1, 1, 0.82]);

  /* scroll textures: the dot grid drifts against scroll, the glow travels
     down through the scene over the full pin */
  const gridY = useTransform(cam, [0, 1], ["0%", "-9%"]);
  const glowTop = useTransform(cam, [0, 1], ["-14%", "56%"]);
  const glowLeft = useTransform(cam, [0, 1], ["60%", "38%"]);

  /* parallax depth: the content plane counter-drifts against the grid and
     glow — two planes, one scrubber (the watermark was the third) */
  const contentY = useTransform(cam, [0, 1], [10, -10]);

  return (
    <div className="relative flex h-full w-full flex-col pb-3 pt-[84px]">
      {/* drifting dot-grid texture, faded out toward the frame edges */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -inset-y-[12%]"
        style={{
          y: gridY,
          backgroundImage:
            "radial-gradient(var(--line-2) 1.1px, transparent 1.1px)",
          backgroundSize: "26px 26px",
          opacity: 0.55,
          maskImage:
            "radial-gradient(72% 68% at 58% 46%, black 26%, transparent 76%)",
          WebkitMaskImage:
            "radial-gradient(72% 68% at 58% 46%, black 26%, transparent 76%)",
        }}
      />

      {/* static grain, pooled behind the stage like the dot grid */}
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0"
        style={{
          maskImage:
            "radial-gradient(72% 68% at 58% 46%, black 26%, transparent 76%)",
          WebkitMaskImage:
            "radial-gradient(72% 68% at 58% 46%, black 26%, transparent 76%)",
        }}
      />

      {/* a soft clay glow that migrates through the scene with scroll */}
      <motion.div
        aria-hidden
        className="orb-glow pointer-events-none absolute h-[440px] w-[440px] opacity-60"
        style={{ top: glowTop, left: glowLeft }}
      />

      {/* (the giant stage-word watermark used to sit here, bottom-right. It
          was the fifth place the stage name appeared in one viewport — the
          left rail's active item still names the stage, and the section
          reads quieter without it.) */}

      {/* the heading stays fitted above the stages for the whole pin */}
      <PinHeading />

      {/* the content, riding the camera */}
      {/* zoom steps: on short laptops the heading + spine + demo card can't
          all fit under the fixed header — shrink the content plane (layout
          box included, same trick as the hero widget); self-center keeps the
          zoomed (now narrower-than-full) grid centered in the frame */}
      <motion.div
        className="grid min-h-0 w-full flex-1 items-center gap-8 self-center will-change-transform md:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] lg:gap-16 [@media(max-height:740px)]:[zoom:0.9] [@media(max-height:660px)]:[zoom:0.8]"
        style={{ scale, opacity, y: contentY }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* the in-scene header: centered and pinned with the stages so heading +
   story always share the viewport (the SceneHeading pattern) */
/* Deliberately eyebrow + h2 only — no sub-line, no scroll hint:
   - every claim a sub could make is already owned by one of the five stage
     bodies rendered a few hundred px below (Capture owns "no bot / no notes",
     Confirm owns "nothing saved silently", Remember owns Monday→Friday), so a
     sub here can only restate a stage or go vague;
   - Statement, the first pinned scene on the page, already teaches the scroll
     interaction, and repeating the instruction reads as hand-holding.
   The freed height also relieves a pin that was already fighting for it
   (see the max-height zoom steps on the content plane below). */
function PinHeading() {
  return (
    <div className="relative z-20 shrink-0 pb-2 text-center">
      <WordReveal
        as="h2"
        text="Follow-through, without"
        accent="the follow-up."
        accentClass="text-gradient-signal"
        className="display mx-auto max-w-[26ch] text-[clamp(1.8rem,3.2vw,2.9rem)]"
      />
    </div>
  );
}

/* ---------------- left rail: the progress spine ---------------- */

function Spine({
  index,
  progress,
  goTo,
}: {
  index: number;
  progress: MotionValue<number>;
  goTo: (i: number) => void;
}) {
  const fill = useSpring(progress, { stiffness: 120, damping: 30, mass: 0.4 });
  const tipTop = useTransform(fill, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`);

  /* how far through the CURRENT stage's dwell we are — feeds the little
     bar under the active step so the rail is alive while you scroll */
  const local = useSpring(useTransform(progress, toStageLocal), {
    stiffness: 200,
    damping: 32,
    mass: 0.35,
  });
  const dwell = useTransform(local, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`);

  return (
    <div>
      {/* the big stage number, ticking like an odometer */}
      <div className="mb-5 flex items-baseline gap-3 lg:mb-8">
        <Odometer value={index + 1} />
        <span className="font-mono text-sm text-ink-3">/ 05</span>
      </div>

      <div className="relative">
        {/* the clay progress line, filling top → down with scroll */}
        <span aria-hidden className="absolute bottom-3 left-[19px] top-3 w-px bg-line-2">
          <motion.span
            className="absolute inset-0 origin-top bg-signal"
            style={{ scaleY: fill }}
          />
          {/* the glowing head riding the tip of the fill */}
          <motion.span
            className="absolute left-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_12px_var(--signal-glow)]"
            style={{ top: tipTop }}
          />
        </span>

        <ol className="space-y-1 lg:space-y-1.5">
          {CARDS.map((c, i) => {
            const active = i === index;
            const passed = i < index;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active ? "step" : undefined}
                  className="group relative flex min-h-[44px] w-full items-center gap-4 rounded-2xl py-2 pl-1 pr-3 text-left lg:py-2.5"
                >
                  <span
                    className={`relative z-10 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border font-mono text-[11px] tabular-nums transition-colors duration-500 ${
                      active
                        ? "border-signal bg-signal text-white"
                        : passed
                          ? "border-signal/50 bg-signal-soft text-signal-deep"
                          : "border-line-2 bg-bg text-ink-3 group-hover:border-signal/40"
                    }`}
                  >
                    {c.n}
                  </span>
                  <span
                    className={`text-[15px] font-medium tracking-tight transition-colors duration-500 ${
                      active
                        ? "text-ink-display"
                        : "text-ink-3 group-hover:text-ink-2"
                    }`}
                  >
                    {c.flow}
                  </span>
                </button>

                {/* the active step opens a one-line hint + a dwell bar that
                    fills with the scroll through this stage — the rail stays
                    alive for the whole dwell. Exactly one step is ever open,
                    so the spine's total height never changes. */}
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.div
                      key="hint"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="overflow-hidden pl-[47px] pr-3"
                    >
                      <p className="text-[12.5px] leading-snug text-ink-3">
                        {c.hint}
                      </p>
                      <span className="mb-2 mt-2 block h-[3px] w-full max-w-[160px] overflow-hidden rounded-full bg-line/70">
                        <motion.span
                          className="block h-full rounded-full bg-signal"
                          style={{ width: dwell }}
                        />
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Odometer({ value }: { value: number }) {
  return (
    <span
      aria-label={`Stage ${value} of 5`}
      className="display relative block h-[1em] w-[2.1ch] overflow-hidden text-[clamp(2.4rem,4vw,3.4rem)] leading-none text-signal"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="absolute inset-0 block font-mono tabular-nums"
          initial={{ y: "105%" }}
          animate={{ y: 0 }}
          exit={{ y: "-105%" }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          0{value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ---------------- right side: the live stage ---------------- */

function Stage({
  index,
  progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const card = CARDS[index];

  /* a slow camera push into the demo card over the stage's dwell — the
     StageSwitch swap masks the sawtooth reset between stages */
  const local = useSpring(useTransform(progress, toStageLocal), {
    stiffness: 200,
    damping: 32,
    mass: 0.35,
  });
  const demoScale = useTransform(local, [0, 1], [1, 1.035]);
  const demoY = useTransform(local, [0, 1], [8, -8]);

  return (
    /* min-height reserved so the frame never reflows on swap; capped against
       the in-pin heading + site header so short laptops never clip the
       stage — every transcript word stays on screen for its whole dwell */
    <div className="flex min-h-[clamp(360px,calc(100vh-330px),500px)] flex-col justify-center">
      <StageSwitch index={index}>
        {/* No "CAPTURE" kicker: the left rail's active item already names the
            stage, and the title says it again ("Every word, captured"). The
            glyph rides the title line — on its own row it read as orphaned
            once the kicker beside it went. (The mobile cards keep their
            "01 CAPTURE" row: no rail there to carry the stage name.) */}
        <div className="flex items-center justify-between gap-5">
          <h3 className="text-[clamp(1.5rem,2.4vw,2.1rem)] font-medium tracking-tight text-ink-display">
            {card.title}
          </h3>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-signal-soft text-signal-deep">
            {card.icon}
          </span>
        </div>
        <p className="mt-2 max-w-[46ch] text-[15.5px] leading-relaxed text-ink-3">
          {card.body}
        </p>
        <motion.div
          className="mt-4 will-change-transform lg:mt-5"
          style={{ scale: demoScale, y: demoY }}
        >
          {card.visual(false)}
        </motion.div>
        <Tokens tokens={card.tokens} className="mt-4 lg:mt-5" />
      </StageSwitch>
    </div>
  );
}

function Tokens({
  tokens,
  className = "",
}: {
  tokens: Card["tokens"];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tokens.map((t) => (
        <span
          key={t.label}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-medium ${
            t.clay
              ? "border border-signal/30 bg-signal-soft text-signal-deep"
              : "border border-line bg-bg-2 text-ink-2"
          }`}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}
