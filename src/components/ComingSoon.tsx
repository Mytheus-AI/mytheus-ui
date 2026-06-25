import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  A branded placeholder for routes the marketing site links to but    */
/*  that aren't built yet (auth, blog, legal, …). Keeps every link a     */
/*  real 200 response so nothing 404s — swap these out as the pages      */
/*  get built for real.                                                  */
/* ------------------------------------------------------------------ */

export function ComingSoon({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-paper text-ink">
      {/* minimal header */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[80rem] items-center px-6">
          <Link href="/" aria-label="Reprise — home" className="flex items-center gap-2">
            <span className="flex items-center text-signal" aria-hidden>
              <span className="text-[1.4rem] font-bold leading-none tracking-tight">R</span>
              <svg width="11" height="24" viewBox="0 0 12 26" fill="none" className="ml-[1px]">
                <line x1="6" y1="8" x2="6" y2="18" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="6" cy="6.6" r="2.5" fill="currentColor" />
                <circle cx="6" cy="19.4" r="2.5" fill="currentColor" />
              </svg>
            </span>
            <span className="font-logo text-[1.4rem] leading-none tracking-[0.01em] text-ink">
              Reprise<span className="text-signal">.</span>
            </span>
          </Link>
        </div>
      </header>

      {/* centered message */}
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-xl text-center">
          <p className="kicker text-signal">{eyebrow}</p>
          <h1 className="display-serif mt-5 text-[clamp(2.4rem,7vw,4.5rem)] text-ink">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-md text-ink-soft">{blurb}</p>
          <Link
            href="/"
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-signal px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-signal-deep"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">←</span>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
