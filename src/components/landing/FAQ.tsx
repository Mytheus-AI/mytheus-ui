"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Reveal } from "./motion";
import { Eyebrow, PillCTA } from "./ui";

/* ================================================================== */
/*  FAQ — the objection-handling band, just before the final CTA.      */
/*  A two-column layout: a sticky pitch + "still curious?" CTA on the   */
/*  left, an accordion of the questions Mytheus's positioning actually  */
/*  raises on the right (no bot, privacy, own-platform, confirm-first,  */
/*  agent-to-agent, pricing). One row open at a time; height + content  */
/*  animate open, reduced-motion degrades to an instant toggle.         */
/* ================================================================== */

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
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="px-3 py-24 sm:px-5 sm:py-32">
      <div className="mx-auto grid max-w-[1340px] gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        {/* left — the pitch + escape hatch */}
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <Eyebrow>Answers</Eyebrow>
            <h2 className="display mt-5 max-w-[14ch] text-[clamp(2.2rem,5vw,3.6rem)]">
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

        {/* right — the accordion */}
        <Reveal delay={120}>
          <ul className="divide-y divide-line border-y border-line">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    onFocus={() => setOpen(i)}
                    className="group flex w-full items-center gap-4 py-6 text-left"
                  >
                    <span
                      className={`flex-1 text-[clamp(1.05rem,1.6vw,1.3rem)] font-medium tracking-tight transition-colors ${
                        isOpen ? "text-ink-display" : "text-ink-2 group-hover:text-ink-display"
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
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
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
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? undefined : { height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                          opacity: { duration: 0.3, delay: isOpen ? 0.1 : 0 },
                        }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-[58ch] pb-7 pr-12 text-[16px] leading-relaxed text-ink-3 [&_em]:font-medium [&_em]:not-italic [&_em]:text-signal-deep">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
