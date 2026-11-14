import type { Metadata } from "next";
import { CalendarBlank, Coins, Timer, UsersThree } from "@phosphor-icons/react/ssr";
import { Card, CardHead, SectionCard } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/TextLink";
import { isNoCap, planLabel } from "@/lib/plans";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { listMembers } from "@/lib/api/members";
import {
  LevelLabel,
  MeterBar,
  UsageMeter,
  formatNumber,
  formatPercent,
  levelOf,
  periodLabel,
} from "@/components/tenant/UsageMeter";
import { fetchUsage, type UsageOut } from "@/lib/api/usage";

export const metadata: Metadata = { title: "Usage and billing | Mytheus" };

/* Usage and billing, one tab of the Workspace console (admins only). The plan as
   `billing-metering-service` records it (`GET /usage`: the `subscriptions` row joined to `plans`)
   and who is in the workspace (`GET /users`); then usage and the agent budget (Plan 7-9 sections
   3.1 step 8 and 3.4): consumption against the
   plan's included quota per dimension, the agent-token split by model tier, and the 80% / 95%
   alert state. Reads `GET /usage` (`usage_aggregates` + the live `agent_budgets` row, RBAC
   admin). A non-admin is told so; no gateway, a missing route or a billing outage says usage
   is unavailable; any other server error is a real error. No figure here is ever a sample.

   Chart choices: each dimension is one meter (a single magnitude against a limit), so one
   hue, the value printed beside it, and the 80/95% thresholds as ticks. The tier split is a
   single-series bar in the same hue; identity comes from the row label, never colour. Status
   (warning / blocked) is the frozen priority language, always with an icon and words.

   Payments go through Razorpay from the Plans page (`/workspace/billing/plans`); Razorpay emails
   each receipt. A Pay as you go workspace sees its running window here: tokens, their price and
   the deposit, and the last settlement. */

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US");

const pct = formatPercent;
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

type Dimension = { key: string; label: string; unit: string; used: number; included: number | null };
type Tier = { tier: string; purpose: string; tokens: number };
type View = {
  periodLabel: string;
  dimensions: Dimension[];
  tiers: Tier[];
  tokenRatio: number;
  state: string;
  alert80: boolean;
  alert95: boolean;
};

const TIER_PURPOSE: Record<string, string> = {
  haiku: "Relevance checks, and notes while throttled",
  sonnet: "Live notes and extraction",
  opus: "High-stakes reasoning (not used yet)",
};

function liveView(u: UsageOut): View {
  const dim = (name: string) => u.dimensions.find((d) => d.dimension === name);
  const breakdown = dim("agent_token")?.tier_breakdown ?? {};
  return {
    periodLabel: periodLabel(u.period),
    dimensions: [
      // The live budget, not the nightly rollup: it moves with every metered call.
      { key: "agent_tokens", label: "Agent tokens", unit: "tokens", used: u.budget.tokens_consumed, included: u.budget.token_quota },
      {
        key: "meeting_minutes",
        label: "Meeting minutes",
        unit: "minutes",
        used: dim("meeting_minute")?.quantity ?? 0,
        included: u.plan.included_meeting_minutes || null,
      },
      { key: "transcription", label: "Transcription", unit: "minutes", used: Math.round((dim("transcription_second")?.quantity ?? 0) / 60), included: null },
      { key: "storage_gb", label: "Recordings and documents", unit: "GB", used: dim("storage_gb")?.quantity ?? 0, included: null },
    ],
    tiers: ["haiku", "sonnet", "opus"].map((t) => ({
      tier: t[0].toUpperCase() + t.slice(1),
      purpose: TIER_PURPOSE[t],
      tokens: Number(breakdown[t] ?? 0),
    })),
    tokenRatio: u.budget.token_quota ? u.budget.tokens_consumed / u.budget.token_quota : 0,
    state: u.budget.state,
    alert80: u.budget.alert_80_sent,
    alert95: u.budget.alert_95_sent,
  };
}

