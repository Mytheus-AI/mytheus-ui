import Link from "next/link";
import { TopoField } from "@/components/home/fx/TopoField";
import { Decode } from "@/components/home/fx/Decode";
import s from "@/components/home/home.module.css";

/* The home page's close, just before the footer: a full-bleed map of contour lines (the shape
   your team's memory takes, one layer per meeting) with the last promise and the one action on
   top. Replaces the shared CloseCTA on this page only. The page-long line crosses at its top. */
export function HomeClose() {
  return (
    <section id="start" data-snap="" data-snap-label="Get started" className="relative isolate overflow-hidden py-[clamp(110px,15vw,200px)] text-center min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center">
      <div aria-hidden className={`${s.topoGround} absolute inset-0 -z-10`}>
        <TopoField />
        <div className={s.topoVeil} />
      </div>
      <div data-snap-in="" className="mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
        <p className="text-[15px] font-semibold text-signal-ink">
          <Decode text="Every meeting adds a layer" duration={900} />
        </p>
        <h2 className="display display-tight mx-auto mt-4 max-w-[13ch] text-[clamp(2.8rem,7.4vw,5.8rem)] leading-[0.96]">
          Unlimited meeting memory.
        </h2>
        <p className="mx-auto mt-6 max-w-[42ch] text-[clamp(1.08rem,1.6vw,1.25rem)] leading-relaxed text-ink-2">
          Your team&apos;s context, carried forward from your very first meeting and every one after it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5">
          <Link
            href="/sign-up"
            className="inline-flex h-[52px] items-center rounded-ctl bg-pill px-6 text-[16px] font-semibold text-pill-on transition-[background-color,transform] hover:bg-pill-2 motion-safe:active:scale-[.98]"
          >
            Get started free
          </Link>
          <Link
            href="/enterprise"
            className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal"
          >
            Talk to the team
          </Link>
        </div>
        <p className="mt-4 text-[15px] text-ink-3">Free to start. No bot joins your call.</p>
      </div>
    </section>
  );
}
