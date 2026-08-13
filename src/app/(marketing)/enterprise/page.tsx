import { appHref } from "@/lib/marketing/app-url";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { PageHero } from "@/components/marketing/PageHero";
import { PillCTA, IconChip, Eyebrow } from "@/components/landing/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/motion";

export const metadata: Metadata = { title: "Enterprise — Mytheus" };

/* ------------------------------------------------------------------ */
/*  Inline glyphs — stroke uses currentColor so they inherit the chip  */
/*  colour. 24×24, 1.6 stroke, rounded joins to match the brand.       */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string };

function MemoryIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="6" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7.6 7.7 11 15.7m5.4-8-3.4 8M8.2 6h7.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AdminIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 7h9M5 12h14M5 17h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ShieldIcon({ className = "h-5 w-5" }: IconProps) {
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

function KeyIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="8" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m10.6 10.6 7 7m-2.4-.2 1.7-1.7m-3.7-3.7 1.9 1.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="m3.5 8.5 2.8 2.8L12.5 5"
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

function TrustPoint({ title, body }: { title: string; body: string }) {
  return (
    <StaggerItem className="h-full">
      <div className="flex h-full gap-3.5">
        <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-signal-soft text-signal-deep">
          <CheckIcon />
        </span>
        <div>
          <h3 className="text-[15px] font-medium tracking-tight text-ink">
            {title}
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">{body}</p>
        </div>
      </div>
    </StaggerItem>
  );
}

function RolloutStep({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <StaggerItem className="h-full">
      <div className="flex h-full flex-col rounded-card border border-line bg-white p-7">
        <span className="font-mono text-[13px] tracking-[0.18em] text-signal">
          {n}
        </span>
        <h3 className="mt-4 text-[17px] font-medium tracking-tight text-ink">
          {title}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{body}</p>
      </div>
    </StaggerItem>
  );
}

/* ------------------------------------------------------------------ */

export default function Page() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Enterprise"
        title="Mytheus for your whole organization."
        blurb="Give every team a personal meeting agent — with the security, control, and shared memory a large organization needs."
        ctaHref={appHref()}
        ctaLabel="Talk to sales"
      />

      {/* Value props */}
      <section className="mx-auto max-w-[1340px] px-6 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <Eyebrow className="text-signal">Built for scale</Eyebrow>
          <h2 className="display mt-4 max-w-[18ch] text-[clamp(2rem,4vw,3.2rem)]">
            Everything an organization needs to run on Mytheus.
          </h2>
        </Reveal>

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ValueCard
            icon={<MemoryIcon />}
            title="Shared memory across teams"
            body="Agents carry context between meetings and between teams — a decision on Monday becomes context on Friday, org-wide, not siloed per person."
          />
          <ValueCard
            icon={<AdminIcon />}
            title="Admin & roles control"
            body="Central admin console with roles and permissions, so you decide who can create, join, and review what — across every workspace."
          />
          <ValueCard
            icon={<ShieldIcon />}
            title="Security & data residency"
            body="Encryption in transit and at rest, strict per-tenant isolation, and data-residency options so each organization's meetings stay its own."
          />
          <ValueCard
            icon={<KeyIcon />}
            title="SSO & provisioning"
            body="SSO via SAML plus SCIM provisioning — connect your identity provider and deprovision instantly when someone leaves."
          />
        </Stagger>
      </section>

      {/* Security & control band */}
      <section className="mx-auto max-w-[1340px] px-6 pb-20 sm:px-8 sm:pb-24">
        <div className="rounded-[22px] border border-line bg-bg-3 p-8 sm:p-12">
          <Reveal>
            <Eyebrow className="text-signal">Security &amp; control</Eyebrow>
            <h2 className="display mt-4 max-w-[20ch] text-[clamp(1.8rem,3.4vw,2.8rem)]">
              Your meetings stay yours.
            </h2>
            <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-ink-3">
              Mytheus is its own meeting platform — there are no third-party
              meeting tools in the loop, so the data never leaves your tenant for
              someone else&apos;s. The agent never writes silently: every decision
              and action waits for a person to confirm.
            </p>
          </Reveal>

          <Stagger className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            <TrustPoint
              title="Tenant isolation by design"
              body="Every organization's data is partitioned and scoped server-side — never co-mingled and never filtered in the browser."
            />
            <TrustPoint
              title="Encrypted in transit and at rest"
              body="Traffic is encrypted end to end and stored encrypted, with access scoped to the people you provision."
            />
            <TrustPoint
              title="Confirm-before-write"
              body="Agents draft; people decide. Nothing becomes a durable decision or action until a participant confirms it."
            />
            <TrustPoint
              title="Compliance in progress"
              body="We're actively working toward SOC 2, with audit-minded logging and least-privilege access baked in from the start."
            />
          </Stagger>

          <Reveal delay={120}>
            <Link
              href="/security"
              className="link-underline mt-9 inline-flex items-center gap-1.5 text-[15px] font-medium text-signal-deep"
            >
              See our security overview
              <span aria-hidden>→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Rollout */}
      <section className="mx-auto max-w-[1340px] px-6 pb-20 sm:px-8 sm:pb-24">
        <Reveal>
          <Eyebrow className="text-signal">Rollout</Eyebrow>
          <h2 className="display mt-4 max-w-[18ch] text-[clamp(1.8rem,3.4vw,2.8rem)]">
            From pilot to whole organization.
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 sm:grid-cols-3">
          <RolloutStep
            n="01"
            title="Connect your identity"
            body="Wire up SSO and SCIM so the right people are in on day one — and out the moment they leave."
          />
          <RolloutStep
            n="02"
            title="Set roles & guardrails"
            body="Define roles, permissions, and data-residency in the admin console so each team works inside the boundaries you set."
          />
          <RolloutStep
            n="03"
            title="Scale shared memory"
            body="As more teams adopt Mytheus, their agents build on each other's context — turning every meeting into compounding organizational memory."
          />
        </Stagger>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-[1340px] px-6 pb-24 sm:px-8 sm:pb-28">
        <div className="mesh-field grain relative overflow-hidden rounded-[22px] border border-line px-8 py-16 text-center sm:px-12 sm:py-20">
          <Reveal>
            <h2 className="display display-tight mx-auto max-w-[22ch] text-[clamp(2.2rem,5vw,3.8rem)]">
              Bring Mytheus to every team.
            </h2>
            <p className="mx-auto mt-6 max-w-[52ch] text-[18px] leading-relaxed text-ink-3">
              Tell us about your organization and we&apos;ll help you plan a
              secure, org-wide rollout.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <PillCTA href={appHref()}>Talk to sales</PillCTA>
              <a
                href="mailto:enterprise@reprise.ai"
                className="link-underline text-[15px] font-medium text-ink-2"
              >
                enterprise@reprise.ai
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
