import type { ReactNode } from "react";
import Link from "next/link";
import { Wrap } from "@/components/site/Section";

/* The opening of every secondary marketing page: a centred serif title, a short lead, one dark
   primary action with an optional quiet text link, and an optional visual below (usually a
   product window on a Stage). Wrap one phrase of the title in <Loop> to draw the coral loop that
   starts the page-long line; without a Loop the line starts under the nav.

   `eyebrow` is the small context label above the title (for example the feature family); keep it
   to a few words, sentence case. */
export function PageHero({
  eyebrow,
  title,
  blurb,
  ctaHref,
  ctaLabel = "Get started free",
  secondaryHref,
  secondaryLabel,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  blurb?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
}) {
  return (
    <section className="pb-[clamp(56px,8vw,104px)] pt-[clamp(48px,6vw,88px)] text-center">
      <Wrap>
        {eyebrow ? <p className="kicker mb-5">{eyebrow}</p> : null}
        <h1 className="display mx-auto max-w-[18ch] text-[clamp(2.7rem,6.6vw,5rem)] leading-[0.98] tracking-[-0.03em]">
          {title}
        </h1>
        {blurb ? (
          <p className="mx-auto mt-[clamp(26px,3.4vw,40px)] max-w-[54ch] text-[clamp(1.1rem,1.6vw,1.28rem)] leading-relaxed text-ink-3">
            {blurb}
          </p>
        ) : null}
        {ctaHref || secondaryHref ? (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5">
            {ctaHref ? (
              <Link
                href={ctaHref}
                className="inline-flex h-12 items-center rounded-ctl bg-pill px-[22px] text-[16px] font-semibold text-pill-on transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:bg-pill-2 hover:shadow-warm-2"
              >
                {ctaLabel}
              </Link>
            ) : null}
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
        {children ? <div className="mt-[clamp(36px,4.6vw,60px)] text-left">{children}</div> : null}
      </Wrap>
    </section>
  );
}
