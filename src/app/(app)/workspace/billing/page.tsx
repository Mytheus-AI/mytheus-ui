import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Note, PageHeader, SectionCard, focusPill } from "@/components/settings/primitives";
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

export const metadata: Metadata = { title: "Usage and budget | Mytheus" };

/* Usage and agent budget (Plan 7-9 sections 3.1 step 8 and 3.4): consumption against the
   plan's included quota per dimension, the agent-token split by model tier, and the 80% / 95%
   alert state. Reads `GET /usage` (`usage_aggregates` + the live `agent_budgets` row, RBAC
   admin). A non-admin is told so; no gateway, a missing route or a billing outage says usage
   is unavailable; any other server error is a real error. No figure here is ever a sample.

   Chart choices: each dimension is one meter (a single magnitude against a limit), so one
   hue, the value printed beside it, and the 80/95% thresholds as ticks. The tier split is a
   single-series bar in the same hue; identity comes from the row label, never colour. Status (warning / blocked) is the frozen priority language, always with an
   icon and words. */

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

const STATE_LABEL: Record<string, { text: string; tone: "success" | "medium" | "high" | "default" }> = {
  ok: { text: "Running", tone: "success" },
  throttled: { text: "Throttled", tone: "medium" },
  blocked: { text: "Paused", tone: "high" },
};

export default async function UsagePage() {
  const result = await fetchUsage();

  if (result.kind !== "live") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Usage and budget" description="Workspace usage against the plan, and the agent token budget." />
        <Note tone={result.kind === "forbidden" ? "info" : "warning"}>
          {result.kind === "forbidden"
            ? "Only workspace admins can see usage and the agent budget. Ask an admin for access."
            : "Usage is not available from the server right now. Try again in a few minutes."}
        </Note>
      </div>
    );
  }

  const v = liveView(result.usage);
  const tokenLevel = levelOf(v.tokenRatio);
  const tierTotal = v.tiers.reduce((s, t) => s + t.tokens, 0);
  const tierMax = Math.max(1, ...v.tiers.map((t) => t.tokens));
  const tokens = v.dimensions[0];
  const others = v.dimensions.slice(1);
  const state = STATE_LABEL[v.state] ?? { text: v.state, tone: "default" as const };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usage and budget"
        description={`This billing period, ${v.periodLabel}. Live captions and transcription keep running even if the agent budget runs out.`}
        actions={
          <LinkButton href="/workspace/billing" variant="outline" className={focusPill}>
            Plan and billing
          </LinkButton>
        }
      />

      {v.state === "blocked" ? (
        <Note tone="error">
          Your workspace has used all of its agent tokens for this period. Live notes are paused until the next period;
          transcription and captions continue. Upgrade to keep agents running.
        </Note>
      ) : v.state === "throttled" ? (
        <Note tone="warning">
          Your workspace is past its included agent tokens. Notes continue on the faster, cheaper model until the hard cap.
        </Note>
      ) : v.alert80 || tokenLevel === "warn" || tokenLevel === "critical" ? (
        <Note tone="warning">
          {pct(v.tokenRatio)} of this period&rsquo;s agent tokens are used. Admins were alerted at 80%
          {v.alert95 || tokenLevel === "critical" ? " and 95%" : ""}.
        </Note>
      ) : null}

      <section
        aria-labelledby="budget-heading"
        className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-[18px] sm:px-[22px]">
          <div className="min-w-0">
            <h2 id="budget-heading" className="text-[17px] font-semibold text-ink">
              Agent token budget
            </h2>
            <p className="mt-1 text-[14px] text-ink-3">Checked before every model call, and moves with each one.</p>
          </div>
          <Badge tone={state.tone}>{state.text}</Badge>
        </div>
        <div className="px-4 pb-5 pt-4 sm:px-[22px]">
          {tokens.included ? (
            <>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="display text-[44px] leading-none tabular-nums text-ink-display sm:text-[52px]">
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
              <span className="text-[15px] text-ink-2">tokens, no quota set</span>
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
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
              <p className="mt-1.5 text-[13.5px] text-ink-3">{t.purpose}</p>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}
