import type { Metadata } from "next";
import { Check } from "@phosphor-icons/react/ssr";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { TextLink } from "@/components/ui/TextLink";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { CreditsCard } from "@/components/billing/CreditsCard";
import { fetchPlans, type PlanOut } from "@/lib/api/billing";
import { fetchUsage } from "@/lib/api/usage";
import { resolveOrgContext } from "@/lib/api/org-context";
import { CUSTOMER_PLANS, PAYG_CENTS_PER_MILLION, PLAN_BLURB, dollars, planLabel, tokensShort } from "@/lib/plans";

export const metadata: Metadata = { title: "Plans | Mytheus" };
export const dynamic = "force-dynamic";

/* Workspace > Usage and billing > Plans: the four plans a workspace can be on, the one it is on
   glowing, and extra credits. Every price and allowance is the server's (`GET /plans`); every
   purchase is priced again by the server and paid through Razorpay. A bought month lasts 30 days
   and returns to Free unless bought again; Pay as you go is a $500 deposit settled at the end of
   its 30 days. Admins only (the workspace layout gates the console). */

const RANK: Record<string, number> = { free: 0, pro: 1, ultra: 2, payg: 3 };
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function priceLine(p: PlanOut) {
  if (p.code === "payg") return { big: dollars(p.seat_price_cents), small: "deposit, 30 days" };
  if (p.seat_price_cents === 0) return { big: "$0", small: "forever" };
  return { big: dollars(p.seat_price_cents), small: "a month" };
}

function features(p: PlanOut): string[] {
  const support = String((p.features as Record<string, unknown>)?.support_tier ?? "community");
  const tokens =
    p.code === "payg"
      ? `No AI cap, ${dollars(PAYG_CENTS_PER_MILLION)} per 1M tokens`
      : `${tokensShort(p.included_agent_tokens)} AI tokens a month`;
  const out = [tokens];
  if (p.included_meeting_minutes > 0) out.push(`${p.included_meeting_minutes.toLocaleString("en-US")} meeting minutes a month`);
  else if (p.code === "payg") out.push("Meetings without a minutes cap");
  if ((p.features as Record<string, unknown>)?.context_gap_agent) out.push("Mytes fill each other's context gaps");
  if ((p.features as Record<string, unknown>)?.proactive_agent) out.push("Proactive conflict and workload alerts");
  out.push(support === "priority" ? "Priority support" : support === "email" ? "Email support" : "Community support");
  return out;
}

