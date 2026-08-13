import { appHref } from "@/lib/marketing/app-url";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { FEATURES } from "@/lib/marketing/features";
import {
  WordReveal,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/landing/motion";
import { PillCTA, Eyebrow } from "@/components/landing/ui";

export const metadata: Metadata = { title: "Features — Mytheus" };

/* The features hub: the personal-agent difference up top, the six things your
   agent does for you (the six specialists, marketed by benefit), and a card
   grid linking every feature page. */

/* the six-agent overview, by benefit — PersonalListener / Question / Decision /
   Action / ContextGap / Proactive, in user language */
const SIX = [
  {
    title: "Listens for you",
    body: "Role-relevant notes stream in live, tuned to what you do — no bot in the room.",
    href: "/features/personal-agent",
  },
  {
    title: "Suggests the question",
    body: "The question you'd wish you had asked, color-coded by urgency, private to you.",
    href: "/features/smart-questions",
  },
  {
    title: "Catches the decision",
    body: "Decisions labeled the moment they're said — confirmed by you, traced across meetings.",
    href: "/features/decisions",
  },
  {
    title: "Chases the action",
    body: "Every \"I'll own it\" becomes an assigned task with an owner, a due date, and follow-up.",
    href: "/features/action-items",
  },
  {
    title: "Fills the context gap",
    body: "Your agent asks other participants' agents and returns answers cited to the exact meeting.",
    href: "/features/context-gaps",
  },
  {
    title: "Flags what's coming",
    body: "Overloaded teammates, conflicting decisions, missing stakeholders — surfaced in time to act.",
    href: "/features/proactive-insights",
  },
];

export default function Page() {
  return (
    <PageShell>
      {/* hero — the personal-agent difference */}
      <section className="mesh-field mesh-anim grain relative isolate overflow-hidden border-b border-line">
        <div className="relative z-10 mx-auto max-w-[1340px] px-6 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-28">
          <Reveal>
            <Eyebrow className="text-signal">Features</Eyebrow>
          </Reveal>
          <WordReveal
            as="h1"
            text="One agent per person. Not one bot per"
            accent="meeting."
            accentClass="italic text-gradient-signal"
            className="display display-tight mt-5 max-w-[24ch] text-balance text-[clamp(2.6rem,6vw,4.8rem)]"
            delay={80}
          />
          <Reveal delay={200}>
            <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-ink-3">
              Meeting bots write one generic summary for the whole room. Mytheus
              gives every participant their own agent — tuned to their role,
              private by default, and collaborating with the other agents across
              meetings so answers come back sourced.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-9">
              <PillCTA href={appHref()}>Get started free</PillCTA>
            </div>
          </Reveal>
        </div>
      </section>

      {/* what your agent does — the six specialists, by benefit */}
      <section className="mx-auto max-w-[1340px] px-6 py-16 sm:px-8 sm:py-20">
        <Reveal>
          <Eyebrow className="text-signal">What your agent does</Eyebrow>
          <h2 className="display mt-4 max-w-[20ch] text-[clamp(1.8rem,3.4vw,2.8rem)]">
            Six jobs, done quietly, in every meeting.
          </h2>
        </Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SIX.map((s, i) => (
            <StaggerItem key={s.title} className="h-full">
              <Link
                href={s.href}
                className="card-interactive group flex h-full flex-col rounded-card border border-line bg-white p-7"
              >
                <span className="font-mono text-[13px] tracking-[0.18em] text-signal">
                  0{i + 1}
                </span>
                <h3 className="mt-4 text-[18px] font-medium tracking-tight text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{s.body}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13.5px] font-medium text-signal-deep">
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

      {/* everything else */}
      <section className="mx-auto max-w-[1340px] px-6 pb-16 sm:px-8 sm:pb-20">
        <div className="rounded-[22px] border border-line bg-bg-3 p-8 sm:p-12">
          <Reveal>
            <Eyebrow className="text-signal">The full platform</Eyebrow>
            <h2 className="display mt-4 max-w-[20ch] text-[clamp(1.8rem,3.4vw,2.8rem)]">
              Everything the agents stand on.
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.filter((f) =>
              ["transcription", "search", "knowledge-graph", "integrations", "live-notes"].includes(
                f.slug,
              ),
            ).map((f) => (
              <StaggerItem key={f.slug} className="h-full">
                <Link
                  href={`/features/${f.slug}`}
                  className="card-interactive group flex h-full flex-col rounded-card border border-line bg-white p-6"
                >
                  <span className="text-[16px] font-medium tracking-tight text-ink">
                    {f.nav}
                  </span>
                  <span className="mt-1.5 line-clamp-3 text-[13.5px] leading-relaxed text-ink-3">
                    {f.blurb}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13.5px] font-medium text-signal-deep">
                    Learn more
                    <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* closing CTA */}
      <section className="mx-auto max-w-[1340px] px-6 pb-24 sm:px-8 sm:pb-28">
        <div className="mesh-field grain relative overflow-hidden rounded-[22px] border border-line px-8 py-16 text-center sm:px-12 sm:py-20">
          <Reveal>
            <h2 className="display display-tight mx-auto max-w-[22ch] text-[clamp(2.2rem,5vw,3.8rem)]">
              See it work in your next meeting.
            </h2>
            <p className="mx-auto mt-6 max-w-[52ch] text-[18px] leading-relaxed text-ink-3">
              Free to start, nothing for the rest of the room to install.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <PillCTA href={appHref()}>Get started free</PillCTA>
              <Link
                href="/pricing"
                className="link-underline text-[15px] font-medium text-ink-2"
              >
                See pricing
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
