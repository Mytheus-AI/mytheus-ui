import {
  Reveal,
  CTAButton,
  Parallax,
  WordReveal,
  Tilt,
} from "./motion";

/* ------------------------------------------------------------------ */
/*  "Wherever you work" — a centered serif heading + CTA, then a bento   */
/*  grid mixing text features with a desktop-widget visual. Reprise is   */
/*  its own meeting platform, so this is about being native + on every   */
/*  device — not about plugging into other apps.                         */
/* ------------------------------------------------------------------ */

function TextCard({
  title,
  body,
  delay = 0,
  className = "",
}: {
  title: string;
  body: string;
  delay?: number;
  className?: string;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="group h-full rounded-2xl border border-line bg-white/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:bg-white/80 hover:shadow-[0_30px_60px_-40px_rgba(24,19,31,0.5)] sm:p-7">
        <h3 className="text-xl font-semibold tracking-tight text-ink">{title}</h3>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft">{body}</p>
      </div>
    </Reveal>
  );
}

/** The floating desktop widget: the next meeting + a one-tap join, all native. */
function WidgetCard() {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-line bg-gradient-to-br from-paper-3/60 to-paper-2 p-5 sm:p-7">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-ink">
          On your desktop, the moment it starts
        </h3>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft">
          Reprise surfaces your next meeting right where you&apos;re working — Brief
          already prepped, one tap to join. No app to go hunting for.
        </p>
      </div>

      {/* the widget itself */}
      <Tilt max={9} className="mt-8">
        <Parallax distance={20}>
          <div className="rounded-xl border border-line bg-white/90 p-3.5 shadow-[0_24px_50px_-26px_rgba(24,19,31,0.5)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-soft/70">
                up next · 2 min
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-signal blink" />
            </div>
            <p className="mt-2 text-[0.95rem] font-semibold text-ink">Team stand-up</p>
            <p className="font-mono text-[0.62rem] text-ink-soft">9:30 — 9:45 · Reprise</p>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-deep"
            >
              <span className="flex items-center text-white" aria-hidden>
                <span className="text-[0.95rem] font-bold leading-none">R</span>
                <svg width="8" height="16" viewBox="0 0 12 26" fill="none" className="ml-[1px]">
                  <line x1="6" y1="8" x2="6" y2="18" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="6" cy="6.6" r="2.5" fill="currentColor" />
                  <circle cx="6" cy="19.4" r="2.5" fill="currentColor" />
                </svg>
              </span>
              Join &amp; take notes
            </button>
          </div>
        </Parallax>
      </Tilt>
    </div>
  );
}

export function WorksEverywhere() {
  return (
    <section id="features" className="mx-auto max-w-[80rem] px-6 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="kicker mb-5 text-signal">Wherever you work</p>
        </Reveal>
        <WordReveal
          as="h2"
          className="display-serif text-[clamp(2.4rem,5.5vw,4.4rem)] text-ink"
          text="Your agent's"
          accent="already there."
          accentClass="italic text-signal-deep"
        />
        <Reveal delay={200}>
          <div className="mt-8 flex justify-center">
            <CTAButton href="/sign-up" className="px-7 py-4 text-[0.95rem]">
              Get started free
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </CTAButton>
          </div>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <TextCard
            title="No bots in your meetings"
            body="Your agent is native to Reprise — never a notetaker bot dialing in as an awkward extra guest in the participant list."
          />
          <TextCard
            delay={90}
            title="Private by default, ready to share"
            body="Your notes stay yours. Share a clean, sourced summary with a link the instant you decide someone should see it."
          />
          <TextCard
            delay={160}
            className="sm:col-span-2"
            title="Every device, one continuous memory"
            body="macOS, Windows, and iPhone all draw on the same agent and the same meeting history — start on your laptop, pick it up on your phone."
          />
        </div>
        <Reveal delay={120} y={28}>
          <WidgetCard />
        </Reveal>
      </div>
    </section>
  );
}
