import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Chip, Section, SectionHead, Stage, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { Faq } from "@/components/company/Faq";

export const metadata: Metadata = { title: "Pricing | Mytheus" };

/* Pricing: the three catalog plans, honest to the business architecture (doc 18 section 3):
   Free, Pro at $25 per seat per month, Enterprise, with the real included minutes, agent
   allowance, residency, SSO/SCIM and SLO values. No invented numbers.

   The recommended plan sits raised on a peach stage; the other two are quiet white cards with
   the same rows in the same order, so the three read across as one comparison. */

type Plan = {
  name: string;
  price: string;
  priceSub: string;
  tagline: string;
  cta: { label: string; href: string };
  recommended?: boolean;
  bullets: string[];
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    priceSub: "for small teams trying it out",
    tagline: "Your own meeting agent, for real meetings, not a demo.",
    cta: { label: "Get started free", href: "/dashboard" },
    bullets: [
      "Up to 5 seats",
      "300 meeting minutes per seat each month",
      "Live notes, decisions, action items and cross-meeting answers",
      "Google Calendar and Slack integrations",
      "Hard usage cap: it stops, it never surprise-bills",
      "Community support, 99.5% availability",
    ],
  },
  {
    name: "Pro",
    price: "$25",
    priceSub: "per seat each month",
    tagline: "The full experience for teams that live in meetings.",
    cta: { label: "Start with Pro", href: "/dashboard" },
    recommended: true,
    bullets: [
      "Up to 100 seats",
      "3,000 meeting minutes per seat each month",
      "20 times the agent allowance of Free",
      "Choose where your data lives: US, EU or AP",
      "Metered overage: keep working past the included usage",
      "Priority support, 99.9% availability",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceSub: "annual contract",
    tagline: "Isolation, identity, and scale for the whole organization.",
    cta: { label: "Talk to the team", href: "/enterprise" },
    bullets: [
      "Unlimited seats, pooled custom usage",
      "SSO (SAML) and SCIM provisioning",
      "Dedicated cell isolation and residency pinning",
      "Jira or Linear integration, your pick",
      "Contractual overage terms",
      "Dedicated support, 99.95% availability",
    ],
  },
];

/* the comparison matrix, values verbatim from the plan catalog. `true` = included, `false` = not */
type Cell = string | boolean;
const MATRIX: { label: string; free: Cell; pro: Cell; ent: Cell }[] = [
  { label: "Price", free: "$0", pro: "$25 per seat each month", ent: "Custom, annual" },
  { label: "Max seats", free: "5", pro: "100", ent: "Unlimited" },
  { label: "Included meeting minutes", free: "300 per seat each month", pro: "3,000 per seat each month", ent: "Pooled, custom" },
  {
    label: "Included agent allowance",
    free: "200k tokens per seat each month",
    pro: "4M tokens per seat each month",
    ent: "Pooled, custom",
  },
  { label: "Included storage", free: "1 GB per team", pro: "50 GB per team", ent: "Custom" },
  { label: "Past the included usage", free: "Hard cap", pro: "Metered overage", ent: "Contractual" },
  { label: "Data residency", free: "US", pro: "US, EU or AP, your choice", ent: "Your choice, plus a dedicated cell" },
  { label: "SSO (SAML) and SCIM", free: false, pro: false, ent: true },
  { label: "Integrations", free: "Calendar and Slack", pro: "Calendar and Slack", ent: "Calendar, Slack, plus Jira or Linear" },
  { label: "Availability SLO", free: "99.5%", pro: "99.9%", ent: "99.95%" },
];

const FAQ = [
  {
    q: "What is the agent allowance?",
    a: (
      <p>
        It is what your agents spend thinking: notes, labels, answers and insights all draw from it. Free includes
        200k tokens per seat each month, Pro includes 4M, and Enterprise pools a custom amount across the organization.
      </p>
    ),
  },
  {
    q: "What happens when we reach the included usage?",
    a: (
      <p>
        Free stops at its cap, so you are never billed by surprise. Pro meters what you use past the included amount
        at published rates, so work never stops mid-meeting. Enterprise follows the overage terms in your contract.
      </p>
    ),
  },
  {
    q: "Can we choose where our data lives?",
    a: (
      <p>
        On Pro you choose US, EU or AP. Free runs in the US. Enterprise adds residency pinning and a dedicated cell
        for isolation.
      </p>
    ),
  },
  {
    q: "Does a bot join our calls on any plan?",
    a: (
      <p>
        No. Mytheus is its own meeting platform, so every participant gets an agent without a bot joining, on every
        plan.
      </p>
    ),
  },
  {
    q: "Is there an offer for students?",
    a: (
      <p>
        Yes. Verified students get Mytheus Pro at no cost.{" "}
        <Link
          href="/students"
          className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-4 hover:decoration-signal"
        >
          Read the student offer
        </Link>
        .
      </p>
    ),
  },
];