const STATE_LABEL: Record<string, { text: string; tone: ChipTone }> = {
  ok: { text: "Running", tone: "ok" },
  throttled: { text: "Throttled", tone: "medium" },
  blocked: { text: "Paused", tone: "high" },
};

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/* Payments: what the next charge is, or the Pay as you go window and its last settlement. */
function Payments({ usage }: { usage: UsageOut | null }) {
  const payg = usage?.payg ?? null;
  const last = usage?.last_settlement ?? null;
  const until = usage?.paid_until ? shortDate.format(new Date(usage.paid_until)) : null;
  return (
    <SectionCard
      title="Payments"
      headingId="payments-heading"
      description="Paid through Razorpay, which emails a receipt for each payment. Mytheus never sees your card."
      aside={<LinkButton href="/workspace/billing/plans" size="sm" variant="outline">Plans and credits</LinkButton>}
    >
      {payg ? (
        <div className="px-4 py-4 sm:px-[22px]">
          <p className="text-[15px] font-semibold text-ink">
            This Pay as you go window: {currency.format(payg.cost_cents / 100)} of the {currency.format(payg.deposit_cents / 100)} deposit
          </p>
          <div className="mt-3">
            <MeterBar label="Deposit used" used={payg.cost_cents} included={Math.max(1, payg.deposit_cents)} />
          </div>
          <p className="mt-2 text-[14px] text-ink-3">
            {number.format(payg.tokens)} tokens since {shortDate.format(new Date(payg.window_start))}, at{" "}
            {currency.format(payg.cents_per_million / 100)} per million. Settled on {shortDate.format(new Date(payg.window_end))}: anything
            under the deposit is refunded, anything over is billed here.
          </p>
        </div>
      ) : null}
      {last ? (
        <div className="flex items-start gap-2 px-4 py-3.5 text-[14px] text-ink-2 sm:px-[22px]">
          <CalendarBlank size={16} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
          <span>
            Last Pay as you go month ({shortDate.format(new Date(last.window_end))}): {number.format(last.tokens)} tokens,{" "}
            {currency.format(last.cost_cents / 100)}.{" "}
            {last.balance_cents < 0
              ? last.status === "refunded"
                ? `${currency.format(-last.balance_cents / 100)} refunded.`
                : `${currency.format(-last.balance_cents / 100)} refund on its way.`
              : last.balance_cents > 0
                ? last.status === "paid"
                  ? `${currency.format(last.balance_cents / 100)} balance paid.`
                  : `${currency.format(last.balance_cents / 100)} balance due on the Plans page.`
                : "Exactly the deposit."}
          </span>
        </div>
      ) : null}
      {!payg && !last ? (
        <div className="flex items-center gap-2 px-4 py-3.5 text-[14px] text-ink-3 sm:px-[22px]">
          <CalendarBlank size={16} aria-hidden="true" />
          {until ? `This plan is paid until ${until}; it returns to Free unless bought again.` : "Nothing is charged automatically."}
        </div>
      ) : null}
    </SectionCard>
  );
}

