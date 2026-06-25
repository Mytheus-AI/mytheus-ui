"use client";

import {
  CTAButton,
  WordReveal,
  MaskReveal,
  Reveal,
  Float,
  Marquee,
} from "@/components/landing/motion";

/* ------------------------------------------------------------------ */
/*  404 — on theme with the product: your agent looked everywhere and    */
/*  found no record of this page. Giant layered editorial numerals, a    */
/*  witty line, and a clear way back. Warm paper, one signal color.      */
/* ------------------------------------------------------------------ */

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-paper text-ink">
      {/* quiet living glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
      >
        <div className="aurora absolute left-1/2 top-[18%] h-[36rem] w-[46rem] max-w-[140vw] -translate-x-1/2" />
      </div>

      <div className="mx-auto flex w-full max-w-[80rem] flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-24">
        <Reveal>
          <p className="kicker mb-8 flex items-center justify-center gap-2.5 text-signal-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-signal blink" />
            error 404 · no record found
          </p>
        </Reveal>

        {/* giant layered numerals */}
        <Float amount={12} duration={8}>
          <div className="relative max-w-full select-none overflow-hidden px-[0.05em] leading-none">
            <span
              aria-hidden
              className="text-outline-signal pointer-events-none absolute inset-0 -translate-y-[0.04em] translate-x-[0.03em] block font-serif text-[clamp(7rem,30vw,22rem)] font-medium opacity-30"
            >
              404
            </span>
            <span className="display-serif block bg-gradient-to-br from-signal-deep via-signal to-signal-deep bg-clip-text text-[clamp(7rem,30vw,22rem)] font-medium text-transparent">
              404
            </span>
          </div>
        </Float>

        <WordReveal
          as="h1"
          className="display-serif mt-6 text-[clamp(1.9rem,5vw,3.4rem)] text-ink"
          text="Your agent looked everywhere —"
          accent="no record of this one."
          accentClass="italic text-signal-deep"
        />

        <MaskReveal delay={140} className="mt-6">
          <p className="mx-auto max-w-md text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
            This page isn&apos;t on the agenda. The link may be old, or the
            meeting it pointed to has since moved on. Let&apos;s get you back to
            something that exists.
          </p>
        </MaskReveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <CTAButton href="/" className="px-7 py-4 text-[0.95rem]">
              Back to home
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </CTAButton>
            <CTAButton href="/#how" variant="ghost" className="px-6 py-4 text-[0.95rem]">
              See how it works
            </CTAButton>
          </div>
        </Reveal>
      </div>

      {/* closing ribbon */}
      <Marquee className="border-t border-line/60 bg-paper-2/40 py-4 text-ink-soft/70">
        <span className="font-mono text-[0.74rem] uppercase tracking-[0.28em]">
          {["lost the thread", "404", "off the record", "not on the agenda", "rewind"]
            .map((w) => `· ${w} `)
            .join("")}
        </span>
      </Marquee>
    </main>
  );
}
