import { Reveal, CTAButton, WordReveal } from "./motion";

/**
 * Final CTA — the closing crescendo. One massive editorial serif statement,
 * a quiet aurora glow behind it, and a prominent magnetic CTA.
 */
export function FinalCTA() {
  return (
    <section className="mx-auto max-w-[80rem] px-6 pb-16 pt-12 sm:pb-24 lg:pb-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-gradient-to-b from-paper-3/70 to-paper-2 px-5 py-16 text-center sm:rounded-[2.5rem] sm:px-6 sm:py-24 lg:py-36">
          {/* quiet living glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-80"
          >
            <div className="aurora absolute left-1/2 top-0 h-[34rem] w-[44rem] -translate-x-1/2" />
          </div>

          <p className="kicker mb-7 text-signal-deep">Every meeting, on repeat</p>

          <h2 className="display-serif mx-auto max-w-5xl leading-[0.95]">
            <span className="relative block text-[clamp(2.3rem,9vw,7rem)]">
              <span
                aria-hidden
                className="text-outline-signal pointer-events-none absolute inset-0 -translate-y-[0.06em] translate-x-[0.03em] select-none opacity-30"
              >
                Unlimited
              </span>
              <span className="relative text-ink">Unlimited</span>
            </span>
            <WordReveal
              as="span"
              className="block text-[clamp(2.3rem,9vw,7rem)] italic text-signal-deep"
              text="meeting memory."
              accentClass=""
            />
          </h2>

          <Reveal delay={160}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:mt-12">
              <CTAButton href="/sign-up" className="px-8 py-4 text-[0.95rem]">
                Get started free
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </CTAButton>
              <p className="text-balance px-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-soft/70 sm:tracking-[0.18em]">
                Free to start · macOS, Windows &amp; iPhone
              </p>
            </div>
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