export default async function UsageAndBillingPage() {
  const [result, members] = await Promise.all([fetchUsage(), listMembers()]);

  if (result.kind !== "live") {
    return (
      <div className="flex flex-col gap-5">
        <SectionBar title="Usage and billing" context="The plan, what the workspace has used this period, the agent budget and invoices." />
        {result.kind === "forbidden" ? (
          <Note>Only workspace admins can see the plan, usage and the agent budget.</Note>
        ) : (
          <ErrorState title="The plan and usage could not be loaded" text="Billing did not answer just now. Nothing is charged while it is unavailable." />
        )}
        <Payments usage={null} />
      </div>
    );
  }

  const v = liveView(result.usage);
  const tokenLevel = levelOf(v.tokenRatio);
  const tierTotal = v.tiers.reduce((s, t) => s + t.tokens, 0);
  const tierMax = Math.max(1, ...v.tiers.map((t) => t.tokens));
  const tokens = v.dimensions[0];
  const others = v.dimensions.slice(1);
  const state = STATE_LABEL[v.state] ?? { text: v.state, tone: "neutral" as const };
  const plan = result.usage.plan;

  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Usage and billing"
        context={`This billing period, ${v.periodLabel}. Live captions and transcription keep running even if the agent budget runs out.`}
      />

      <Card as="section" aria-labelledby="plan-heading">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <Chip tone="solid">Current plan</Chip>
            <h2 id="plan-heading" className="display mt-3 text-[30px] text-ink-display">
              {planLabel(plan.code)}
            </h2>
            <p className="mt-1 text-[15px] text-ink-2">
              {plan.code === "payg" ? (
                <>
                  <span className="display text-[22px] text-ink">{currency.format(plan.seat_price_cents / 100)}</span> deposit, settled on use
                </>
              ) : plan.seat_price_cents > 0 ? (
                <>
                  <span className="display text-[22px] text-ink">{currency.format(plan.seat_price_cents / 100)}</span> a month for the workspace
                </>
              ) : (
                "No charge on this plan"
              )}
            </p>
            <div className="mt-4">
              <LinkButton href="/workspace/billing/plans" size="sm">
                {["payg", "unlimited", "enterprise"].includes(plan.code) ? "See plans" : "Upgrade"}
              </LinkButton>
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2 md:flex-col md:items-start">
            {members ? (
              <li className="inline-flex items-center gap-1.5">
                <UsersThree size={17} className="text-ink-3" aria-hidden="true" />
                {members.length} {members.length === 1 ? "member" : "members"} in this workspace
              </li>
            ) : null}
            <li className="inline-flex items-center gap-1.5">
              <Timer size={17} className="text-ink-3" aria-hidden="true" />
              {plan.included_meeting_minutes > 0
                ? `${number.format(plan.included_meeting_minutes)} meeting minutes included`
                : "No meeting minute allowance"}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Coins size={17} className="text-ink-3" aria-hidden="true" />
              {isNoCap(plan.included_agent_tokens)
                ? "No cap on agent tokens"
                : `${number.format(plan.included_agent_tokens)} agent tokens included per month`}
            </li>
          </ul>
        </div>
      </Card>

      {v.state === "blocked" ? (
        <Note tone="error">
          This month&rsquo;s AI allowance is used up, so AI is paused for everyone in the workspace. Captions and transcription
          continue. <TextLink href="/workspace/billing/plans">Buy credits or upgrade</TextLink> to turn it back on now.
        </Note>
      ) : !isNoCap(tokens.included ?? 0) && (v.alert80 || tokenLevel === "warn" || tokenLevel === "critical") ? (
        <Note tone="warning">
          {pct(v.tokenRatio)} of this month&rsquo;s AI tokens are used. AI pauses at 100%;{" "}
          <TextLink href="/workspace/billing/plans">buy credits or upgrade</TextLink> before then.
        </Note>
      ) : null}

      <Card as="section" flush aria-labelledby="budget-heading">
        <CardHead
          id="budget-heading"
          title="Agent token budget"
          description="Checked before every model call, and moves with each one."
          right={<Chip tone={state.tone}>{state.text}</Chip>}
        />
        <div className="px-4 pb-5 pt-1 sm:px-[22px]">
          {tokens.included && !isNoCap(tokens.included) ? (
            <>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="display text-[44px] leading-none tabular-nums text-ink-display">
                  {formatNumber(tokens.used)}
                </span>
                <span className="text-[15px] text-ink-2">
                  of {formatNumber(tokens.included)} tokens, <span className="font-semibold text-ink">{pct(v.tokenRatio)}</span>
                </span>
              </p>
              <div className="mt-4">
                <MeterBar label="Agent tokens" used={tokens.used} included={tokens.included} />
              </div>
              <div className="mt-1">
                <LevelLabel
                  level={tokenLevel}
                  okText={`${formatNumber(Math.max(tokens.included - tokens.used, 0))} tokens left this period`}
                />
              </div>
            </>
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="display text-[44px] leading-none tabular-nums text-ink-display">{formatNumber(tokens.used)}</span>
              <span className="text-[15px] text-ink-2">tokens, no cap on this plan</span>
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <SectionCard
          title="Everything else this period"
          headingLevel={2}
          headingId="dims-heading"
          description="What the workspace has used, next to what the plan includes."
        >
          {others.map((d) => (
            <UsageMeter key={d.key} label={d.label} unit={d.unit} used={d.used} included={d.included} />
          ))}
        </SectionCard>

        <SectionCard
          title="Agent tokens by model"
          headingLevel={2}
          headingId="tiers-heading"
          description={
            tierTotal
              ? `${compact.format(tierTotal)} tokens this period, as of the last nightly rollup.`
              : "No agent tokens in the nightly rollup yet."
          }
        >
          {v.tiers.map((t) => (
            <div key={t.tier} className="px-4 py-4 sm:px-[22px]">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="min-w-0 text-[15px] font-semibold text-ink">{t.tier}</p>
                <p className="shrink-0 text-[14px] tabular-nums text-ink-2">
                  <span className="font-semibold text-ink">{compact.format(t.tokens)}</span>
                  <span className="ml-2 text-ink-3">{tierTotal ? pct(t.tokens / tierTotal) : "0%"}</span>
                </p>
              </div>
              <div
                className="h-2 rounded-full bg-bg-2"
                role="img"
                aria-label={`${t.tier}: ${compact.format(t.tokens)} tokens, ${tierTotal ? pct(t.tokens / tierTotal) : "0%"} of the total`}
              >
                <div
                  className={`h-full rounded-full bg-pill ${t.tokens > 0 ? "min-w-2" : ""}`}
                  style={{ width: `${(t.tokens / tierMax) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[14px] text-ink-3">{t.purpose}</p>
            </div>
          ))}
        </SectionCard>
      </div>

      <Payments usage={result.usage} />
    </div>
  );
}
