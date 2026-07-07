"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { Reveal } from "./motion";
import { Eyebrow, PillCTA } from "./ui";

/* ================================================================== */
/*  FAQ — the objection-handling band, just before the final CTA.      */
/*  Desktop: a self-touring spotlight — the question rail sits beside   */
/*  a persistent answer panel; the active answer crossfades in on a     */
/*  timed tour (a hairline dwell bar shows the pace), and hovering or   */
/*  focusing any question shows its answer instantly. No clicking       */
/*  through rows. Mobile keeps the accordion — the right pattern for    */
/*  touch. Reduced motion: no tour, instant swaps / instant toggle.     */
/* ================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

type QA = { q: string; a: ReactNode };

const FAQS: QA[] = [
  {
    q: "Is there a bot that joins my call?",
    a: (
      <>
        No. Mytheus is its own meeting platform — the call happens{" "}
        <em>in</em> Mytheus, so there is no recording link to paste and no
        third-party notetaker sitting in the participant list. Each person&apos;s
        agent listens from the inside.
      </>
    ),
  },
  {
    q: "Does it integrate with Zoom, Meet, or Teams?",
    a: (
      <>
        Mytheus doesn&apos;t bolt onto another video tool — you meet on Mytheus
        directly. That&apos;s what lets every participant have their own agent
        and lets those agents share context across meetings, which a bot bolted
        onto someone else&apos;s call can&apos;t do.
      </>
    ),
  },
  {
    q: "Will the agent commit decisions without me?",
    a: (
      <>
        Never silently. Decisions, action items, and conflicts are detected and
        labeled live, then held for your one-tap confirmation. Nothing is
        written to shared memory or assigned to a person until you approve it.
      </>
    ),
  },
  {
    q: "How do agents collaborate across meetings?",
    a: (
      <>
        When your agent hits a gap — &ldquo;what did pricing decide on
        Monday?&rdquo; — it asks the relevant participant&apos;s agent and gets a
        sourced answer back, without pulling that person into your call. A
        decision made early in the week becomes context later in the week,
        automatically.
      </>
    ),
  },
  {
    q: "Who can see my notes and the shared memory?",
    a: (
      <>
        Memory is scoped to your organization and to the people on the meeting.
        Notes are private to you until you choose to share them; confirmed
        decisions and action items are visible to participants and to anyone you
        route them to — and to no one else.
      </>
    ),
  },
  {
    q: "Is it free to start?",
    a: (
      <>
        Yes. You can get started free, run real meetings, and keep unlimited
        meeting memory without a card. Team and enterprise plans add SSO,
        admin controls, and longer retention when you need them.
      </>
    ),
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-3 py-24 sm:px-5 sm:py-32">
      <div className="mx-auto grid max-w-[1340px] gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        {/* left — the pitch + escape hatch */}
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <Eyebrow>Answers</Eyebrow>
            <h2 className="display mt-5 max-w-[14ch] text-[clamp(2.1rem,5vw,3.6rem)]">
              Questions, before you ask them.
            </h2>
            <p className="mt-6 max-w-[42ch] text-[17px] leading-relaxed text-ink-3">
              The honest answers to what teams ask first — about the bot,
              your privacy, and where your meetings actually live.
            </p>
            <div className="mt-9">
              <PillCTA href="/dashboard">Get started free</PillCTA>
            </div>
            <p className="mt-5 text-[13px] text-ink-3">
              Still curious?{" "}
              <a href="mailto:hello@reprise.ai" className="link-underline text-ink-2">
                Talk to the team
              </a>
              .
            </p>
          </div>
        </Reveal>

        {/* right — desktop spotlight, mobile accordion */}
        <Reveal delay={120}>
          <FAQSpotlight />
          <FAQAccordion />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop: the self-touring spotlight                                */
/* ------------------------------------------------------------------ */

const DWELL_MS = 5200;

