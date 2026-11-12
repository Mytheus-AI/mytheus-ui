import Link from "next/link";
import type { ReactNode } from "react";
import { InView } from "@/components/site/InView";
import { Section, Wrap } from "@/components/site/Section";

/* The closing call to action every marketing page ends on, just before the footer: a warm panel
   with a serif title, one dark primary and a quiet secondary link, and along its bottom edge the
   memory line: the team's first meeting as a solid bead, then one bead per meeting after it,
   running off the right edge. It draws when the panel scrolls into view. */

const BEADS: { x: number; y: number; label: string; ly: number }[] = [
  { x: 250, y: 40, label: "Roadmap sync", ly: 80 },
  { x: 430, y: 66, label: "Pricing review", ly: 106 },
  { x: 610, y: 44, label: "Customer call", ly: 84 },
  { x: 790, y: 64, label: "Friday standup", ly: 104 },
  { x: 970, y: 48, label: "Q3 launch sync", ly: 88 },
  { x: 1150, y: 58, label: "the next one", ly: 98 },
];

export function CloseCTA({
  title = "Unlimited meeting memory.",
  lead = "Your team's context, carried forward from your very first meeting and every one after it.",
  ctaHref = "/sign-up",
  ctaLabel = "Get started free",
  secondaryHref = "/enterprise",
  secondaryLabel = "Talk to the team",
  note = "Free to start. No bot joins your call.",
}: {
  title?: ReactNode;
  lead?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  note?: ReactNode;
}) {
  return (
    <Section cross id="start" className="!pb-[clamp(64px,8vw,104px)]">
      <Wrap>
        <InView
          threshold={0.3}
          className="relative overflow-hidden rounded-hero px-6 pt-[clamp(52px,7vw,92px)] text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,.45)]"
          style={{ background: "var(--wash-glow), var(--wash)" }}
        >
          <h2 className="display mx-auto max-w-[13ch] text-[clamp(2.5rem,6.6vw,5rem)] leading-[0.98]">{title}</h2>
          <p className="mx-auto mt-5 max-w-[42ch] text-[clamp(1.08rem,1.6vw,1.25rem)] leading-relaxed text-ink-2">{lead}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5">
            <Link
              href={ctaHref}
              className="inline-flex h-12 items-center rounded-ctl bg-pill px-[22px] text-[16px] font-semibold text-pill-on transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:bg-pill-2 hover:shadow-warm-2"
            >
              {ctaLabel}
            </Link>
            {secondaryHref ? (
              <Link
                href={secondaryHref}
                className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
          {note ? <p className="mt-4 text-[15px] text-ink-3">{note}</p> : null}

          <div
            aria-hidden
            className="-mx-6 mt-[clamp(34px,4.6vw,58px)] overflow-hidden pb-[clamp(14px,2vw,26px)] text-left [mask-image:linear-gradient(90deg,#000_62%,transparent_98%)]"
          >
            <svg viewBox="0 0 1200 128" className="h-auto w-full min-w-[880px] overflow-visible">
              <path
                className="line-stroke line-draw"
                pathLength={1}
                style={{ strokeWidth: 2.6, ["--du" as string]: "2.4s", ["--dl" as string]: ".2s" }}
                d="M70 56 C130 56 190 40 250 40 S370 66 430 66 S550 44 610 44 S730 64 790 64 S910 48 970 48 S1090 58 1150 58 S1230 52 1280 52"
              />
              <circle
                cx={70}
                cy={56}
                r={9}
                className="cta-bead"
                fill="var(--signal-line)"
                stroke="var(--signal-soft)"
                strokeWidth={7}
                paintOrder="stroke"
                style={{ ["--dl" as string]: ".1s" }}
              />
              <text x={52} y={98} className="cta-label fill-ink font-display text-[19px] font-semibold" style={{ ["--dl" as string]: ".1s" }}>
                Your first meeting
              </text>
              {BEADS.map((b, i) => (
                <g key={b.label} className="cta-bead" style={{ ["--dl" as string]: `${0.6 + i * 0.35}s` }}>
                  <circle cx={b.x} cy={b.y} r={6.5} fill="var(--surface-2)" stroke="var(--signal-line)" strokeWidth={2.2} />
                  <text x={b.x} y={b.ly} textAnchor="middle" className="fill-ink-3 font-display text-[19px] ">
                    {b.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </InView>
      </Wrap>
    </Section>
  );
}
