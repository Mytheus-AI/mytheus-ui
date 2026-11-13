import type { Metadata } from "next";
import { CheckSquareOffset, Clock, Stack } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Chip, Section, SectionHead, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { FactList, IconFacts } from "@/components/company/Facts";
import { Faq } from "@/components/company/Faq";
import { Flow } from "@/components/company/Flow";

export const metadata: Metadata = {
  title: "Careers | Mytheus",
  description:
    "Mytheus is built by a team of four. How we work, the stack you would work in, where we could use you, and how to get in touch.",
};

/* Careers, said plainly: who we are (four people), how we work, the stack, the areas where
   another pair of hands would change things, how a conversation with us goes, and the questions
   people ask first. Nothing here promises pay, perks or headcount we do not have. */

const EMAIL = "careers@mytheus.cloud";

const VALUES = [
  {
    icon: <Stack />,
    title: "Own the whole problem",
    body: "Nobody here has a lane. Each of us takes a feature from the first sketch to the screen a person uses, across frontend, backend, realtime and the agents.",
  },
  {
    icon: <Clock />,
    title: "Calm, deliberate craft",
    body: "We would rather ship one thing that feels finished than three that almost work. Every state is designed: loading, empty, failed, offline.",
  },
  {
    icon: <CheckSquareOffset />,
    title: "Memory you can trust",
    body: "A Myte never writes silently. Every decision and action waits for a person to confirm it, and that rule shapes the code as much as the product.",
  },
];

const PRACTICES = [
  {
    term: "Remote and written first",
    detail: "We work from different places and keep decisions in writing, so nobody has to have been in the room. Yes, we run our own meetings in Mytheus.",
  },
  {
    term: "Short sprints that ship",
    detail: "Work is planned in small bands with a clear finish line. At the end of each one something real is running, and what was built, checked and changed is written down.",
  },
  {
    term: "Names before code",
    detail: "Every service, event and table is named in one shared set of architecture documents before anyone builds it. It sounds slow. It is why every repository still agrees with the others.",
  },
  {
    term: "Reviewed, tested, accessible",
    detail: "Changes go through review. Types, lint, unit tests, a production build and keyboard and contrast checks run on every one. Accessibility is a gate here, not a follow-up.",
  },
  {
    term: "Room to go deep",
    detail: "Few standing meetings and long stretches without interruption. If you need half a day to understand a problem properly, take it.",
  },
];

const STACK: { area: string; tools: string[] }[] = [
  { area: "Web", tools: ["Next.js 14", "React Server Components", "TypeScript", "Tailwind CSS", "Clerk"] },
  { area: "Realtime", tools: ["LiveKit", "Socket.io", "Live transcription", "Redis"] },
  { area: "Intelligence", tools: ["Per-person agents", "Retrieval with citations", "Vector search", "Knowledge graph"] },
  { area: "Data and events", tools: ["Postgres", "Redpanda", "Avro schemas", "OpenAPI contracts"] },
  { area: "Mobile", tools: ["React Native", "Expo"] },
];

type Area = { title: string; focus: string; work: string };

const AREAS: Area[] = [
  {
    title: "Frontend engineer",
    focus: "Web app",
    work: "The meeting room, the agent sidebar and the screens around them. Server components first, small client islands, both themes.",
  },
  {
    title: "Realtime engineer",
    focus: "Live room",
    work: "Captions in under two seconds, reconnection that loses nothing, and media that holds up on a bad connection.",
  },
  {
    title: "Applied AI engineer",
    focus: "Mytes",
    work: "How a Myte decides what is worth keeping, grounds an answer in sources, and knows when to ask a person.",
  },
  {
    title: "Product designer",
    focus: "Design",
    work: "A quiet interface for a busy hour. One line, a small set of tokens, and every state drawn before it is built.",
  },
  {
    title: "Mobile engineer",
    focus: "iOS and Android",
    work: "The same meetings and memory on a phone, including recording a meeting that happens in person.",
  },
];

