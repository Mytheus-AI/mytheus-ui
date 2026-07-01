import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageShell } from "@/components/marketing/PageShell";
import { PageHero } from "@/components/marketing/PageHero";
import { PillCTA, Eyebrow, IconChip } from "@/components/landing/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/motion";

export const metadata: Metadata = { title: "Students — Mytheus" };

/* ---------------- icons (inline, theme-neutral) ---------------- */

function InfinityIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6.5 8.5a3.5 3.5 0 1 0 0 7c2.2 0 3.4-1.8 5-3.5 1.6-1.7 2.8-3.5 5-3.5a3.5 3.5 0 1 1 0 7c-2.2 0-3.4-1.8-5-3.5-1.6-1.7-2.8-3.5-5-3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AgentIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="7" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4v3M9 12h.01M15 12h.01M9.5 15.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function NotesIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 4h9l3 3v13H6V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 10h6M9 13.5h6M9 17h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- data ---------------- */

const PERKS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <InfinityIcon />,
    title: "Unlimited meeting memory",
    body: "Every lecture, study group, and standup stays searchable — your agent carries context from one session into the next, all term long.",
  },
  {
    icon: <AgentIcon />,
    title: "Your personal agent everywhere",
    body: "A dedicated agent in every class and project standup, capturing decisions and action items live — and never writing anything without your confirmation.",
  },
  {
    icon: <NotesIcon />,
    title: "Shorthand → clean notes",
    body: "Your rough scribbles become tidy, structured minutes you can actually study from — decisions, owners, and next steps laid out clearly.",
  },
];

const ELIGIBILITY: string[] = [
  "Currently enrolled at an accredited school, college, or university.",
  "A valid school email (.edu or your institution's email address).",
  "Renew your verification once each academic year to stay on Pro.",
];

export default function Page() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Students"
        title="Mytheus is free for students."
        blurb="Verified students get Mytheus Pro at no cost — your personal meeting agent for lectures, study groups, and project standups."
        ctaHref="/students/verify"
        ctaLabel="Verify your status"
      />

      {/* What you get */}
      <section className="mx-auto max-w-[1340px] px-6 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <Eyebrow>What you get</Eyebrow>
          <h2 className="display mt-5 max-w-[20ch] text-[clamp(2rem,4.5vw,3.2rem)]">
            Mytheus Pro, on the house.
          </h2>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-3">
            The full meeting agent — no trial clock, no feature gates. Just
            everything you need to stay on top of every class and project.
          </p>
        </Reveal>

        <Stagger className="mt-12 grid gap-6 md:grid-cols-3">
          {PERKS.map((perk) => (
            <StaggerItem key={perk.title}>
              <div className="card-interactive flex h-full flex-col rounded-card border border-line bg-white p-6 sm:p-7">
                <IconChip>{perk.icon}</IconChip>
                <h3 className="mt-5 text-[1.25rem] font-medium tracking-tight text-ink-display">
                  {perk.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-3">
                  {perk.body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Who's eligible */}
      <section className="border-y border-line bg-bg-2">
        <div className="mx-auto max-w-[1340px] px-6 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <Reveal>
              <Eyebrow>Who&apos;s eligible</Eyebrow>
              <h2 className="display mt-5 max-w-[16ch] text-[clamp(2rem,4.5vw,3.2rem)]">
                Quick to check, free to keep.
              </h2>
              <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-3">
                If you&apos;re actively studying, you almost certainly qualify.
                Here&apos;s what we look for.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="rounded-card border border-line bg-white p-2 sm:p-3">
                {ELIGIBILITY.map((item, i) => (
                  <li
                    key={item}
                    className={`flex items-start gap-4 px-5 py-5 ${
                      i < ELIGIBILITY.length - 1 ? "border-b border-line" : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className="mt-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-signal"
                    />
                    <span className="text-[16px] leading-relaxed text-ink-2">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Closing band */}
      <section className="mx-auto max-w-[1340px] px-6 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <div className="mesh-field grain relative isolate overflow-hidden rounded-card border border-line px-8 py-14 text-center sm:px-12 sm:py-16">
            <h2 className="display display-tight mx-auto max-w-[18ch] text-[clamp(1.9rem,4vw,3rem)]">
              Ready to put Mytheus to work?
            </h2>
            <p className="mx-auto mt-5 max-w-[44ch] text-[17px] leading-relaxed text-ink-3">
              Confirm you&apos;re a student and your Pro plan unlocks right away.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3">
              <PillCTA href="/students/verify">Verify your status</PillCTA>
              <p className="text-[13.5px] text-ink-3">Takes under a minute.</p>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
