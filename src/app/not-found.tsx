import Link from "next/link";
import { Wordmark } from "@/components/site/Wordmark";

/* 404: the line runs out. A short coral stroke that stops mid-page, a plain explanation and two
   ways back. Server component; the only motion is the stroke drawing once on load. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg text-ink-2">
      <header className="mx-auto w-[min(1120px,100%-40px)] pt-6 sm:w-[min(1120px,100%-80px)]">
        <Link href="/" aria-label="Mytheus home" className="group inline-flex rounded-ctl">
          <Wordmark size={22} />
        </Link>
      </header>
      <section className="mx-auto flex w-[min(640px,100%-40px)] flex-1 flex-col items-center justify-center py-16 text-center">
        <svg viewBox="0 0 320 90" aria-hidden className="mb-8 h-auto w-[min(320px,80vw)] overflow-visible">
          <path
            className="loop-path line-stroke"
            pathLength={1}
            d="M6 60 C60 60 80 20 128 22 C176 24 168 70 132 66 C100 62 118 30 168 34 C210 38 228 58 262 58"
          />
          <circle cx={262} cy={58} r={5} fill="var(--signal)" />
        </svg>
        <p className="kicker">Page not found</p>
        <h1 className="display mt-3 text-[clamp(2.2rem,6vw,3.4rem)]">The line stops here.</h1>
        <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink-3">
          There is no page at this address. The link may be out of date, or the page has moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5">
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-ctl bg-pill px-[22px] text-[16px] font-semibold text-pill-on transition-colors hover:bg-pill-2"
          >
            Go to the home page
          </Link>
          <Link
            href="/dashboard"
            className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px]"
          >
            Open your dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
