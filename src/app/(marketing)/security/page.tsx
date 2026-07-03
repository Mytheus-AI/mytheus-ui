import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageShell } from "@/components/marketing/PageShell";
import { PageHero } from "@/components/marketing/PageHero";
import { Prose } from "@/components/marketing/Prose";
import { PillCTA, IconChip } from "@/components/landing/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/motion";

export const metadata: Metadata = { title: "Security — Mytheus" };

/* ---------------- icons (currentColor, inherit from IconChip) ---------------- */

function LockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="9.5"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}

function TenantIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3.5"
        y="4.5"
        width="7"
        height="15"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="13.5"
        y="4.5"
        width="7"
        height="15"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 7v10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2 2.4"
      />
    </svg>
  );
}

function ShieldKeyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3 5 5.6v5.2c0 4.2 2.9 7.4 7 9.2 4.1-1.8 7-5 7-9.2V5.6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="10.5" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 11.4h3.2m-1.5 0v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ConfirmIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 5.5h11M4 10h7M4 14.5h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="m13.5 16.5 2.4 2.4 4.6-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------------- trust principles ---------------- */

const PRINCIPLES: {
  icon: ReactNode;
  title: string;
  body: string;
}[] = [
  {
    icon: <LockIcon />,
    title: "Encrypted end to end",
    body: "Every meeting and its memory is encrypted in transit and at rest. Nothing crosses the wire or sits on disk in the clear.",
  },
  {
    icon: <TenantIcon />,
    title: "Tenant isolation",
    body: "Each organization's data is separated at every layer. One tenant can never see, reach, or touch another's content.",
  },
  {
    icon: <ShieldKeyIcon />,
    title: "Least-privilege access",
    body: "Access is scoped to what a role needs, nothing more, and privileged actions are logged to an audit trail.",
  },
  {
    icon: <ConfirmIcon />,
    title: "No silent writes",
    body: "The agent persists a decision or action only when you confirm it. Nothing is saved to memory behind your back.",
  },
];

const CONTROL_POINTS: string[] = [
  "You own your meeting content and the memory built from it.",
  "Export or delete your data at any time, on your terms.",
  "We never sell your data, and we never train shared models on it.",
  "No third-party meeting integrations, so the attack surface stays narrow.",
];

export default function Page() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Security"
        title="Security you can hold us to."
        blurb="Mytheus is where your meetings happen and where their memory lives. Protecting both is the job."
      />

      {/* Trust principles */}
      <section className="mx-auto max-w-[1340px] px-6 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <p className="kicker text-signal">How we protect you</p>
          <h2 className="display display-tight mt-4 max-w-[18ch] text-[clamp(1.9rem,4vw,3rem)]">
            Four principles, no exceptions.
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <StaggerItem key={p.title}>
              <div className="card-interactive h-full rounded-card border border-line bg-white p-6">
                <IconChip>{p.icon}</IconChip>
                <h3 className="mt-5 text-[17px] font-semibold text-ink-display">
                  {p.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
                  {p.body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Your data, your control */}
      <section className="mx-auto max-w-[1340px] px-6 pb-20 sm:px-8 sm:pb-24">
        <Reveal>
          <div className="rounded-[22px] border border-line bg-bg-3 p-8 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="kicker text-signal">Ownership</p>
                <h2 className="display display-tight mt-4 text-[clamp(1.8rem,3.6vw,2.6rem)]">
                  Your data, your control.
                </h2>
                <p className="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-ink-2">
                  Memory only matters if you trust who holds it. With Mytheus,
                  that is always you — the controls below are yours, not ours to
                  grant.
                </p>
              </div>
              <ul className="space-y-4">
                {CONTROL_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-signal-soft text-signal-deep"
                      aria-hidden
                    >
                      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                        <path
                          d="m3.5 8.5 2.8 2.8 6.2-6.6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="text-[16px] leading-relaxed text-ink-2">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Practices */}
      <section className="border-t border-line bg-bg-2">
        <div className="mx-auto max-w-[1340px] px-6 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <Prose>
              <p className="kicker text-signal">Our practices</p>
              <h2>Infrastructure &amp; data handling</h2>
              <p>
                Mytheus runs on hardened, reputable cloud infrastructure. Data is
                encrypted in transit with modern TLS and at rest with strong,
                industry-standard ciphers. Production environments are separated
                from development and staging, and backups are encrypted and
                access-controlled. We collect only the data needed to run your
                meetings and build the memory you ask for.
              </p>

              <h2>Access control</h2>
              <p>
                Internal access follows least privilege: engineers receive only
                the access their role requires, protected by single sign-on and
                multi-factor authentication. Privileged operations are logged to
                an audit trail, access is reviewed regularly, and credentials are
                rotated. Within your organization, tenant isolation keeps your
                content separated from every other customer.
              </p>

              <h2>Vulnerability management &amp; monitoring</h2>
              <p>
                We patch dependencies on a regular cadence and track known
                vulnerabilities across our stack. Automated checks run in our
                build pipeline, and we monitor production for anomalous activity
                so we can detect and respond to issues quickly. Security review
                is part of how we ship, not a step bolted on at the end.
              </p>

              <h2>Compliance roadmap</h2>
              <p>
                We are building Mytheus to meet the bar enterprises expect. We
                are <strong>working toward SOC 2 Type II</strong>, and additional
                attestations are on our roadmap as we grow. We will report our
                progress honestly here rather than claim certifications we have
                not yet earned. If your team needs specific documentation, reach
                out and we will share where we are.
              </p>

              <h2>Responsible disclosure</h2>
              <p>
                If you believe you have found a security vulnerability, we want to
                hear from you. Please email{" "}
                <a href="mailto:security@reprise.ai">security@reprise.ai</a> with
                the details and steps to reproduce. We commit to a good-faith
                response, will keep you updated as we investigate, and ask that
                you give us reasonable time to remediate before any public
                disclosure. We will not pursue researchers acting in good faith.
              </p>
            </Prose>
          </Reveal>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1340px] px-6 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <div className="flex flex-col items-start gap-8 rounded-[22px] border border-line bg-bg-3 p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="display display-tight text-[clamp(1.8rem,3.6vw,2.6rem)]">
                  Meet on memory you trust.
                </h2>
                <p className="mt-4 max-w-[48ch] text-[16px] leading-relaxed text-ink-2">
                  Start with security as the default — your meetings, your
                  memory, nothing saved without your say-so.
                </p>
              </div>
              <div className="flex-none">
                <PillCTA href="/dashboard">Get started free</PillCTA>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
