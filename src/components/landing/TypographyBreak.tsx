import { ScrubReveal, Marquee, MaskReveal } from "./motion";

/**
 * A full-width breathing-room break: a giant, hand-set serif statement
 * with a layered outline word for depth and an italic lilac accent.
 * A mono ribbon of honest phrases drifts across the width for editorial texture.
 */
export function TypographyBreak() {
  return (
    <section className="relative overflow-hidden py-28 lg:py-40">
      {/* Mono ribbon — textural editorial band above the statement */}
      <Marquee className="border-y border-line/60 bg-paper-2/40 py-4 text-ink-soft">
        <span className="font-mono text-[0.78rem] uppercase tracking-[0.28em]">
          {[
            "recall",
            "context",
            "follow-ups",
            "decisions",
            "questions",
            "conflicts",
            "memory",
          ]
            .map((w) => `· ${w} `)
            .join("")}
        </span>
      </Marquee>

      <div className="mx-auto max-w-[82rem] px-6 pt-20 lg:pt-28">
        <ScrubReveal>
          <h2 className="display-serif text-center leading-[0.92] text-ink">
            {/* Layered outline word for depth */}
            <span className="relative block text-[clamp(3rem,11vw,9rem)]">
              <span
                className="text-outline pointer-events-none absolute inset-0 -translate-y-[0.08em] translate-x-[0.04em] select-none opacity-40"
                aria-hidden
              >
                Every meeting,
              </span>
              <span className="relative">Every meeting,</span>
            </span>
            <span className="mt-1 block text-[clamp(3rem,11vw,9rem)] italic text-signal-deep">
              on&nbsp;repeat.
            </span>
          </h2>
        </ScrubReveal>

        <MaskReveal delay={120} className="mt-10">
          <p className="font-mono mx-auto max-w-md text-center text-[0.8rem] uppercase tracking-[0.22em] text-ink-soft">
            The work between them shouldn&apos;t be.
          </p>
        </MaskReveal>
      </div>
    </section>
  );
}
