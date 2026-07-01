import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageShell } from "@/components/marketing/PageShell";
import { PageHero } from "@/components/marketing/PageHero";
import { IconChip, Eyebrow } from "@/components/landing/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/motion";

export const metadata: Metadata = { title: "Careers — Mytheus" };

/* ------------------------------------------------------------------ */
/*  Inline glyphs — stroke uses currentColor so they inherit the chip  */
/*  colour. 24×24, 1.6 stroke, rounded joins to match the brand.       */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string };

function StackIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m3 12 9 4.5L21 12M3 16.5 12 21l9-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CraftIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 6.5v5.5l3.5 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrustIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3 5 5.5v5.2c0 4.3 2.9 7.5 7 9.3 4.1-1.8 7-5 7-9.3V5.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9.2 12 2 2 3.6-3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRight({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M5 11 11 5m0 0H5.5M11 5v5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function ValueCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <StaggerItem className="h-full">
      <div className="card-interactive flex h-full flex-col rounded-card border border-line bg-white p-7">
        <IconChip>{icon}</IconChip>
        <h3 className="mt-5 text-[18px] font-medium tracking-tight text-ink">
          {title}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{body}</p>
      </div>
    </StaggerItem>
  );
}

function PerkTile({ title, body }: { title: string; body: string }) {
  return (
    <StaggerItem className="h-full">
      <div className="flex h-full flex-col rounded-card border border-line bg-bg-3 p-6">
        <h3 className="text-[15px] font-medium tracking-tight text-ink">
          {title}
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">{body}</p>
      </div>
    </StaggerItem>
  );
}

type Role = {
  title: string;
  team: string;
  location: string;
  type: string;
};

const ROLES: Role[] = [
  {
    title: "Founding Full-Stack Engineer",
    team: "Product Engineering",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "AI / Agents Engineer",
    team: "Applied AI",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Realtime / Infrastructure Engineer",
    team: "Platform",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Developer Relations",
    team: "Community",
    location: "Remote",
    type: "Full-time",
  },
];

function applyHref(roleTitle: string): string {
  const subject = encodeURIComponent(`Application: ${roleTitle}`);
  return `mailto:careers@reprise.ai?subject=${subject}`;
}

function RoleRow({ role }: { role: Role }) {
  return (
    <StaggerItem>
      <a
        href={applyHref(role.title)}
        className="card-interactive group flex flex-col gap-4 rounded-card border border-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
      >
        <div className="min-w-0">
          <h3 className="text-[19px] font-medium tracking-tight text-ink">
            {role.title}
          </h3>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-pill bg-signal-soft px-3 py-1 text-[13px] font-medium text-signal-deep">
              {role.team}
            </span>
            <span className="inline-flex items-center rounded-pill border border-line px-3 py-1 text-[13px] text-ink-3">
              {role.location}
            </span>
            <span className="inline-flex items-center rounded-pill border border-line px-3 py-1 text-[13px] text-ink-3">
              {role.type}
            </span>
          </div>
        </div>
        <span className="inline-flex flex-none items-center gap-1.5 self-start rounded-pill bg-signal px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-300 group-hover:bg-signal-deep sm:self-auto">
          Apply
          <ArrowUpRight />
        </span>
      </a>
    </StaggerItem>
  );
}

/* ------------------------------------------------------------------ */

