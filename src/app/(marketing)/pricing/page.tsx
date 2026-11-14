import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Chip, Section, SectionHead, Stage, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { Faq } from "@/components/company/Faq";

export const metadata: Metadata = { title: "Pricing | Mytheus" };

/* Pricing: the four plans a workspace can buy, verbatim from the billing catalog (migration
   a7c3e9f1b2d4, billing-metering-service): Free, Pro at $25 a month, Ultra at $200 a month, and
   Pay as you go on a $500 deposit. Prices are per workspace, not per seat. Every plan stops at its
   AI allowance (extra credits or a bigger plan turn it back on); Pay as you go has no cap and is
   settled on what was used. No invented numbers.

   The recommended plan sits raised on a peach stage; the others are quiet white cards with the
   same rows in the same order, so the four read across as one comparison. */

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
    priceSub: "forever",
    tagline: "Your own Myte, for real meetings, not a demo.",
    cta: { label: "Get started free", href: "/dashboard" },
    bullets: [
      "10,000 AI tokens a month",
      "300 meeting minutes a month",
      "Live notes, decisions, action items and answers",
      "Hard stop at the allowance: never a surprise bill",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$25",
    priceSub: "a month, whole workspace",
    tagline: "For a team that meets every day.",
    cta: { label: "Start with Pro", href: "/workspace/billing/plans" },
    recommended: true,
    bullets: [
      "200,000 AI tokens a month",
      "3,000 meeting minutes a month",
      "Mytes fill each other's context gaps",
      "Extra credits whenever you need them",
      "Email support",
    ],
  },
  {
    name: "Ultra",
    price: "$200",
    priceSub: "a month, whole workspace",
    tagline: "For a company that runs on its meetings.",
    cta: { label: "Go Ultra", href: "/workspace/billing/plans" },
    bullets: [
      "2,000,000 AI tokens a month",
      "20,000 meeting minutes a month",
      "Proactive conflict and workload alerts",
      "Extra credits whenever you need them",
      "Priority support",
    ],
  },
  {
    name: "Pay as you go",
    price: "$500",
    priceSub: "deposit, settled monthly",
    tagline: "No cap. Pay for what your Mytes actually use.",
    cta: { label: "Pay as you go", href: "/workspace/billing/plans" },
    bullets: [
      "No AI cap, $100 per million tokens",
      "Meetings without a minutes cap",
      "Use less than $500 and the rest is refunded",
      "Use more and the balance is billed at month end",
      "Priority support",
    ],
  },
];

/* the comparison matrix, values verbatim from the plan catalog. `true` = included, `false` = not */
type Cell = string | boolean;
const MATRIX: { label: string; free: Cell; pro: Cell; ultra: Cell; payg: Cell }[] = [
  { label: "Price", free: "$0", pro: "$25 a month", ultra: "$200 a month", payg: "$500 deposit, settled monthly" },
  { label: "AI tokens", free: "10,000 a month", pro: "200,000 a month", ultra: "2,000,000 a month", payg: "No cap, $100 per 1M" },
  { label: "Meeting minutes", free: "300 a month", pro: "3,000 a month", ultra: "20,000 a month", payg: "No cap" },
  { label: "At the allowance", free: "AI pauses", pro: "AI pauses", ultra: "AI pauses", payg: "Keeps running" },
  { label: "Extra credits", free: "$10 per 100,000 tokens", pro: "$10 per 100,000 tokens", ultra: "$10 per 100,000 tokens", payg: "Not needed" },
  { label: "Context-gap answers between Mytes", free: false, pro: true, ultra: true, payg: true },
  { label: "Proactive conflict and workload alerts", free: false, pro: false, ultra: true, payg: true },
  { label: "Admin warnings at 75%, 90% and 95%", free: true, pro: true, ultra: true, payg: true },
  { label: "Support", free: "Community", pro: "Email", ultra: "Priority", payg: "Priority" },
];

const FAQ = [
  {
    q: "What are AI tokens?",
    a: (
      <p>
        They are what your Mytes spend thinking: notes, labels, answers and insights all draw from them. The allowance is
        shared by the whole workspace and resets each month.
      </p>
    ),
  },
  {
    q: "What happens when we reach the allowance?",
    a: (
      <p>
        AI pauses for the workspace, so you are never billed by surprise; captions and transcription keep running. Admins
        are warned at 75%, 90% and 95%, and can buy extra credits or move to a bigger plan to turn AI back on at once.
      </p>
    ),
  },
  {
    q: "How does Pay as you go work?",
    a: (
      <p>
        You pay a $500 deposit and AI runs without a cap for 30 days, priced at $100 per million tokens. If you use less
        than the deposit, the rest is refunded to your card; if you use more, the balance is billed at the end.
      </p>
    ),
  },
  {
    q: "Does a bot join our calls on any plan?",
    a: (
      <p>
        No. Mytheus is its own meeting platform, so every participant gets a Myte without a bot joining, on every
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
            One price per workspace. Everyone gets <Loop>an agent.</Loop>
          </>
        }
        blurb="Start free with your team. Move up when the meetings, and the memory, pile up."
        secondaryHref="#compare"
        secondaryLabel="Compare every feature"
      />

      {/* the four plans, read across */}
      <section aria-labelledby="plans-title" className="pb-[clamp(64px,9vw,120px)]">
        <Wrap>
          <h2 id="plans-title" className="sr-only">
            Plans
          </h2>
          <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            {PLANS.map((p) =>
              p.recommended ? (
                <Stage key={p.name} glow className="!p-3 sm:!p-4 xl:-mt-6">
                  <div className="rounded-card bg-surface p-6 shadow-warm-3 sm:p-7">
                    <PlanBody plan={p} />
                  </div>
                </Stage>
              ) : (
                <div key={p.name} className="rounded-card border border-line bg-surface p-6 sm:p-7 xl:mt-4">
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
            <table className="w-full min-w-[880px] border-collapse text-left text-[15px]">
              <caption className="sr-only">Free, Pro, Ultra and Pay as you go plans compared</caption>
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
                    Ultra
                  </th>
                  <th scope="col" className="px-5 py-4 font-display text-[1.2rem] font-medium text-ink">
                    Pay as you go
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
                      <CellValue v={row.ultra} />
                    </td>
                    <td className="px-5 py-4">
                      <CellValue v={row.payg} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 max-w-[72ch] text-[15px] leading-relaxed text-ink-3">
            AI tokens are what your Mytes spend thinking: notes, labels, answers and insights all draw from them.
            Free, Pro and Ultra stop at their allowance so you&rsquo;re never billed by surprise, and extra credits
            turn AI back on at once; Pay as you go has no cap and is settled on what you used.
          </p>
        </Wrap>
      </Section>

      <Section cross id="questions">
        <Wrap>
          <Faq
            title="Questions about plans."
            lead="What teams ask before they pick one: the allowance, the caps and how Pay as you go settles."
            items={FAQ}
          />
        </Wrap>
      </Section>

      <CloseCTA
        title="Start free. Bring the team when it sticks."
        lead="Everyone gets their own Myte from the first meeting. Move up when the memory starts to matter."
        secondaryHref="/enterprise"
        secondaryLabel="Talk to the team about Enterprise"
      />
    </>
  );
}
