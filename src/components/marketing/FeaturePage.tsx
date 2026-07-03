import Link from "next/link";
import { PageShell } from "./PageShell";
import { FEATURE_VISUALS } from "./feature-visuals";
import { getFeature, FEATURES } from "@/lib/marketing/features";
import {
  WordReveal,
  Reveal,
  Stagger,
  StaggerItem,
  ScrollScale,
  Tilt,
} from "@/components/landing/motion";
import { PillCTA, Eyebrow } from "@/components/landing/ui";

/* The shared template every /features/* page renders through: an editorial
   WordReveal hero, the scroll-scaled product visual, three benefit blocks,
   the honest capability note, related features, and a CTA that drops straight
   into the app. Server component; motion primitives are the client islands. */

export function FeaturePage({ slug }: { slug: string }) {
  const f = getFeature(slug);
  const Visual = FEATURE_VISUALS[f.visual];
  const related = FEATURES.filter((x) => x.slug !== slug).slice(0, 3);

  return (
    <PageShell>
      {/* hero */}
      <section className="mesh-field mesh-anim grain relative isolate overflow-hidden border-b border-line">
        <div className="relative z-10 mx-auto max-w-[1340px] px-6 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-28">
          <Reveal>
            <Eyebrow className="text-signal">{f.eyebrow}</Eyebrow>
          </Reveal>
          <WordReveal
            as="h1"
            text={f.title}
            accent={f.accent}
            accentClass="italic text-gradient-signal"
            className="display display-tight mt-5 max-w-[22ch] text-balance text-[clamp(2.6rem,6vw,4.8rem)]"
            delay={80}
          />
          <Reveal delay={200}>
            <p className="mt-6 max-w-[54ch] text-[18px] leading-relaxed text-ink-3">
              {f.blurb}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-9">
              <PillCTA href="/dashboard">Get started free</PillCTA>
            </div>
          </Reveal>
        </div>
      </section>

      {/* the product visual, pushed in by the scroll camera */}
      <section className="mx-auto max-w-[1340px] px-6 pt-16 sm:px-8 sm:pt-20">
        <ScrollScale from={0.92} className="flex justify-center">
          <Tilt max={5} className="w-full max-w-[560px]">
            <Visual />
          </Tilt>
        </ScrollScale>
      </section>

      {/* benefits */}
      <section className="mx-auto max-w-[1340px] px-6 py-16 sm:px-8 sm:py-20">
        <Stagger className="grid gap-5 md:grid-cols-3">
          {f.benefits.map((b) => (
            <StaggerItem key={b.title} className="h-full">
              <div className="card-interactive flex h-full flex-col rounded-card border border-line bg-white p-7">
                <h2 className="text-[18px] font-medium tracking-tight text-ink">
                  {b.title}
                </h2>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-3">
                  {b.body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* the honest capability note */}
        <Reveal delay={100}>
          <div className="mt-10 flex items-start gap-3.5 rounded-card border border-line bg-bg-3 p-6 sm:p-7">
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-signal-soft text-signal-deep"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="m3.5 8.5 2.8 2.8L12.5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
                How it actually behaves
              </p>
              <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
                {f.note}
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* related features */}
      <section className="mx-auto max-w-[1340px] px-6 pb-16 sm:px-8 sm:pb-20">
        <Reveal>
          <Eyebrow className="text-signal">Keep exploring</Eyebrow>
        </Reveal>
        <Stagger className="mt-6 grid gap-4 sm:grid-cols-3">
          {related.map((r) => (
            <StaggerItem key={r.slug}>
              <Link
                href={`/features/${r.slug}`}
                className="card-interactive group flex h-full flex-col rounded-card border border-line bg-white p-6"
              >
                <span className="text-[16px] font-medium tracking-tight text-ink">
                  {r.nav}
                </span>
                <span className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-3">
                  {r.blurb}
                </span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-signal-deep">
                  Learn more
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* closing CTA */}
      <section className="mx-auto max-w-[1340px] px-6 pb-24 sm:px-8 sm:pb-28">
        <div className="mesh-field grain relative overflow-hidden rounded-[22px] border border-line px-8 py-16 text-center sm:px-12 sm:py-20">
          <Reveal>
            <h2 className="display display-tight mx-auto max-w-[22ch] text-[clamp(2.2rem,5vw,3.8rem)]">
              Bring your own agent to the next meeting.
            </h2>
            <p className="mx-auto mt-6 max-w-[52ch] text-[18px] leading-relaxed text-ink-3">
              No bot to invite, nothing to install for the room — it starts
              working the first time you join.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-9 flex justify-center">
              <PillCTA href="/dashboard">Get started free</PillCTA>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
