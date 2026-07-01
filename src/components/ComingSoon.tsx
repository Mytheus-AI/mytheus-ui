import Link from "next/link";
import { PillCTA } from "./landing/ui";
import { LogoMark } from "./Logo";

/* A branded placeholder for routes the marketing site links to but that
   aren't built yet (auth, blog, legal, …). Keeps every link a real 200 so
   nothing 404s — swap these out as the pages get built for real. */

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
    <div className="relative flex min-h-screen flex-col bg-bg text-ink-2">
      <header className="px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[26px] font-medium tracking-[-0.05em] text-ink"
        >
          <LogoMark size={28} />
          Mytheus
        </Link>
      </header>

      <main className="mesh-field grain relative isolate flex flex-1 items-center justify-center overflow-hidden px-6 py-24">
        <div className="relative z-10 max-w-xl text-center">
          <p className="kicker text-signal">{eyebrow}</p>
          <h1 className="display mt-5 text-[clamp(2.4rem,7vw,4.5rem)]">{title}</h1>
          <p className="mx-auto mt-5 max-w-md text-ink-3">{blurb}</p>
          <div className="mt-9 flex justify-center">
            <PillCTA href="/">Back to home</PillCTA>
          </div>
        </div>
      </main>
    </div>
  );
}