function applyHref(subject: string): string {
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`;
}

const ROW_GRID = "md:grid-cols-[minmax(0,1fr)_minmax(0,.55fr)_minmax(0,1.7fr)_auto]";
const LINK = "font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal";

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
        blurb="Mytheus is built by four people. We are small on purpose, and we are open to working with people who care about the same problem."
        ctaHref="#areas"
        ctaLabel="See where we could use you"
        secondaryHref={applyHref("Hello from a future Mytheus builder")}
        secondaryLabel="Write to us"
      />

      <Section cross>
        <Wrap>
          <SectionHead
            title="We are building meetings that remember."
            lead="Mytheus is its own meeting platform where every participant gets a Myte: a personal AI agent that keeps notes, decisions and actions live, then carries them into the next meeting."
          />
          <p className="mb-[clamp(40px,5vw,64px)] max-w-[40ch] font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-[1.3] tracking-[-0.012em] text-ink">
            The hard part is not transcription. It is memory people can trust: a decision made on Monday that turns up
            as context on Friday, with its source attached.
          </p>
          <IconFacts items={VALUES} cols={3} />
        </Wrap>
      </Section>

      <Section>
        <Wrap>
          <SectionHead title="How we work." lead="No perks list. This is what a normal week with us is actually like." />
          <FactList items={PRACTICES} />
        </Wrap>
      </Section>

      <Section cross>
        <Wrap>
          <SectionHead
            title="The stack you would work in."
            lead="One product across a web app, a mobile app, a realtime tier and the services behind them. You would touch more than one of these."
          />
          <dl className="border-b border-line-2">
            {STACK.map((s) => (
              <div
                key={s.area}
                className="grid gap-x-12 gap-y-3 border-t border-line-2 py-5 md:grid-cols-[minmax(0,.75fr)_minmax(0,1.5fr)] md:items-center"
              >
                <dt className="font-display text-[1.35rem] font-medium leading-snug tracking-[-0.012em] text-ink">{s.area}</dt>
                <dd className="flex flex-wrap gap-2">
                  {s.tools.map((t) => (
                    <Chip key={t} className="!text-[14px]">
                      {t}
                    </Chip>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Wrap>
      </Section>

      <Section id="areas" className="scroll-mt-24">
        <Wrap>
          <SectionHead
            title="Where we could use you."
            lead="These are the parts of Mytheus where one more good person would change what we can ship. All of them are remote. If you fit between two, say so."
          />
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <div aria-hidden className={`hidden gap-6 bg-surface-2 px-6 py-3.5 text-[14px] font-semibold text-ink-3 md:grid ${ROW_GRID}`}>
              <span>Role</span>
              <span>Area</span>
              <span>What you would work on</span>
              <span className="w-[110px]" />
            </div>
            <ul>
              {AREAS.map((r) => (
                <li key={r.title} className="border-t border-line first:border-t-0 md:first:border-t">
                  <a
                    href={applyHref(`Working with Mytheus: ${r.title}`)}
                    className={`group grid gap-x-6 gap-y-1.5 px-6 py-5 transition-colors duration-150 hover:bg-surface-2 md:items-center ${ROW_GRID}`}
                  >
                    <span className="font-display text-[1.4rem] font-medium leading-tight tracking-[-0.015em] text-ink">{r.title}</span>
                    <span className="text-[15.5px] text-ink-2">
                      <span className="sr-only">Area: </span>
                      {r.focus}
                    </span>
                    <span className="max-w-[52ch] text-[15.5px] leading-relaxed text-ink-3">{r.work}</span>
                    <span className="mt-2 w-[110px] text-[15px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] group-hover:decoration-signal md:mt-0 md:text-right">
                      Write to us
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-7 max-w-[62ch] text-[17px] leading-relaxed text-ink-2">
            Not on the list? If you have built something you are proud of and want to point it at meetings,{" "}
            <a href={applyHref("Hello from a future Mytheus builder")} className={LINK}>
              email {EMAIL}
            </a>
            .
          </p>
        </Wrap>
      </Section>

      <Section cross>
        <Wrap>
          <SectionHead
            title="How a conversation with us goes."
            lead="Four steps, no puzzles, and an answer either way."
          />
          <Flow
            steps={[
              {
                title: "Write to us",
                body: "A few lines on what you want to work on, and a link to something you made. No cover letter, no form.",
              },
              {
                title: "A first call",
                body: "Thirty minutes with two of us, in a Mytheus room. You ask as much as we do.",
              },
              {
                title: "Work on something real",
                body: "A small, scoped piece of the actual product, done together, so both sides see how it feels.",
              },
              {
                title: "A straight answer",
                body: "We tell you where we stand within a week, and why, whichever way it goes.",
              },
            ]}
          />
        </Wrap>
      </Section>

      <Section>
        <Wrap>
          <Faq
            title="Before you write."
            lead="The questions people ask us first."
            items={[
              {
                q: "How big is the team?",
                a: (
                  <>
                    Four people: Sushan Shetty, Samar Rihan, Shaun Marvell Rodrigues and Yash V Maurya. You can meet us on
                    the{" "}
                    <a href="/about" className={LINK}>
                      About page
                    </a>
                    .
                  </>
                ),
              },
              {
                q: "Are these full-time, salaried jobs?",
                a: "Not today. We are a small team without outside funding, so work with us starts as a collaboration on a defined piece of the product. We will tell you exactly what we can and cannot offer before you spend any time on it.",
              },
              {
                q: "Do I need experience with meeting software or AI agents?",
                a: "No. We care more about how you think through a problem and how carefully you finish things. The domain can be learned; the care is harder to teach.",
              },
              {
                q: "I am a student. Can I still write?",
                a: "Yes. Tell us what you have built, in or out of class, and how much time you realistically have. Honest estimates help both of us.",
              },
              {
                q: "Where are you based, and does it matter?",
                a: "We work remotely and mostly in writing, so location matters less than some overlap in working hours for calls.",
              },
            ]}
          />
        </Wrap>
      </Section>

      <CloseCTA
        title="Help us teach software to remember."
        lead="Small team, large surface. Tell us what you would want to build first."
        ctaHref={applyHref("Hello from a future Mytheus builder")}
        ctaLabel="Write to us"
        secondaryHref="/about"
        secondaryLabel="Meet the team"
        note={null}
      />
    </>
  );
}