function PlanBody({ plan }: { plan: Plan }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[1.6rem] font-medium tracking-[-0.015em] text-ink">{plan.name}</h3>
        {plan.recommended ? <Chip tone="accent">Recommended</Chip> : null}
      </div>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-display text-[3rem] font-medium leading-none tracking-[-0.03em] text-ink">{plan.price}</span>
        <span className="text-[15px] text-ink-3">{plan.priceSub}</span>
      </p>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-3 lg:min-h-[3.2em]">{plan.tagline}</p>
      <Link
        href={plan.cta.href}
        className={`mt-6 inline-flex h-12 w-full items-center justify-center rounded-ctl text-[16px] font-semibold transition-[background-color,box-shadow] duration-150 ${
          plan.recommended
            ? "bg-pill text-pill-on hover:bg-pill-2 hover:shadow-warm-2"
            : "border border-line-2 bg-surface text-ink hover:bg-surface-2"
        }`}
      >
        {plan.cta.label}
      </Link>
      <ul className="mt-7 border-t border-line pt-2">
        {plan.bullets.map((b) => (
          <li key={b} className="flex gap-3 border-b border-line py-3 text-[15px] leading-snug text-ink-2 last:border-b-0">
            <Check aria-hidden weight="bold" className="mt-[3px] h-4 w-4 flex-none text-signal" />
            {b}
          </li>
        ))}
      </ul>
    </>
  );
}

function CellValue({ v, strong }: { v: Cell; strong?: boolean }) {
  if (v === true)
    return (
      <span className="inline-flex items-center gap-2 font-medium text-ink">
        <Check aria-hidden weight="bold" className="h-4 w-4 text-signal" />
        Included
      </span>
    );
  if (v === false)
    return (
      <span className="inline-flex items-center gap-2 text-ink-3">
        <Minus aria-hidden className="h-4 w-4 text-ink-4" />
        Not included
      </span>
    );
  return <span className={strong ? "font-medium text-ink" : "text-ink-2"}>{v}</span>;
}

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            One price per seat. Every seat gets <Loop>an agent.</Loop>
          </>
        }
        blurb="Start free with your team. Move to Pro when the meetings, and the memory, pile up."
        secondaryHref="#compare"
        secondaryLabel="Compare every feature"
      />

      {/* the three plans, read across */}
      <section aria-labelledby="plans-title" className="pb-[clamp(64px,9vw,120px)]">
        <Wrap>
          <h2 id="plans-title" className="sr-only">
            Plans
          </h2>
          <div className="grid items-start gap-5 lg:grid-cols-3 lg:gap-6">
            {PLANS.map((p) =>
              p.recommended ? (
                <Stage key={p.name} glow className="order-first !p-3 sm:!p-4 lg:order-none lg:-mt-6">
                  <div className="rounded-card bg-surface p-6 shadow-warm-3 sm:p-7">
                    <PlanBody plan={p} />
                  </div>
                </Stage>
              ) : (
                <div key={p.name} className="rounded-card border border-line bg-surface p-6 sm:p-7 lg:mt-4">
                  <PlanBody plan={p} />
                </div>
              ),
            )}
          </div>
        </Wrap>
      </section>

      {/* every row, side by side */}
      <Section cross id="compare">
        <Wrap>
          <SectionHead
            title="The plans, side by side."
            lead="Every limit and every included feature, from the same catalog the plans above are built on."
          />
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">
              <caption className="sr-only">Free, Pro and Enterprise plans compared</caption>
              <thead>
                <tr className="bg-surface-2">
                  <th scope="col" className="sticky left-0 bg-surface-2 px-5 py-4 text-[14px] font-semibold text-ink-3">
                    Plan
                  </th>
                  <th scope="col" className="px-5 py-4 font-display text-[1.2rem] font-medium text-ink">
                    Free
                  </th>
                  <th scope="col" className="px-5 py-4">
                    <span className="flex items-center gap-2.5 font-display text-[1.2rem] font-medium text-ink">
                      Pro <Chip tone="accent">Recommended</Chip>
                    </span>
                  </th>
                  <th scope="col" className="px-5 py-4 font-display text-[1.2rem] font-medium text-ink">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th scope="row" className="sticky left-0 bg-surface px-5 py-4 font-semibold text-ink">
                      {row.label}
                    </th>
                    <td className="px-5 py-4">
                      <CellValue v={row.free} />
                    </td>
                    <td className="px-5 py-4">
                      <CellValue v={row.pro} strong />
                    </td>
                    <td className="px-5 py-4">
                      <CellValue v={row.ent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 max-w-[72ch] text-[15px] leading-relaxed text-ink-3">
            The agent allowance is what your agents spend thinking: notes, labels, answers, and insights all draw from
            it. Free stops at its cap so you&rsquo;re never billed by surprise; Pro meters what you use past the
            included amount at published rates, so work never stops mid-meeting.
          </p>
        </Wrap>
      </Section>

      <Section cross id="questions">
        <Wrap>
          <Faq
            title="Questions about plans."
            lead="What teams ask before they pick one: the allowance, the caps, and where the data lives."
            items={FAQ}
          />
        </Wrap>
      </Section>

      <CloseCTA
        title="Start free. Bring the team when it sticks."
        lead="Every seat gets its own agent from the first meeting. Move to Pro when the memory starts to matter."
        secondaryHref="/enterprise"
        secondaryLabel="Talk to the team about Enterprise"
      />
    </>
  );
}
