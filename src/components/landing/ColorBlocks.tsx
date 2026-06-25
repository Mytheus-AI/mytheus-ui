import {
  Reveal,
  CTAButton,
  Parallax,
  WordReveal,
  MaskReveal,
  Tilt,
} from "./motion";
import { Chip } from "./mockups";

/* ------------------------------------------------------------------ */
/*  Two full-width colored feature bands. Granola used olive + pale     */
/*  green; here a deep aubergine-lilac (split layout) and a soft lilac  */
/*  (centered statement).                                               */
/* ------------------------------------------------------------------ */

/** Block A — deep band, serif statement left, a "memory" mockup right. */
export function MemoryBlock() {
  return (
    <section className="relative overflow-hidden bg-block-deep text-block-deep-ink">
      {/* Subtle inner glow — makes the deep band feel rich and tactile */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(120% 90% at 80% 10%, rgba(168,140,255,0.16), transparent 55%), radial-gradient(90% 80% at 0% 100%, rgba(168,140,255,0.10), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-[80rem] items-center gap-10 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-32">
        <div>
          <Reveal>
            <p className="kicker text-signal">Perfect recall</p>
          </Reveal>
          <WordReveal
            as="h2"
            className="display-serif mt-5 text-[clamp(2rem,7vw,4rem)] leading-[1.02] text-block-deep-ink"
            text="Memory across"
            accent="every meeting."
            accentClass="italic text-signal"
          />
          <MaskReveal delay={160} className="mt-6">
            <p className="max-w-md text-block-deep-ink/70">
              Every call your team runs becomes searchable memory — organized by
              project, person, and decision. When something said weeks ago
              matters today, it&apos;s already at hand, with its source attached.
            </p>
          </MaskReveal>
        </div>

        <Reveal delay={140} y={28}>
          <Tilt>
            <Parallax
              distance={30}
              className="overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.05] shadow-[0_40px_90px_-35px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-signal/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-2 text-[0.74rem] font-medium text-block-deep-ink/80">
                  Team memory
                </span>
              </div>
              <ul className="divide-y divide-white/10">
                {[
                  {
                    folder: "Team stand-ups",
                    count: 42,
                    last: "this morning · 3 blockers flagged",
                  },
                  {
                    folder: "GTM & pipeline",
                    count: 28,
                    last: "yesterday · ICP alignment confirmed",
                  },
                  {
                    folder: "1:1s",
                    count: 67,
                    last: "Jun 9 · workload rebalanced",
                  },
                  {
                    folder: "Migration",
                    count: 14,
                    last: "May 12 · scope cut decision",
                  },
                ].map((f) => (
                  <li
                    key={f.folder}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-signal/20 text-signal">
                      <svg
                        viewBox="0 0 16 16"
                        className="h-4 w-4"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.8l1.2 1.4h5A1.5 1.5 0 0 1 14 5.9v5.6A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.86rem] font-medium text-block-deep-ink">
                        {f.folder}
                      </span>
                      <span className="block truncate font-mono text-[0.6rem] text-block-deep-ink/55">
                        {f.last}
                      </span>
                    </span>
                    <span className="font-mono text-[0.62rem] text-block-deep-ink/45">
                      {f.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Parallax>
          </Tilt>
        </Reveal>
      </div>
    </section>
  );
}

/** Block B — soft band, a single centered serif statement. */
export function BusyDaysBlock() {
  return (
    <section className="bg-block-soft">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24 lg:py-36">
        <Reveal>
          <p className="kicker text-signal-deep">
            Built for the calendar you actually have
          </p>
        </Reveal>
        <WordReveal
          as="h2"
          delay={120}
          className="display-serif mx-auto mt-6 max-w-3xl text-[clamp(2.1rem,8vw,5rem)] leading-[1.05] sm:leading-[1.0] text-ink"
          text="Helping busy people through"
          accent="busy days."
          accentClass="italic text-signal-deep"
        />
        <Reveal delay={260}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Chip accent>back-to-back, handled</Chip>
            <CTAButton href="/sign-up" variant="ghost">
              See it in action
            </CTAButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
