import type { Metadata } from "next";
import Link from "next/link";
import { Graph, Key, ShieldCheck, SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Chip, Section, SectionHead, Stage, Win, WinBar, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { Flow } from "@/components/company/Flow";
import { FactList, IconFacts } from "@/components/company/Facts";

export const metadata: Metadata = { title: "Enterprise | Mytheus" };

const CONTACT = "mailto:enterprise@reprise.ai";

const VALUES = [
  {
    icon: <Graph />,
    title: "Shared memory across teams",
    body: "Agents carry context between meetings and between teams. A decision on Monday becomes context on Friday, org-wide, not siloed per person.",
  },
  {
    icon: <SlidersHorizontal />,
    title: "Admin and roles control",
    body: "A central admin console with roles and permissions, so you decide who can create, join, and review what, across every workspace.",
  },
  {
    icon: <ShieldCheck />,
    title: "Security and data residency",
    body: "Encryption in transit and at rest, strict per-tenant isolation, and data-residency options so each organization's meetings stay its own.",
  },
  {
    icon: <Key />,
    title: "SSO and provisioning",
    body: "SSO via SAML plus SCIM provisioning. Connect your identity provider and deprovision instantly when someone leaves.",
  },
];

const TRUST = [
  {
    term: "Tenant isolation by design",
    detail: "Every organization's data is partitioned and scoped server-side, never co-mingled and never filtered in the browser.",
  },
  {
    term: "Encrypted in transit and at rest",
    detail: "Traffic is encrypted end to end and stored encrypted, with access scoped to the people you provision.",
  },
  {
    term: "Confirm before write",
    detail: "Agents draft; people decide. Nothing becomes a durable decision or action until a participant confirms it.",
  },
  {
    term: "Compliance in progress",
    detail: "We're actively working toward SOC 2, with audit-minded logging and least-privilege access built in from the start.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Enterprise"
        title={
          <>
            Mytheus for your whole <Loop>organization.</Loop>
          </>
        }
        blurb="Give every team a personal meeting agent, with the security, control, and shared memory a large organization needs."
        ctaHref={CONTACT}
        ctaLabel="Talk to the team"
        secondaryHref="/security"
        secondaryLabel="Read the security overview"
      />

      <Section cross>
        <Wrap>
          <SectionHead
            title="Everything an organization needs to run on Mytheus."
            lead="One meeting platform for every team, with the identity, control and memory that only matter once there are hundreds of people in it."
          />
          <IconFacts items={VALUES} cols={4} />
        </Wrap>
      </Section>

      {/* the mechanism: nothing is written until a person confirms it */}
      <Section cross>
        <Wrap>
          <SectionHead
            title="Your meetings stay yours."
            lead="Mytheus is its own meeting platform, so there are no third-party meeting tools in the loop and the data never leaves your tenant for someone else's. And the agent never writes silently."
          />
          <Stage tone="ochre">
            <Win>
              <WinBar title="Confirm before write" meta="How a decision becomes memory" right={<Chip tone="ok">Nothing saved silently</Chip>} />
              <div className="px-[clamp(20px,3vw,32px)] py-8">
                <Flow
                  steps={[
                    {
                      tag: <Chip tone="accent">Decision</Chip>,
                      title: "Your agent drafts",
                      body: "It files a decision or action the moment it is said in the meeting.",
                    },
                    {
                      title: "You review",
                      body: "Edit or dismiss anything first. A draft is only a suggestion.",
                    },
                    {
                      title: "You confirm",
                      body: "Nothing becomes a durable decision or action until a participant confirms it.",
                    },
                    {
                      tag: <Chip tone="ok">Saved</Chip>,
                      title: "It joins shared memory",
                      body: "Then it is kept in your organization's memory, ready as context for the next meeting.",
                    },
                  ]}
                />
              </div>
            </Win>
          </Stage>
          <FactList items={TRUST} className="mt-[clamp(40px,5vw,64px)]" />
          <p className="mt-7">
            <Link
              href="/security"
              className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal"
            >
              See our security overview
            </Link>
          </p>
        </Wrap>
      </Section>

      <Section>
        <Wrap>
          <SectionHead
            title="From pilot to whole organization."
            lead="Three steps, in the order teams take them. Each one stands on the one before."
          />
          <Flow
            steps={[
              {
                title: "Connect your identity",
                body: "Wire up SSO and SCIM so the right people are in on day one, and out the moment they leave.",
              },
              {
                title: "Set roles and guardrails",
                body: "Define roles, permissions, and data residency in the admin console so each team works inside the boundaries you set.",
              },
              {
                title: "Scale shared memory",
                body: "As more teams adopt Mytheus, their agents build on each other's context, turning every meeting into compounding organizational memory.",
              },
            ]}
          />
        </Wrap>
      </Section>

      <CloseCTA
        title="Bring Mytheus to every team."
        lead="Tell us about your organization and we'll help you plan a secure, org-wide rollout."
        ctaHref={CONTACT}
        ctaLabel="Talk to the team"
        secondaryHref="/pricing"
        secondaryLabel="Compare plans"
        note="Or write to enterprise@reprise.ai."
      />
    </>
  );
}
