import { appHref } from "@/lib/marketing/app-url";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import {
  WordReveal,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/landing/motion";
import { PillCTA, Eyebrow } from "@/components/landing/ui";

export const metadata: Metadata = { title: "Pricing — Mytheus" };

/* Pricing — the three catalog plans, honest to the business architecture
   (doc 18 §3): Free / Pro $25 per seat per month / Enterprise, with the real
   included-minutes, agent-allowance, residency, SSO/SCIM, and SLO values.
   No invented numbers. */

type Plan = {
  name: string;
  price: string;
  priceSub: string;
  tagline: string;
  cta: { label: string; href: string };
  highlight?: boolean;
  bullets: string[];
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    priceSub: "for small teams trying it out",
    tagline: "Your own meeting agent, for real meetings — not a demo.",
    cta: { label: "Get started free", href: appHref() },
    bullets: [
      "Up to 5 seats",
      "300 meeting minutes per seat / month",
      "Live notes, decisions, action items & cross-meeting answers",
      "Google Calendar & Slack integrations",
      "Hard usage cap — it stops, it never surprise-bills",
      "Community support · 99.5% availability",
    ],
  },
  {
    name: "Pro",
    price: "$25",
    priceSub: "per seat / month",
    tagline: "The full experience for teams that live in meetings.",
    cta: { label: "Start with Pro", href: appHref() },
    highlight: true,
    bullets: [
      "Up to 100 seats",
      "3,000 meeting minutes per seat / month",
      "20× the agent allowance of Free",
      "Choose where your data lives (US / EU / AP)",
      "Metered overage — keep working past the included usage",
      "Priority support · 99.9% availability",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceSub: "annual contract",
    tagline: "Isolation, identity, and scale for the whole organization.",
    cta: { label: "Talk to sales", href: "/enterprise" },
    bullets: [
      "Unlimited seats, pooled custom usage",
      "SSO (SAML) & SCIM provisioning",
      "Dedicated cell isolation & residency pinning",
      "Jira or Linear integration, your pick",
      "Contractual overage terms",
      "Dedicated support · 99.95% availability",
    ],
  },
];

/* the comparison matrix — values verbatim from the plan catalog */
const MATRIX: { label: string; free: string; pro: string; ent: string }[] = [
  { label: "Price", free: "$0", pro: "$25 / seat / mo", ent: "Custom (annual)" },
  { label: "Max seats", free: "5", pro: "100", ent: "Unlimited" },
  {
    label: "Included meeting minutes",
    free: "300 / seat / mo",
    pro: "3,000 / seat / mo",
    ent: "Pooled, custom",
  },
  {
    label: "Included agent allowance",
    free: "200k tokens / seat / mo",
    pro: "4M tokens / seat / mo",
    ent: "Pooled, custom",
  },
  { label: "Included storage", free: "1 GB / team", pro: "50 GB / team", ent: "Custom" },
  {
    label: "Past the included usage",
    free: "Hard cap",
    pro: "Metered overage",
    ent: "Contractual",
  },
  { label: "Data residency", free: "US", pro: "US / EU / AP choice", ent: "Choice + dedicated cell" },
  { label: "SSO (SAML) & SCIM", free: "—", pro: "—", ent: "Included" },
  {
    label: "Integrations",
    free: "Calendar + Slack",
    pro: "Calendar + Slack",
    ent: "+ Jira or Linear",
  },
  { label: "Availability SLO", free: "99.5%", pro: "99.9%", ent: "99.95%" },
];

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
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

export default function Page() {
  return (
    <PageShell>
      {/* hero */}
      <section className="mesh-field mesh-anim grain relative isolate overflow-hidden border-b border-line">
        <div className="relative z-10 mx-auto max-w-[1340px] px-6 pb-16 pt-24 text-center sm:px-8 sm:pb-20 sm:pt-28">
          <Reveal>
            <Eyebrow className="text-signal">Pricing</Eyebrow>
          </Reveal>
          <WordReveal
            as="h1"
            text="One price per seat. Every seat gets an"
            accent="agent."
            accentClass="italic text-gradient-signal"
            className="display display-tight mx-auto mt-5 max-w-[24ch] text-balance text-[clamp(2.4rem,5.5vw,4.4rem)]"
            delay={80}
          />
          <Reveal delay={200}>
            <p className="mx-auto mt-6 max-w-[54ch] text-[18px] leading-relaxed text-ink-3">
              Start free with your team. Move to Pro when the meetings — and the
              memory — pile up.
            </p>
          </Reveal>
        </div>
      </section>

      {/* plan cards */}
      <section className="mx-auto max-w-[1340px] px-6 py-16 sm:px-8 sm:py-20">
        <Stagger className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <StaggerItem key={p.name} className="h-full">
              <div
                className={`relative flex h-full flex-col rounded-card border bg-white p-7 sm:p-8 ${
                  p.highlight
                    ? "border-signal/50 shadow-[0_40px_80px_-48px_rgba(159,69,38,0.55)]"
                    : "border-line"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-7 rounded-full bg-signal px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <h2 className="text-[17px] font-medium tracking-tight text-ink">
                  {p.name}
                </h2>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="display text-[2.6rem] leading-none">{p.price}</span>
                  <span className="text-[13px] text-ink-3">{p.priceSub}</span>
                </p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">
                  {p.tagline}
                </p>
                <ul className="mt-6 space-y-3">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-[14px] leading-snug text-ink-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-signal-soft text-signal-deep">
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Link
                    href={p.cta.href}
                    className={`inline-flex w-full items-center justify-center rounded-pill px-6 py-3.5 text-[15px] font-medium transition-[background-color,transform] duration-300 hover:-translate-y-0.5 ${
                      p.highlight
                        ? "bg-signal text-white hover:bg-signal-deep"
                        : "border border-line-2 text-ink hover:border-signal hover:text-signal-deep"
                    }`}
                  >
                    {p.cta.label}
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* comparison matrix */}
      <section className="mx-auto max-w-[1340px] px-6 pb-16 sm:px-8 sm:pb-20">
        <Reveal>
          <Eyebrow className="text-signal">Compare</Eyebrow>
          <h2 className="display mt-4 max-w-[20ch] text-[clamp(1.8rem,3.4vw,2.8rem)]">
            The plans, side by side.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-10 overflow-x-auto rounded-card border border-line bg-white">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-bg-2/60">
                  <th className="px-5 py-4 text-[13px] font-medium text-ink-3">Plan</th>
                  <th className="px-5 py-4 text-[14px] font-medium text-ink">Free</th>
                  <th className="px-5 py-4 text-[14px] font-semibold text-signal-deep">Pro</th>
                  <th className="px-5 py-4 text-[14px] font-medium text-ink">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i < MATRIX.length - 1 ? "border-b border-line" : ""}
                  >
                    <th scope="row" className="px-5 py-3.5 text-[13.5px] font-medium text-ink-2">
                      {row.label}
                    </th>
                    <td className="px-5 py-3.5 text-[13.5px] text-ink-3">{row.free}</td>
                    <td className="px-5 py-3.5 text-[13.5px] font-medium text-ink">{row.pro}</td>
                    <td className="px-5 py-3.5 text-[13.5px] text-ink-3">{row.ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-5 max-w-[76ch] text-[13.5px] leading-relaxed text-ink-3">
            The agent allowance is what your agents spend thinking — notes,
            labels, answers, and insights all draw from it. Free stops at its cap
            so you&rsquo;re never billed by surprise; Pro meters what you use past the
            included amount at published rates, so work never stops mid-meeting.
          </p>
        </Reveal>
      </section>

      {/* closing CTA */}
      <section className="mx-auto max-w-[1340px] px-6 pb-24 sm:px-8 sm:pb-28">
        <div className="mesh-field grain relative overflow-hidden rounded-[22px] border border-line px-8 py-16 text-center sm:px-12 sm:py-20">
          <Reveal>
            <h2 className="display display-tight mx-auto max-w-[22ch] text-[clamp(2.2rem,5vw,3.8rem)]">
              Start free. Bring the team when it sticks.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <PillCTA href={appHref()}>Get started free</PillCTA>
              <Link
                href="/enterprise"
                className="link-underline text-[15px] font-medium text-ink-2"
              >
                Talk to sales about Enterprise
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
