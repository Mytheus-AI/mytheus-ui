"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScrubReveal, Reveal } from "./motion";
import { Eyebrow } from "./ui";

/* "How it works" as a hover-driven pipeline: a slim row of compact panels, one
   stage of meeting follow-through each. At rest the row is a short strip (icon
   + number + flow name); hovering (or focusing, for keyboard) a panel grows
   the whole row and widens that panel to reveal its title/body/tokens, while
   the rest shrink to slivers. A soft auto-cycling spotlight ring keeps the
   idle row feeling alive without ever revealing detail on its own — detail
   only ever appears on hover/focus. Sizing changes are FLIP-animated via
   Framer's `layout` prop; content crossfades with AnimatePresence. Mobile +
   reduced-motion degrade to a plain stack / instant transitions. */

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
  },
  {
    key: "confirm",
    n: "03",
    flow: "Confirm",
    title: "Never committed silently",
    body: "Nothing is saved or assigned without your one-tap confirm.",
    icon: <ShieldCheckIcon />,
    tokens: [{ label: "One-tap confirm" }],
  },
  {
    key: "route",
    n: "04",
    flow: "Route",
    title: "Sent to the right people",
    body: "Assigned to an owner and shared with anyone who missed it.",
    icon: <SendIcon />,
    tokens: [{ label: "Owner assigned" }, { label: "Shared with absentees" }],
  },
  {
    key: "remember",
    n: "05",
    flow: "Remember",
    title: "Carried to the next meeting",
    body: "A decision Monday becomes context your agents reuse Friday.",
    icon: <LoopIcon />,
    tokens: [{ label: "→ Next meeting" }, { label: "Cross-meeting memory" }],
  },
];

export function Steps() {
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

        <Reveal delay={120} className="mt-14">
          <Carousel />
          {/* mobile: a plain readable stack */}
          <div className="grid gap-4 md:hidden">
            {CARDS.map((c) => (
              <article
                key={c.key}
                className="rounded-card border border-line bg-white p-6"
              >
                <CardBody card={c} />
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const EASE_SOFT = [0.16, 1, 0.3, 1] as const;

/* the desktop hover-driven expanding-panel carousel. At rest the row is a
   short strip; a slow idle "spotlight" cycles a highlight ring around the
   icons (the self-driving pun) without ever expanding — expansion is
   strictly a hover/focus response. */
function Carousel() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  const [spotlight, setSpotlight] = useState(0);

  useEffect(() => {
    if (reduce || hovered !== null) return;
    const id = setInterval(
      () => setSpotlight((s) => (s + 1) % CARDS.length),
      2000,
    );
    return () => clearInterval(id);
  }, [reduce, hovered]);

  const open = hovered !== null;
  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.6, ease: EASE_SOFT };

  return (
    <motion.div
      layout={!reduce}
      transition={transition}
      className="hidden gap-3 md:flex"
      style={{ height: open ? "clamp(360px,42vw,460px)" : "clamp(68px,7.5vw,88px)" }}
      onMouseLeave={() => setHovered(null)}
    >
      {CARDS.map((c, i) => {
        const isOpen = i === hovered;
        const isSpotlit = hovered === null && i === spotlight;
        return (
          <motion.button
            key={c.key}
            type="button"
            layout={!reduce}
            transition={transition}
            onMouseEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            aria-label={`${c.flow}: ${c.title}`}
            className={`group relative min-w-0 overflow-hidden rounded-card border bg-white text-left transition-colors duration-500 ${
              isOpen
                ? "border-signal/40 shadow-[0_30px_60px_-40px_rgba(189,93,58,0.5)]"
                : isSpotlit
                  ? "border-signal/30"
                  : "border-line hover:border-line-2"
            }`}
            style={{ flexGrow: isOpen ? 6 : open ? 0.6 : 1, flexBasis: 0 }}
          >
            <AnimatePresence initial={false} mode="wait">
              {isOpen ? (
                <motion.div
                  key="expanded"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: 6 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: EASE_SOFT }}
                  className="h-full w-[clamp(280px,32vw,380px)] p-7"
                >
                  <CardBody card={c} />
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3 }}
                  className="flex h-full items-center gap-2.5 px-4"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-soft text-signal-deep transition-shadow duration-500 [&>svg]:h-4 [&>svg]:w-4 ${
                      isSpotlit ? "shadow-[0_0_0_3px_var(--signal-soft),0_0_0_5px_rgba(217,119,87,0.35)]" : ""
                    }`}
                  >
                    {c.icon}
                  </span>
                  {open ? null : (
                    <span className="min-w-0 leading-tight">
                      <span className="block font-mono text-[11px] tabular-nums text-ink-3">
                        {c.n}
                      </span>
                      <span className="block truncate text-[13.5px] font-medium tracking-tight text-ink-2">
                        {c.flow}
                      </span>
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* open accent bar */}
            <motion.span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1 origin-left bg-signal"
              initial={false}
              animate={{ scaleX: isOpen ? 1 : 0 }}
              transition={transition}
            />
          </motion.button>
        );
      })}
    </motion.div>
  );
}

function CardBody({ card }: { card: Card }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-signal">
          <span className="font-mono text-sm tabular-nums">{card.n}</span>
          <span className="kicker">{card.flow}</span>
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-soft text-signal-deep">
          {card.icon}
        </span>
      </div>

      <h3 className="mt-5 text-[clamp(1.3rem,1.9vw,1.65rem)] font-medium tracking-tight text-ink-display">
        {card.title}
      </h3>
      <p className="mt-2.5 text-[15px] leading-relaxed text-ink-3">{card.body}</p>

      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        {card.tokens.map((t) => (
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
    </div>
  );
}
