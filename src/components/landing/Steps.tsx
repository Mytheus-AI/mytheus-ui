"use client";

import { type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from "framer-motion";
import { PinnedScene, StageSwitch, ScrubReveal, Reveal } from "./motion";
import { Eyebrow } from "./ui";
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
   stage inside the pinned frame changes (StageSwitch). Mobile and
   reduced-motion render the five stages as a calm static stack instead. */

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
    body: "No bot, no recording link — just live, role-relevant notes.",
    icon: <MicIcon />,
    tokens: [{ label: "Role-relevant notes" }, { label: "Live transcript" }],
    visual: (still) => <CaptureDemo still={still} />,
  },
  {
    key: "label",
    n: "02",
    flow: "Label",
    title: "Decisions, sorted",
    body: "Decisions, action items, and conflicts labeled the moment they're said.",
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
    body: "Nothing is saved or assigned without your one-tap confirm.",
    icon: <ShieldCheckIcon />,
    tokens: [{ label: "One-tap confirm" }],
    visual: (still) => <ConfirmDemo still={still} />,
  },
  {
    key: "route",
    n: "04",
    flow: "Route",
    title: "Sent to the right people",
    body: "Assigned to an owner and shared with anyone who missed it.",
    icon: <SendIcon />,
    tokens: [{ label: "Owner assigned" }, { label: "Shared with absentees" }],
    visual: (still) => <RouteDemo still={still} />,
  },
  {
    key: "remember",
    n: "05",
    flow: "Remember",
    title: "Carried to the next meeting",
    body: "A decision Monday becomes context your agents reuse Friday.",
    icon: <LoopIcon />,
    tokens: [{ label: "→ Next meeting" }, { label: "Cross-meeting memory" }],
    visual: (still) => <RememberDemo still={still} />,
  },
];

export function Steps() {
  const reduce = useReducedMotion();

  return (
    <section id="how" className="px-3 py-24 sm:px-5 sm:py-32">
      <div className="mx-auto max-w-[1340px]">
        <ScrubReveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="display mt-5 max-w-[18ch] text-[clamp(2.2rem,5.5vw,4rem)]">
            Make meeting follow-through{" "}
            <span className="text-gradient-signal">self-driving</span>.
          </h2>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-3">
            Conversations become decisions, action items, and context —
            captured, labeled, and routed to the right people, without anyone
            taking notes.
          </p>
        </ScrubReveal>

        {/* desktop: the pinned sequential scene */}
        {!reduce && (
          <PinnedScene count={CARDS.length} className="mt-4 hidden md:block">
            {({ index, progress, goTo }) => (
              <div className="grid w-full items-center gap-10 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] lg:gap-16">
                <Spine index={index} progress={progress} goTo={goTo} />
                <Stage index={index} />
              </div>
            )}
          </PinnedScene>
        )}

        {/* mobile (and desktop reduced-motion): a calm static stack */}
        <Reveal
          delay={120}
          className={`mt-14 grid gap-5 ${reduce ? "" : "md:hidden"}`}
        >
          {CARDS.map((c) => (
            <article
              key={c.key}
              className="rounded-card border border-line bg-white p-6"
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

  return (
    <div>
      {/* the big stage number, ticking like an odometer */}
      <div className="mb-8 flex items-baseline gap-3">
        <Odometer value={index + 1} />
        <span className="font-mono text-sm text-ink-3">/ 05</span>
      </div>

      <div className="relative">
        {/* the clay progress line, filling top → down with scroll */}
        <span aria-hidden className="absolute bottom-3 left-[15px] top-3 w-px bg-line-2">
          <motion.span
            className="absolute inset-0 origin-top bg-signal"
            style={{ scaleY: fill }}
          />
        </span>

        <ol className="space-y-1.5">
          {CARDS.map((c, i) => {
            const active = i === index;
            const passed = i < index;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active ? "step" : undefined}
                  className="group relative flex w-full items-center gap-4 rounded-2xl py-2.5 pl-1 pr-3 text-left"
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

function Stage({ index }: { index: number }) {
  const card = CARDS[index];
  return (
    /* min-height reserved so the frame never reflows on swap */
    <div className="flex min-h-[540px] flex-col justify-center">
      <StageSwitch index={index}>
        <div className="flex items-center justify-between">
          <span className="kicker text-signal">{card.flow}</span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-signal-soft text-signal-deep">
            {card.icon}
          </span>
        </div>
        <h3 className="mt-3 text-[clamp(1.5rem,2.4vw,2.1rem)] font-medium tracking-tight text-ink-display">
          {card.title}
        </h3>
        <p className="mt-2.5 max-w-[46ch] text-[15.5px] leading-relaxed text-ink-3">
          {card.body}
        </p>
        <div className="mt-6">{card.visual(false)}</div>
        <Tokens tokens={card.tokens} className="mt-6" />
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
