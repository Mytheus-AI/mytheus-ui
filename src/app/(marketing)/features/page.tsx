import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/marketing/PageHero";
import { Section, SectionHead, Wrap } from "@/components/site/Section";
import { Loop } from "@/components/site/Loop";
import { InView } from "@/components/site/InView";
import { CloseCTA } from "@/components/site/CloseCTA";
import { GROUPS } from "@/components/features/groups";
import { FeatureGlyph } from "@/components/features/glyphs";

export const metadata: Metadata = {
  title: "Features | Mytheus",
  description:
    "Every participant gets their own meeting agent. See what it does in the room, and the platform it stands on.",
};

/* The features hub: the hero, then every feature grouped the way the footer groups them. "Your
   agent" is a grid of tiles, "Platform" a list of rows, so the two groups read differently. Each
   item carries its nav name, blurb and a tiny drawn glyph; the glyphs draw once, as their group
   scrolls in. Ends on the shared CloseCTA. */

export default function Page() {
  const [agent, platform] = GROUPS;

  return (
    <>
      <PageHero
        eyebrow="Features"
        title={
          <>
            One agent per person, not one bot per <Loop>meeting.</Loop>
          </>
        }
        blurb="Meeting bots write one summary for the whole room. Mytheus gives every participant their own agent, tuned to their role and private by default, and lets those agents share context across meetings with a source for every answer."
        ctaHref="/sign-up"
        ctaLabel="Get started free"
        secondaryHref="/pricing"
        secondaryLabel="See pricing"
      />

      <Section cross id="your-agent">
        <Wrap>
          <SectionHead
            title="What your agent does in the room."
            lead="Six jobs it does quietly in every meeting you join. What it captures stays yours until you choose to share it."
          />
          <InView as="ul" threshold={0.15} className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3" aria-label={agent.title}>
            {agent.features.map((f, i) => (
              <li key={f.slug}>
                <Link
                  href={`/features/${f.slug}`}
                  className="group flex h-full flex-col rounded-card border border-line bg-surface p-6 transition-[border-color,background-color] duration-200 hover:border-line-2 hover:bg-surface-2 sm:p-7"
                >
                  <FeatureGlyph slug={f.slug} delay={0.15 + i * 0.18} />
                  <span className="mt-6 font-display text-[1.55rem] font-medium leading-[1.12] tracking-[-0.015em] text-ink decoration-signal-line decoration-2 underline-offset-[6px] group-hover:underline">
                    {f.nav}
                  </span>
                  <span className="mt-2.5 text-[15px] leading-relaxed text-ink-3">{f.blurb}</span>
                </Link>
              </li>
            ))}
          </InView>
        </Wrap>
      </Section>

      <Section cross id="platform">
        <Wrap>
          <SectionHead
            title="The platform it stands on."
            lead="Captions, search, memory and the tools your follow-up lands in, shared by every agent in your workspace."
          />
          <InView as="ul" threshold={0.15} className="border-t border-line-2" aria-label={platform.title}>
            {platform.features.map((f, i) => (
              <li key={f.slug} className="border-b border-line-2">
                <Link
                  href={`/features/${f.slug}`}
                  className="group grid grid-cols-[64px_minmax(0,1fr)_40px] items-center gap-x-5 gap-y-1 py-5 transition-colors duration-200 hover:bg-surface-2 sm:px-3 md:grid-cols-[64px_minmax(0,.85fr)_minmax(0,1.35fr)_40px] md:py-6"
                >
                  <span className="row-span-2 md:row-span-1">
                    <FeatureGlyph slug={f.slug} delay={0.15 + i * 0.18} />
                  </span>
                  <span className="font-display text-[1.45rem] font-medium leading-[1.15] tracking-[-0.012em] text-ink decoration-signal-line decoration-2 underline-offset-[6px] group-hover:underline">
                    {f.nav}
                  </span>
                  <span className="col-start-2 row-start-2 text-[15px] leading-relaxed text-ink-3 md:col-start-3 md:row-start-1">{f.blurb}</span>
                  <span
                    aria-hidden
                    className="col-start-3 row-span-2 row-start-1 grid h-10 w-10 place-items-center rounded-full border border-line-2 text-ink-2 transition-colors duration-200 group-hover:border-ink group-hover:text-ink md:col-start-4 md:row-span-1"
                  >
                    <ArrowRight size={17} />
                  </span>
                </Link>
              </li>
            ))}
          </InView>
        </Wrap>
      </Section>

      <CloseCTA />
    </>
  );
}
