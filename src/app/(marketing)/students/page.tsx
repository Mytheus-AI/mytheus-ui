import type { Metadata } from "next";
import { Infinity as InfinityIcon, NotePencil, Robot } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Section, SectionHead, Stage, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { CheckList, FactList, IconFacts } from "@/components/company/Facts";

export const metadata: Metadata = { title: "Students | Mytheus" };

const PERKS = [
  {
    icon: <InfinityIcon />,
    title: "Unlimited meeting memory",
    body: "Every lecture, study group, and standup stays searchable. Your agent carries context from one session into the next, all term long.",
  },
  {
    icon: <Robot />,
    title: "Your personal agent everywhere",
    body: "A dedicated agent in every class and project standup, capturing decisions and action items live, and never writing anything without your confirmation.",
  },
  {
    icon: <NotePencil />,
    title: "Shorthand into clean notes",
    body: "Your rough scribbles become tidy, structured minutes you can actually study from: decisions, owners, and next steps laid out clearly.",
  },
];

const OFFER = [
  { term: "What you get", detail: "Mytheus Pro, the full meeting agent. No trial clock, no feature gates." },
  { term: "What it costs", detail: "Nothing, for as long as you're enrolled." },
  { term: "How to get it", detail: "Enter your school email and open the verification link we send. It takes under a minute." },
  { term: "How to keep it", detail: "Renew your verification once each academic year to stay on Pro." },
];

const ELIGIBILITY = [
  "Currently enrolled at an accredited school, college, or university.",
  "A valid school email (.edu or your institution's email address).",
  "Renew your verification once each academic year to stay on Pro.",
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Students"
        title={
          <>
            Mytheus is free <Loop>for students.</Loop>
          </>
        }
        blurb="Verified students get Mytheus Pro at no cost: your personal meeting agent for lectures, study groups, and project standups."
        ctaHref="/students/verify"
        ctaLabel="Verify your status"
        secondaryHref="#eligibility"
        secondaryLabel="Check if you qualify"
      />

      <Section cross>
        <Wrap>
          <SectionHead
            title="Mytheus Pro, on the house."
            lead="The full meeting agent, with no trial clock and no feature gates. Everything you need to stay on top of every class and project."
          />
          <IconFacts items={PERKS} cols={3} />
        </Wrap>
      </Section>

      <Section>
        <Wrap>
          <SectionHead title="The offer, plainly." lead="Four things to know before you verify." />
          <FactList items={OFFER} />
        </Wrap>
      </Section>

      <Section cross id="eligibility" className="scroll-mt-24">
        <Wrap>
          <div className="grid gap-x-16 gap-y-8 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] md:items-start">
            <div>
              <h2 className="display max-w-[14ch] text-[clamp(2.1rem,4.6vw,3.5rem)]">Quick to check, free to keep.</h2>
              <p className="mt-4 max-w-[42ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-ink-3">
                If you&apos;re actively studying, you almost certainly qualify. Here&apos;s what we look for.
              </p>
            </div>
            <Stage tone="ochre" className="!p-[clamp(12px,3vw,28px)]">
              <div className="rounded-card bg-surface px-6 py-2 shadow-warm-2">
                <CheckList items={ELIGIBILITY} className="!border-b-0 [&>li:first-child]:border-t-0" />
              </div>
            </Stage>
          </div>
        </Wrap>
      </Section>

      <CloseCTA
        title="Ready to put Mytheus to work?"
        lead="Confirm you're a student and your Pro plan unlocks right away."
        ctaHref="/students/verify"
        ctaLabel="Verify your status"
        secondaryHref="/pricing"
        secondaryLabel="See what Pro includes"
        note="Takes under a minute."
      />
    </>
  );
}
