"use client";

import Link from "next/link";
import { CTAButton, Reveal, WordReveal, MaskReveal, Stagger, StaggerItem, Tilt } from "./motion";
import { LiveSimulation } from "./LiveSimulation";

/* Small inline icons for the trust row. */
function AgentsIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="6" cy="6.5" r="2.3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12.5" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 15c0-2 1.7-3.4 3.7-3.4S10 13 10 15M10.8 14.2c.2-1.5 1.4-2.4 2.9-2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="3.5" y="8" width="11" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function NetworkIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="4" cy="5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="13.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.4 6.2 8 12M12.6 6.2 10 12M5.5 5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <path d="M2 6.2 4.6 9 10 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const trust = [
  { icon: <AgentsIcon />, text: "Hold your meetings in Reprise — every participant gets their own AI agent." },
  { icon: <LockIcon />, text: "Private by default — your agent keeps only what's relevant to your role." },
  { icon: <NetworkIcon />, text: "Agents collaborate across meetings — context travels, even from calls you missed." },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* living lilac aurora behind the visual */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 -z-10 h-[28rem] w-[26rem] max-w-[120vw] translate-x-1/3 -translate-y-12 sm:h-[34rem] sm:w-[34rem] lg:h-[46rem] lg:w-[50rem] lg:translate-x-1/4"
      >
        <div className="aurora h-full w-full" />
      </div>

      <div className="mx-auto grid max-w-[80rem] items-center gap-10 px-6 pb-16 pt-12 sm:gap-12 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-24">
        {/* Left — copy */}
        <div className="max-w-xl">
          <Reveal>
            <p className="kicker mb-6 flex items-center gap-2.5 text-signal-deep">
              <span className="relative flex h-1.5 w-1.5">
                <span className="live-ring absolute inset-0 rounded-full bg-signal" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-signal" />
              </span>
              A personal agent for every meeting
            </p>
          </Reveal>

          <WordReveal
            as="h1"
            className="display-serif text-[clamp(2.35rem,7vw,4.6rem)] text-ink"
            text="Notes, actions, and memory."
            accent="Without a meeting bot."
            accentClass="italic text-signal-deep"
          />

          <Reveal delay={140}>
            <p className="mt-7 max-w-md text-[1.05rem] leading-relaxed text-ink-soft text-pretty">
              Reprise gives everyone in the room their own agent — capturing what
              matters, asking the right questions, and remembering across every
              meeting that came before.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
              <CTAButton href="/sign-up" className="px-7 py-4 text-[0.95rem]">
                Get started free
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </CTAButton>
              <Link
                href="/sign-in"
                className="link-underline text-sm font-medium text-ink"
              >
                Log in
              </Link>
              <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-signal/15 text-signal-deep">
                  <CheckIcon />
                </span>
                macOS, Windows &amp; iPhone
              </span>
            </div>
          </Reveal>

          <Stagger className="mt-11 space-y-4">
            {trust.map((t) => (
              <StaggerItem key={t.text}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg border border-line bg-white/70 text-signal-deep">
                    {t.icon}
                  </span>
                  <span className="max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
                    {t.text}
                  </span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        {/* Right — the interactive live-meeting simulation */}
        <MaskReveal delay={160} y={48}>
          <div className="relative lg:translate-x-2">
            <Tilt max={5}>
              <LiveSimulation />
            </Tilt>
            <p className="mt-3 flex items-center justify-end gap-2 pr-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ink-soft/70">
              <span className="h-1 w-1 rounded-full bg-signal blink" />
              live, interactive — try it
            </p>
          </div>
        </MaskReveal>
      </div>
    </section>
  );
}
