import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "./PageHero";
import { FeatureVisual } from "./feature-visuals";
import { FEATURES, getFeature } from "@/lib/marketing/features";
import { Section, SectionHead, Stage, Wrap } from "@/components/site/Section";
import { Loop } from "@/components/site/Loop";
import { CloseCTA } from "@/components/site/CloseCTA";
import { neighbours } from "@/components/features/groups";
import { FeatureGlyph } from "@/components/features/glyphs";

/* The template every /features/* page renders through, in the one-line language:

   1. PageHero: the coral Loop circles the feature's key phrase (`accent`), then the lead, one
      dark CTA and a quiet link back to all features; the feature's product window sits on a warm
      Stage below (peach and ochre alternate down the feature list).
   2. Benefits: SectionHead, then the three benefits as one aligned editorial row divided by
      hairlines, not three identical cards.
   3. How it behaves: the honest capability note, set large in the serif.
   4. Related: two or three neighbours from the same footer group, as quiet linked rows.
   5. CloseCTA, which every marketing page ends on.

   Server component. The only client code is the InView inside the window and the glyphs. */

export function FeaturePage({ slug }: { slug: string }) {
  const f = getFeature(slug);
  const index = FEATURES.findIndex((x) => x.slug === slug);
  const related = neighbours(slug, 3);

  return (
    <>
      <PageHero
        eyebrow={f.eyebrow}
        title={
          <>
            {f.title} <Loop>{f.accent}</Loop>
          </>
        }
        blurb={f.blurb}
        ctaHref="/sign-up"
        ctaLabel="Get started free"
        secondaryHref="/features"
        secondaryLabel="See all features"
      >
        <Stage tone={index % 2 === 0 ? "peach" : "ochre"} glow={index % 2 === 0}>
          <FeatureVisual visual={f.visual} />
        </Stage>
      </PageHero>

      <Section cross>
        <Wrap>
          <SectionHead title={f.benefitsTitle} lead={f.benefitsLead} />
          <ul className="grid border-t border-line-2 md:grid-cols-3">
            {f.benefits.map((b, i) => (
              <li
                key={b.title}
                className={`border-line-2 py-7 md:py-8 ${i > 0 ? "border-t md:border-l md:border-t-0 md:pl-8" : ""} ${i < 2 ? "md:pr-8" : ""}`}
              >
                <h3 className="font-display text-[1.6rem] font-medium leading-[1.12] tracking-[-0.015em] text-ink">{b.title}</h3>
                <p className="mt-3 max-w-[38ch] text-[1rem] leading-relaxed text-ink-3">{b.body}</p>
              </li>
            ))}
          </ul>
        </Wrap>
      </Section>

      <Section cross>
        <Wrap>
          <div className="grid gap-x-14 gap-y-6 border-y border-line-2 py-[clamp(32px,4.5vw,56px)] md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div>
              <h2 className="display text-[clamp(2rem,3.6vw,2.75rem)]">How it behaves</h2>
              <p className="mt-3 max-w-[30ch] text-[1rem] leading-relaxed text-ink-3">
                The honest version, in plain terms: what it does and where its limits are.
              </p>
            </div>
            <div>
              <p className="max-w-[34ch] font-display text-[clamp(1.45rem,2.5vw,1.95rem)] leading-[1.28] tracking-[-0.012em] text-ink">
                {f.note}
              </p>
              <Link
                href="/security"
                className="mt-6 inline-block font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal"
              >
                How we handle your data
              </Link>
            </div>
          </div>
        </Wrap>
      </Section>

      <Section cross>
        <Wrap>
          <SectionHead title="It works alongside these." lead="Each feature hands its work to the next. These are the closest neighbours." />
          <ul className="border-t border-line-2">
            {related.map((r) => (
              <li key={r.slug} className="border-b border-line-2">
                <Link
                  href={`/features/${r.slug}`}
                  className="group grid grid-cols-[minmax(0,1fr)_40px] items-center gap-x-5 gap-y-1 py-5 transition-colors duration-200 hover:bg-surface-2 sm:grid-cols-[64px_minmax(0,1fr)_40px] sm:px-3 md:grid-cols-[64px_minmax(0,.9fr)_minmax(0,1.3fr)_40px] md:py-6"
                >
                  <span className="hidden sm:row-span-2 sm:block md:row-span-1">
                    <FeatureGlyph slug={r.slug} className="in" />
                  </span>
                  <span className="font-display text-[1.45rem] font-medium leading-[1.15] tracking-[-0.012em] text-ink decoration-signal-line decoration-2 underline-offset-[6px] group-hover:underline">
                    {r.nav}
                  </span>
                  <span className="col-start-1 row-start-2 text-[15px] leading-relaxed text-ink-3 sm:col-start-2 md:col-start-3 md:row-start-1">
                    {r.blurb}
                  </span>
                  <span
                    aria-hidden
                    className="col-start-2 row-span-2 row-start-1 grid h-10 w-10 place-items-center rounded-full border border-line-2 text-ink-2 transition-colors duration-200 group-hover:border-ink group-hover:text-ink sm:col-start-3 md:col-start-4 md:row-span-1"
                  >
                    <ArrowRight size={17} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Wrap>
      </Section>

      <CloseCTA />
    </>
  );
}