export default function Page() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Careers"
        title="Build the memory layer for every meeting."
        blurb="We're a small team teaching software to listen, remember, and carry context across every conversation. Come help."
        ctaHref="#roles"
        ctaLabel="See open roles"
      />

      {/* Why Mytheus / mission */}
      <section className="mx-auto max-w-[1340px] px-6 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <Eyebrow className="text-signal">Why Mytheus</Eyebrow>
          <h2 className="display mt-4 max-w-[20ch] text-[clamp(2rem,4vw,3.2rem)]">
            We&rsquo;re building meetings that remember.
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Reveal delay={80}>
            <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink-3">
              Mytheus is its own meeting platform where every participant gets a
              personal AI agent — one that captures notes, decisions, and actions
              live, then turns shorthand into clean minutes. No copy-paste, no
              forgotten follow-ups, no meeting that vanishes the moment it ends.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink-3">
              What makes it different is memory: agents collaborate across
              meetings, so a decision on Monday becomes context on Friday. We&rsquo;re
              early, deliberate, and obsessed with getting the details right — and
              we&rsquo;d love your help teaching software to truly listen.
            </p>
          </Reveal>
        </div>

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-3">
          <ValueCard
            icon={<StackIcon />}
            title="Own the whole problem"
            body="We're role-agnostic. Everyone ships across the stack — frontend, backend, AI, infra — and owns features end to end, from idea to the hands of real users."
          />
          <ValueCard
            icon={<CraftIcon />}
            title="Calm, deliberate craft"
            body="No thrash, no hype. We move thoughtfully, sweat the details, and build software that feels quiet and trustworthy rather than loud and flashy."
          />
          <ValueCard
            icon={<TrustIcon />}
            title="Memory you can trust"
            body="The agent never writes silently. Every decision and action waits for a person to confirm — because memory only matters if you can trust it."
          />
        </Stagger>
      </section>

      {/* Perks / how we work */}
      <section className="mx-auto max-w-[1340px] px-6 pb-20 sm:px-8 sm:pb-24">
        <Reveal>
          <Eyebrow className="text-signal">How we work</Eyebrow>
          <h2 className="display mt-4 max-w-[18ch] text-[clamp(1.8rem,3.4vw,2.8rem)]">
            A place to do your best work.
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <PerkTile
            title="Remote-friendly"
            body="Work from wherever you do your best thinking. We sync deliberately and default to async, written-first communication."
          />
          <PerkTile
            title="Real ownership"
            body="Small team, big surface. You'll own meaningful pieces of the product and ship them to real users, fast."
          />
          <PerkTile
            title="Learning budget"
            body="An annual stipend for the courses, books, and tools that keep you sharp and growing in your craft."
          />
          <PerkTile
            title="Competitive equity"
            body="Early team, real stake. Everyone shares meaningfully in what we build together."
          />
          <PerkTile
            title="Focus over busywork"
            body="Few meetings, long stretches of deep work, and the calm to actually finish what you start."
          />
          <PerkTile
            title="Quality hardware"
            body="The machine and setup you need to build comfortably — no fighting your tools to get work done."
          />
        </Stagger>
      </section>

      {/* Open roles */}
      <section
        id="roles"
        className="mx-auto max-w-[1340px] scroll-mt-24 px-6 pb-20 sm:px-8 sm:pb-24"
      >
        <Reveal>
          <Eyebrow className="text-signal">Open roles</Eyebrow>
          <h2 className="display mt-4 max-w-[18ch] text-[clamp(1.8rem,3.4vw,2.8rem)]">
            Come build with us.
          </h2>
          <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-ink-3">
            All roles are remote and full-time. Don&rsquo;t fit a box exactly? Apply
            anyway — we care more about how you think than your title.
          </p>
        </Reveal>

        <Stagger className="mt-12 grid gap-4">
          {ROLES.map((role) => (
            <RoleRow key={role.title} role={role} />
          ))}
        </Stagger>
      </section>

      {/* Closing line */}
      <section className="mx-auto max-w-[1340px] px-6 pb-24 sm:px-8 sm:pb-28">
        <Reveal>
          <div className="rounded-[22px] border border-line bg-bg-3 px-8 py-12 text-center sm:px-12 sm:py-14">
            <p className="text-[18px] leading-relaxed text-ink-2">
              Don&apos;t see your role?{" "}
              <a
                href="mailto:careers@reprise.ai?subject=Hello%20from%20a%20future%20Mytheusian"
                className="link-underline font-medium text-signal-deep"
              >
                Email careers@reprise.ai
              </a>
            </p>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
