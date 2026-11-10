import type { Metadata } from "next";
import { CheckSquareOffset, Clock, Stack } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Section, SectionHead, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { FactList, IconFacts } from "@/components/company/Facts";

export const metadata: Metadata = { title: "Careers | Mytheus" };

const VALUES = [
  {
    icon: <Stack />,
    title: "Own the whole problem",
    body: "We're role-agnostic. Everyone ships across the stack, frontend, backend, AI and infra, and owns features end to end, from idea to the hands of real users.",
  },
  {
    icon: <Clock />,
    title: "Calm, deliberate craft",
    body: "No thrash, no hype. We move thoughtfully, sweat the details, and build software that feels quiet and trustworthy rather than loud and flashy.",
  },
  {
    icon: <CheckSquareOffset />,
    title: "Memory you can trust",
    body: "The agent never writes silently. Every decision and action waits for a person to confirm, because memory only matters if you can trust it.",
  },
];

const PERKS = [
  {
    term: "Remote-friendly",
    detail: "Work from wherever you do your best thinking. We sync deliberately and default to async, written-first communication.",
  },
  {
    term: "Real ownership",
    detail: "Small team, big surface. You'll own meaningful pieces of the product and ship them to real users, fast.",
  },
  {
    term: "Learning budget",
    detail: "An annual stipend for the courses, books, and tools that keep you sharp and growing in your craft.",
  },
  {
    term: "Competitive equity",
    detail: "Early team, real stake. Everyone shares meaningfully in what we build together.",
  },
  {
    term: "Focus over busywork",
    detail: "Few meetings, long stretches of deep work, and the calm to actually finish what you start.",
  },
  {
    term: "Quality hardware",
    detail: "The machine and setup you need to build comfortably, with no fighting your tools to get work done.",
  },
];

type Role = { title: string; team: string; location: string; type: string };

const ROLES: Role[] = [
  { title: "Founding Full-Stack Engineer", team: "Product Engineering", location: "Remote", type: "Full-time" },
  { title: "AI / Agents Engineer", team: "Applied AI", location: "Remote", type: "Full-time" },
  { title: "Realtime / Infrastructure Engineer", team: "Platform", location: "Remote", type: "Full-time" },
  { title: "Product Designer", team: "Design", location: "Remote", type: "Full-time" },
  { title: "Developer Relations", team: "Community", location: "Remote", type: "Full-time" },
];

function applyHref(roleTitle: string): string {
  const subject = encodeURIComponent(`Application: ${roleTitle}`);
  return `mailto:careers@reprise.ai?subject=${subject}`;
}

const ROW_GRID = "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,.6fr)_minmax(0,.6fr)_auto]";

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title={
          <>
            Build the memory layer for <Loop>every meeting.</Loop>
          </>
        }
        blurb="We're a small team teaching software to listen, remember, and carry context across every conversation. Come help."
        ctaHref="#roles"
        ctaLabel="See open roles"
      />

      <Section cross>
        <Wrap>
          <SectionHead
            title="We're building meetings that remember."
            lead="Mytheus is its own meeting platform where every participant gets a personal AI agent: one that captures notes, decisions, and actions live, then turns shorthand into clean minutes."
          />
          <p className="mb-[clamp(40px,5vw,64px)] max-w-[40ch] font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-[1.3] tracking-[-0.012em] text-ink">
            What makes it different is memory: agents collaborate across meetings, so a decision on Monday becomes
            context on Friday. We&rsquo;re early, deliberate, and obsessed with getting the details right.
          </p>
          <IconFacts items={VALUES} cols={3} />
        </Wrap>
      </Section>

      <Section>
        <Wrap>
          <SectionHead
            title="A place to do your best work."
            lead="How the team works day to day, and what we give everyone who joins it."
          />
          <FactList items={PERKS} />
        </Wrap>
      </Section>

      <Section cross id="roles" className="scroll-mt-24">
        <Wrap>
          <SectionHead
            title="Come build with us."
            lead="All roles are remote and full-time. Don't fit a box exactly? Apply anyway: we care more about how you think than your title."
          />
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <div
              aria-hidden
              className={`hidden gap-6 bg-surface-2 px-6 py-3.5 text-[14px] font-semibold text-ink-3 md:grid ${ROW_GRID}`}
            >
              <span>Role</span>
              <span>Team</span>
              <span>Location</span>
              <span>Type</span>
              <span className="w-[120px]" />
            </div>
            <ul>
              {ROLES.map((r) => (
                <li key={r.title} className="border-t border-line first:border-t-0 md:first:border-t">
                  <a
                    href={applyHref(r.title)}
                    className={`group grid gap-x-6 gap-y-1.5 px-6 py-5 transition-colors duration-150 hover:bg-surface-2 md:items-center ${ROW_GRID}`}
                  >
                    <span className="font-display text-[1.4rem] font-medium leading-tight tracking-[-0.015em] text-ink">
                      {r.title}
                    </span>
                    <span className="text-[15.5px] text-ink-2">
                      <span className="sr-only">Team: </span>
                      {r.team}
                    </span>
                    <span className="flex gap-4 text-[15px] text-ink-3 md:contents">
                      <span>
                        <span className="sr-only">Location: </span>
                        {r.location}
                      </span>
                      <span>
                        <span className="sr-only">Type: </span>
                        {r.type}
                      </span>
                    </span>
                    <span className="mt-2 w-[120px] text-[15px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] group-hover:decoration-signal md:mt-0 md:text-right">
                      Apply by email
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-7 text-[17px] text-ink-2">
            Don&apos;t see your role?{" "}
            <a
              href="mailto:careers@reprise.ai?subject=Hello%20from%20a%20future%20Mytheusian"
              className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal"
            >
              Email careers@reprise.ai
            </a>
          </p>
        </Wrap>
      </Section>

      <CloseCTA
        title="Help us teach software to listen."
        lead="Small team, big surface. You'll own meaningful pieces of the product and ship them to real users, fast."
        ctaHref="#roles"
        ctaLabel="See open roles"
        secondaryHref="mailto:careers@reprise.ai"
        secondaryLabel="Email careers@reprise.ai"
        note={null}
      />
    </>
  );
}
