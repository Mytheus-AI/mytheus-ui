import type { Metadata } from "next";
import { CheckSquareOffset, LockKey, Stack, UserFocus } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Chip, Section, SectionHead, Stage, Win, WinBar, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { Flow } from "@/components/company/Flow";
import { CheckList, FactList, IconFacts } from "@/components/company/Facts";

export const metadata: Metadata = { title: "Security | Mytheus" };

const PRINCIPLES = [
  {
    icon: <LockKey />,
    title: "Encrypted end to end",
    body: "Every meeting and its memory is encrypted in transit and at rest. Nothing crosses the wire or sits on disk in the clear.",
  },
  {
    icon: <Stack />,
    title: "Tenant isolation",
    body: "Each organization's data is separated at every layer. One tenant can never see, reach, or touch another's content.",
  },
  {
    icon: <UserFocus />,
    title: "Least-privilege access",
    body: "Access is scoped to what a role needs, nothing more, and privileged actions are logged to an audit trail.",
  },
  {
    icon: <CheckSquareOffset />,
    title: "No silent writes",
    body: "Your Myte persists a decision or action only when you confirm it. Nothing is saved to memory behind your back.",
  },
];

const CONTROL_POINTS = [
  "You own your meeting content and the memory built from it.",
  "Export or delete your data at any time, on your terms.",
  "We never sell your data, and we never train shared models on it.",
  "No third-party meeting integrations, so the attack surface stays narrow.",
];

const linkClass = "font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-4 hover:decoration-signal";

const PRACTICES = [
  {
    id: "infrastructure",
    term: "Infrastructure and data handling",
    detail: (
      <>
        Mytheus runs on hardened, reputable cloud infrastructure. Data is encrypted in transit with modern TLS and at
        rest with strong, industry-standard ciphers. Production environments are separated from development and
        staging, and backups are encrypted and access-controlled. We collect only the data needed to run your
        meetings and build the memory you ask for.
      </>
    ),
  },
  {
    id: "access-control",
    term: "Access control",
    detail: (
      <>
        Internal access follows least privilege: engineers receive only the access their role requires, protected by
        single sign-on and multi-factor authentication. Privileged operations are logged to an audit trail, access is
        reviewed regularly, and credentials are rotated. Within your organization, tenant isolation keeps your content
        separated from every other customer.
      </>
    ),
  },
  {
    id: "vulnerability-management",
    term: "Vulnerability management and monitoring",
    detail: (
      <>
        We patch dependencies on a regular cadence and track known vulnerabilities across our stack. Automated checks
        run in our build pipeline, and we monitor production for anomalous activity so we can detect and respond to
        issues quickly. Security review is part of how we ship, not a step bolted on at the end.
      </>
    ),
  },
  {
    id: "compliance",
    term: "Compliance roadmap",
    detail: (
      <>
        We are building Mytheus to meet the bar enterprises expect. We are{" "}
        <strong className="font-semibold text-ink">working toward SOC 2 Type II</strong>, and additional attestations
        are on our roadmap as we grow. We will report our progress honestly here rather than claim certifications we
        have not yet earned. If your team needs specific documentation, reach out and we will share where we are.
      </>
    ),
  },
  {
    id: "disclosure",
    term: "Responsible disclosure",
    detail: (
      <>
        If you believe you have found a security vulnerability, we want to hear from you. Please email{" "}
        <a href="mailto:security@mytheus.cloud" className={linkClass}>
          security@mytheus.cloud
        </a>{" "}
        with the details and steps to reproduce. We commit to a good-faith response, will keep you updated as we
        investigate, and ask that you give us reasonable time to remediate before any public disclosure. We will not
        pursue researchers acting in good faith.
      </>
    ),
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title={
          <>
            Security you can <Loop>hold us to.</Loop>
          </>
        }
        blurb="Mytheus is where your meetings happen and where their memory lives. Protecting both is the job."
        secondaryHref="#practices"
        secondaryLabel="Read our practices"
      />

      <Section cross>
        <Wrap>
          <SectionHead
            title="Four principles, no exceptions."
            lead="They hold on every plan, for every meeting, from the first one you run."
          />
          <IconFacts items={PRINCIPLES} cols={4} />
        </Wrap>
      </Section>

      {/* the mechanism: how a request reaches your data, and why it cannot reach anyone else's */}
      <Section>
        <Wrap>
          <SectionHead
            title="How a request reaches your data."
            lead="Your organization is decided on our side, from your signed-in session, at every step. The browser never chooses which tenant it reads."
          />
          <Stage>
            <Win>
              <WinBar title="One request, end to end" meta="Your organization only" right={<Chip tone="ok">Encrypted throughout</Chip>} />
              <div className="px-[clamp(20px,3vw,32px)] py-8">
                <Flow
                  steps={[
                    {
                      title: "Your browser",
                      body: "Every request travels encrypted with modern TLS. It carries your session, nothing that picks a tenant.",
                    },
                    {
                      title: "The gateway",
                      body: "It verifies your session and attaches your organization on the server, where the browser cannot change it.",
                    },
                    {
                      title: "Our services",
                      body: "Every read and write is scoped to that organization. One tenant can never reach another's content.",
                    },
                    {
                      title: "Your storage",
                      body: "Your meetings and memory rest encrypted, with encrypted, access-controlled backups.",
                    },
                  ]}
                />
              </div>
            </Win>
          </Stage>
        </Wrap>
      </Section>

      <Section cross>
        <Wrap>
          <div className="grid gap-x-16 gap-y-8 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] md:items-start">
            <div>
              <h2 className="display max-w-[14ch] text-[clamp(2.1rem,4.6vw,3.5rem)]">Your data, your control.</h2>
              <p className="mt-4 max-w-[42ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-ink-3">
                Memory only matters if you trust who holds it. With Mytheus, that is always you: the controls below are
                yours, not ours to grant.
              </p>
            </div>
            <CheckList items={CONTROL_POINTS} />
          </div>
        </Wrap>
      </Section>

      <Section cross id="practices">
        <Wrap>
          <SectionHead
            title="Our practices."
            lead="How we run the service day to day, what we are still working toward, and how to tell us when we got something wrong."
          />
          <FactList items={PRACTICES} />
        </Wrap>
      </Section>

      <CloseCTA
        title="Meet on memory you trust."
        lead="Start with security as the default: your meetings, your memory, nothing saved without your say-so."
        secondaryHref="mailto:security@mytheus.cloud"
        secondaryLabel="Report a vulnerability"
      />
    </>
  );
}