function FAQSpotlight() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-25% 0px -25% 0px" });
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);

  const touring = !reduce && !hovered && inView;

  /* the tour: advance after each dwell; any manual select resets the clock */
  useEffect(() => {
    if (!touring) return;
    const id = setTimeout(
      () => setActive((a) => (a + 1) % FAQS.length),
      DWELL_MS,
    );
    return () => clearTimeout(id);
  }, [touring, active]);

  const item = FAQS[active];

  return (
    <div
      ref={ref}
      className="hidden gap-6 md:grid md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* question rail — hover/focus shows the answer, no click needed */}
      <div className="flex flex-col justify-center">
        <ul className="flex flex-col gap-1">
          {FAQS.map((qa, i) => {
            const isActive = i === active;
            return (
              <li key={qa.q}>
                <button
                  type="button"
                  aria-current={isActive}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={`group relative flex w-full items-baseline gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-colors duration-300 ${
                    isActive ? "bg-bg-2" : "hover:bg-bg-2/50"
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] tabular-nums transition-colors duration-300 ${
                      isActive ? "text-signal" : "text-ink-3"
                    }`}
                  >
                    0{i + 1}
                  </span>
                  <span
                    className={`flex-1 text-[15.5px] font-medium tracking-tight transition-colors duration-300 ${
                      isActive
                        ? "text-ink-display"
                        : "text-ink-3 group-hover:text-ink-2"
                    }`}
                  >
                    {qa.q}
                  </span>
                  {/* dwell bar — the tour's pace, only while it drives */}
                  {isActive && touring && (
                    <motion.span
                      aria-hidden
                      key={active}
                      className="absolute bottom-1.5 left-4 right-4 h-px origin-left bg-signal/50"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: DWELL_MS / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          Hover a question — or just watch
        </p>
      </div>

      {/* answer panel — a persistent stage the answers crossfade through */}
      <div
        className="relative min-h-[340px] overflow-hidden rounded-card border border-line bg-surface/70 p-8 backdrop-blur-sm"
        aria-live="polite"
      >
        {/* giant watermark index */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            aria-hidden
            key={`wm-${active}`}
            className="display pointer-events-none absolute -right-2 -top-7 select-none text-[7.5rem] leading-none text-signal/[0.08]"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            0{active + 1}
          </motion.span>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            className="relative"
            initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={
              reduce ? undefined : { opacity: 0, y: -12, filter: "blur(4px)" }
            }
            transition={{ duration: 0.4, ease: EASE }}
          >
            <span className="kicker text-signal">Answer 0{active + 1}</span>
            <h3 className="mt-3 max-w-[24ch] text-[1.35rem] font-medium tracking-tight text-ink-display">
              {item.q}
            </h3>
            <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-3 [&_em]:font-medium [&_em]:not-italic [&_em]:text-signal-deep">
              {item.a}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile: the accordion (touch wants taps, not hovers)               */
/* ------------------------------------------------------------------ */

function FAQAccordion() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(0);

  return (
    <ul className="divide-y divide-line border-y border-line md:hidden">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q}>
            {/* NB: no onFocus toggle here — focus fires on tap *before*
                click, which would open-then-close the row in one tap */}
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="group flex min-h-[56px] w-full items-center gap-4 py-5 text-left"
            >
              <span
                className={`flex-1 text-[clamp(1.05rem,1.6vw,1.3rem)] font-medium tracking-tight transition-colors ${
                  isOpen
                    ? "text-ink-display"
                    : "text-ink-2 group-hover:text-ink-display"
                }`}
              >
                {item.q}
              </span>
              {/* plus → × : the row's "there's more here" affordance */}
              <motion.span
                aria-hidden
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 300, damping: 22 }
                }
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                  isOpen
                    ? "border-signal bg-signal text-white"
                    : "border-line text-ink-3 group-hover:border-line-2 group-hover:text-ink-2"
                }`}
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                  <path
                    d="M8 3.5v9M3.5 8h9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="body"
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: {
                      height: { duration: 0.45, ease: EASE },
                      opacity: { duration: 0.35, ease: "easeOut", delay: 0.08 },
                    },
                  }}
                  exit={
                    reduce
                      ? undefined
                      : {
                          height: 0,
                          opacity: 0,
                          transition: {
                            /* fade first, then collapse — no text squash */
                            height: { duration: 0.34, ease: EASE, delay: 0.04 },
                            opacity: { duration: 0.18, ease: "easeIn" },
                          },
                        }
                  }
                  className="overflow-hidden"
                >
                  <motion.p
                    initial={reduce ? false : { y: 10 }}
                    animate={{ y: 0, transition: { duration: 0.45, ease: EASE } }}
                    exit={
                      reduce
                        ? undefined
                        : { y: 6, transition: { duration: 0.25, ease: EASE } }
                    }
                    className="max-w-[58ch] pb-7 pr-10 text-[16px] leading-relaxed text-ink-3 [&_em]:font-medium [&_em]:not-italic [&_em]:text-signal-deep"
                  >
                    {item.a}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
