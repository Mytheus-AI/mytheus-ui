import type { Metadata } from "next";
import { CheckCircle, Warning, WarningOctagon } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { Note, PageHeader, SectionCard } from "@/components/settings/primitives";
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

const WARN = 0.8;
const CRITICAL = 0.95;

const nf = (v: number) => (Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 1 }));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

type Level = "ok" | "warn" | "critical" | "over";
const levelOf = (ratio: number): Level => (ratio >= 1 ? "over" : ratio >= CRITICAL ? "critical" : ratio >= WARN ? "warn" : "ok");

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
  const [y, m] = u.period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  return {
    periodLabel: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(start),
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

function StatusLabel({ level }: { level: Level }) {
  if (level === "ok")
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-3">
        <CheckCircle size={15} weight="fill" aria-hidden />
        Within plan
      </span>
    );
  const Icon = level === "warn" ? Warning : WarningOctagon;
  const cls = level === "warn" ? "text-priority-medium" : "text-priority-high";
  const text = level === "warn" ? "Past 80%" : level === "critical" ? "Past 95%" : "Over quota";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${cls}`}>
      <Icon size={15} weight="fill" aria-hidden />
      {text}
    </span>
  );
}

function Meter({ d }: { d: Dimension }) {
  if (d.included === null) {
    return (
      <div className="px-4 py-5 sm:px-[22px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[14.5px] font-semibold text-ink">{d.label}</p>
          <p className="text-[13.5px] tabular-nums text-ink-2">
            <span className="font-semibold text-ink">{nf(d.used)}</span> {d.unit}
            <span className="ml-2 text-ink-3">no plan limit</span>
          </p>
        </div>
      </div>
    );
  }
  const ratio = d.included ? d.used / d.included : 0;
  const level = levelOf(ratio);
  return (
    <div className="px-4 py-5 sm:px-[22px]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[14.5px] font-semibold text-ink">{d.label}</p>
        <p className="text-[13.5px] tabular-nums text-ink-2">
          <span className="font-semibold text-ink">{nf(d.used)}</span> of {nf(d.included)} {d.unit}
          <span className="ml-2 text-ink-3">{pct(ratio)}</span>
        </p>
      </div>
      <div
        className="relative h-2.5 rounded-full bg-bg-2"
        role="meter"
        aria-label={`${d.label} used`}
        aria-valuemin={0}
        aria-valuemax={d.included}
        aria-valuenow={d.used}
        title={`${d.label}: ${nf(d.used)} of ${nf(d.included)} ${d.unit} (${pct(ratio)})`}
      >
        <div className="h-full rounded-full bg-signal" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        {/* threshold ticks, with a surface ring so they read over the fill */}
        {[WARN, CRITICAL].map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute -top-1 h-[18px] w-[2px] rounded-full bg-ink-3 ring-2 ring-[var(--surface)]"
            style={{ left: `${t * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <StatusLabel level={level} />
        <span className="text-[12px] text-ink-3">Ticks mark 80% and 95%</span>
      </div>
    </div>
  );
}

export default async function UsagePage() {
  const result = await fetchUsage();

  if (result.kind !== "live") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Usage and budget" description="Workspace usage against the plan." />
        <Note>
          {result.kind === "forbidden"
            ? "Only workspace admins can see usage and the agent budget. Ask an admin for access."
            : "Usage is not available from the server right now. Try again later."}
        </Note>
      </div>
    );
  }

  const v = liveView(result.usage);
  const tokenLevel = levelOf(v.tokenRatio);
  const tierTotal = v.tiers.reduce((s, t) => s + t.tokens, 0);
  const tierMax = Math.max(1, ...v.tiers.map((t) => t.tokens));

  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Usage and budget"
        description={`This billing period, ${v.periodLabel}. Live captions and transcription keep running even if the agent budget runs out.`}
        actions={<LinkButton href="/billing" variant="outline">Plan and billing</LinkButton>}
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

      <SectionCard title="Against your plan" description="What the workspace has used, next to what the plan includes.">
        {v.dimensions.map((d) => (
          <Meter key={d.key} d={d} />
        ))}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <SectionCard
          title="Agent tokens by model"
          description={
            tierTotal
              ? `${compact.format(tierTotal)} tokens this period, as of the last nightly rollup.`
              : "No agent tokens in the nightly rollup yet."
          }
        >
          {v.tiers.map((t) => (
            <div key={t.tier} className="px-4 py-4 sm:px-[22px]">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-[14px]">
                  <span className="font-semibold text-ink">{t.tier}</span>
                  <span className="ml-2 text-ink-3">{t.purpose}</span>
                </p>
                <p className="shrink-0 text-[13.5px] tabular-nums text-ink-2">
                  {compact.format(t.tokens)} <span className="text-ink-3">&middot; {tierTotal ? pct(t.tokens / tierTotal) : "0%"}</span>
                </p>
              </div>
              <div className="h-2 rounded-full bg-bg-2" title={`${t.tier}: ${compact.format(t.tokens)} tokens`}>
                <div className="h-full rounded-full bg-signal" style={{ width: `${(t.tokens / tierMax) * 100}%` }} />
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Agent budget" description="What the agents check before every model call.">
          <div className="px-4 py-5 text-[13.5px] text-ink-2 sm:px-[22px]">
            <p>
              State: <span className="font-semibold capitalize text-ink">{v.state}</span>
            </p>
            <p className="mt-1 text-ink-3">A day-by-day breakdown is not served yet. The token meter above moves with every metered call.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