export default async function PlansPage() {
  const [plans, usage, ctx] = await Promise.all([fetchPlans(), fetchUsage(), resolveOrgContext()]);
  const prefill = ctx ? { name: ctx.user.name, email: ctx.user.email } : undefined;

  if (!plans || usage.kind !== "live") {
    return (
      <div className="flex flex-col gap-5">
        <SectionBar title="Plans" context="Pick how much AI your workspace can use." />
        {usage.kind === "forbidden" ? (
          <Note>Only workspace admins can change the plan.</Note>
        ) : (
          <ErrorState title="The plans could not be loaded" text="Billing did not answer just now. Nothing was charged." />
        )}
      </div>
    );
  }

  const u = usage.usage;
  const current = u.plan.code;
  const staffSet = current === "unlimited" || current === "enterprise";
  const shown = CUSTOMER_PLANS.map((c) => plans.find((p) => p.code === c)).filter((p): p is PlanOut => !!p);
  const blocked = u.budget.state === "blocked";
  const due = u.balance_due;

  return (
    <div className="flex flex-col gap-6">
      <SectionBar
        title="Plans"
        context="Pick how much AI your workspace can use. A paid month lasts 30 days, then returns to Free unless you buy it again."
        action={<TextLink href="/workspace/billing">Back to usage</TextLink>}
      />

      {staffSet ? (
        <Note>
          Mytheus staff put this workspace on {planLabel(current)}. It has no cap and nothing to pay; ask support before changing it.
        </Note>
      ) : null}

      {due ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-priority-medium bg-surface p-5">
          <div className="min-w-0 max-w-[60ch]">
            <p className="text-[16px] font-semibold text-ink">Your last Pay as you go month used more than the deposit</p>
            <p className="mt-1 text-[14px] text-ink-3">
              {tokensShort(due.tokens)} tokens cost {dollars(due.cost_cents, true)} against a {dollars(due.deposit_cents)} deposit. Pay
              the {dollars(due.balance_cents, true)} balance to change plans again.
            </p>
          </div>
          <CheckoutButton input={{ kind: "settlement", settlement_id: due.id }} prefill={prefill} successMessage="Balance paid. Thank you.">
            Pay {dollars(due.balance_cents, true)}
          </CheckoutButton>
        </div>
      ) : null}

      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4" aria-label="Plans">
        {shown.map((p) => {
          const on = p.code === current;
          const price = priceLine(p);
          const upgrade = (RANK[p.code] ?? 0) > (RANK[current] ?? -1);
          return (
            <li
              key={p.code}
              aria-current={on ? "true" : undefined}
              className={`relative flex flex-col rounded-card border bg-surface p-5 transition-shadow duration-200 sm:p-6 ${
                on
                  ? "border-signal-line shadow-[0_0_0_1px_var(--signal-line),0_0_42px_-6px_var(--signal-glow)]"
                  : "border-line hover:border-line-2"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[19px] font-semibold text-ink">{planLabel(p.code)}</h2>
                {on ? <Chip tone="accent">Current plan</Chip> : p.code === "ultra" ? <Chip tone="outline">Most AI</Chip> : null}
              </div>
              <p className="mt-1 min-h-[2.6em] text-[14px] leading-snug text-ink-3">{PLAN_BLURB[p.code]}</p>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="display text-[36px] leading-none text-ink-display">{price.big}</span>
                <span className="text-[14px] text-ink-3">{price.small}</span>
              </p>
              <ul className="mb-6 mt-5 flex list-none flex-col gap-2.5 p-0">
                {features(p).map((f) => (
                  <li key={f} className="flex gap-2 text-[14px] leading-snug text-ink-2">
                    <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-signal" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {on ? (
                  <p className="text-[13.5px] text-ink-3">
                    {u.paid_until ? `Paid until ${dateFmt.format(new Date(u.paid_until))}` : p.code === "free" ? "Included with every workspace" : "Active"}
                  </p>
                ) : p.code === "free" ? (
                  <p className="text-[13.5px] text-ink-3">Yours again when a paid month ends.</p>
                ) : staffSet || due ? (
                  <p className="text-[13.5px] text-ink-3">{due ? "Pay the balance above first." : "Set by Mytheus staff."}</p>
                ) : (
                  <CheckoutButton
                    input={{ kind: "plan", plan_code: p.code as "pro" | "ultra" | "payg" }}
                    prefill={prefill}
                    variant={upgrade ? "primary" : "outline"}
                    className="w-full"
                    successMessage={`You're on ${planLabel(p.code)}. The new allowance applies now.`}
                  >
                    {p.code === "payg" ? `Pay ${dollars(p.seat_price_cents)} deposit` : `${upgrade ? "Upgrade" : "Switch"} to ${planLabel(p.code)}`}
                  </CheckoutButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {current !== "payg" && !staffSet ? <CreditsCard blocked={blocked} prefill={prefill} /> : null}

      <p className="text-[13px] leading-relaxed text-ink-4">
        Pay as you go: you pay a {dollars(50_000)} deposit, AI runs without a cap for 30 days, and usage is priced at{" "}
        {dollars(PAYG_CENTS_PER_MILLION)} per million tokens. If it comes to less than the deposit, the rest is refunded to your
        card; if more, the balance is due here. Payments are processed by Razorpay; Mytheus never sees your card.
      </p>
    </div>
  );
}
