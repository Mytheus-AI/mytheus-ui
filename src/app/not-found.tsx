"use client";

import { WordReveal, MaskReveal, Reveal, Marquee } from "@/components/landing/motion";
import { PillCTA, OutlinePill } from "@/components/landing/ui";

/* 404 — on theme: your agent looked everywhere and found no record of this
   page. Giant tight grotesk numerals, a witty line, a way back. */

export default function NotFound() {
  return (
    <main className="mesh-field grain relative flex min-h-screen flex-col overflow-hidden bg-bg text-ink-2">
      <div className="relative z-10 mx-auto flex w-full max-w-[80rem] flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-24">
        <Reveal>
          <p className="kicker mb-8 text-signal">error 404 · no record found</p>
        </Reveal>

        <div className="select-none overflow-hidden leading-none">
          <span className="display display-tight block text-[clamp(7rem,30vw,22rem)] text-ink-display">
            404
          </span>
        </div>

        <WordReveal
          as="h1"
          className="display mt-6 text-[clamp(1.8rem,5vw,3.2rem)]"
          text="Your agent looked everywhere —"
          accent="no record of this one."
          accentClass="text-signal"
        />

        <MaskReveal delay={140} className="mt-6">
          <p className="mx-auto max-w-md text-[1.02rem] leading-relaxed text-ink-3 text-pretty">
            This page isn&apos;t on the agenda. The link may be old, or the
            meeting it pointed to has since moved on. Let&apos;s get you back to
            something that exists.
          </p>
        </MaskReveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <PillCTA href="/">Back to home</PillCTA>
            <OutlinePill href="/#how">See how it works</OutlinePill>
          </div>
        </Reveal>
      </div>

      <Marquee className="relative z-10 border-t border-line py-4 text-ink-3">
        <span className="font-mono text-[0.74rem] uppercase tracking-[0.28em]">
          {["lost the thread", "404", "off the record", "not on the agenda", "rewind"]
            .map((w) => `· ${w} `)
            .join("")}
        </span>
      </Marquee>
    </main>
  );
}
