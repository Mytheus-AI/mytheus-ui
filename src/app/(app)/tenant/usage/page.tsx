import type { Metadata } from "next";
import { CaretDown, CheckCircle, Table, Warning, WarningOctagon } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { Note, PageHeader, SectionCard } from "@/components/settings/primitives";
import { thClass } from "@/components/admin/StatCard";
import { resolveOrgContext } from "@/lib/api/org-context";
import { mockUsage, type UsageDimension } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Usage and budget | Mytheus" };

/* Usage and agent budget (Plan 7-9 sections 3.1 step 8 and 3.4): consumption against the
   plan's included quota per dimension, the agent-token split by model tier, and the 80% / 95%
   alert state. Reads `/usage` (`usage_aggregates` + `agent_budgets`) once
   `billing-metering-service` serves it; mock until then.

   Chart choices: each dimension is one meter (a single magnitude against a limit), so one
   hue, the value printed beside it, and the 80/95% thresholds as ticks. The tier split and
   the daily burn are single-series bars in the same hue; identity comes from the row label,
   never colour. Status (warning / blocked) is the frozen priority language, always with an
   icon and words. */

const WARN = 0.8;
const CRITICAL = 0.95;

const nf = (v: number) => (Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 1 }));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

type Level = "ok" | "warn" | "critical" | "over";
const levelOf = (ratio: number): Level => (ratio >= 1 ? "over" : ratio >= CRITICAL ? "critical" : ratio >= WARN ? "warn" : "ok");

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

function Meter({ d }: { d: UsageDimension }) {
  const ratio = d.used / d.included;
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
  const ctx = await resolveOrgContext();
  const plan = ctx?.org.plan ?? "starter";
  const tokens = mockUsage.dimensions.find((d) => d.key === "agent_tokens");
  const tokenRatio = tokens ? tokens.used / tokens.included : 0;
  const tokenLevel = levelOf(tokenRatio);
  const blocked = plan === "starter" && tokenRatio >= 1;

  const tierTotal = mockUsage.tiers.reduce((s, t) => s + t.tokensM, 0);
  const tierMax = Math.max(...mockUsage.tiers.map((t) => t.tokensM));
  const dailyMax = Math.max(...mockUsage.daily);
  const periodStart = new Date(`${mockUsage.period.start}T00:00:00Z`);
  const dayLabel = (i: number) => day.format(new Date(periodStart.getTime() + i * 86_400_000));

  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Usage and budget"
        description={`This billing period, ${day.format(periodStart)} to ${day.format(new Date(`${mockUsage.period.end}T00:00:00Z`))}. Live captions and transcription keep running even if the agent budget runs out.`}
        actions={<LinkButton href="/billing" variant="outline">Plan and billing</LinkButton>}
      />

      {blocked ? (
        <Note tone="error">
          Your workspace has used all of its included agent tokens. Agents are paused until the next period; transcription and
          captions continue. Upgrade to keep agents running.
        </Note>
      ) : tokenLevel === "warn" || tokenLevel === "critical" ? (
        <Note tone="warning">
          {pct(tokenRatio)} of this period&rsquo;s agent tokens are used. Admins were alerted at 80%
          {tokenLevel === "critical" ? " and 95%" : ""}.
        </Note>
      ) : null}

      <SectionCard title="Against your plan" description="What the workspace has used, next to what the plan includes.">
        {mockUsage.dimensions.map((d) => (
          <Meter key={d.key} d={d} />
        ))}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <SectionCard title="Agent tokens by model" description={`${nf(tierTotal)}M tokens this period.`}>
          {mockUsage.tiers.map((t) => (
            <div key={t.tier} className="px-4 py-4 sm:px-[22px]">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-[14px]">
                  <span className="font-semibold text-ink">{t.tier}</span>
                  <span className="ml-2 text-ink-3">{t.purpose}</span>
                </p>
                <p className="shrink-0 text-[13.5px] tabular-nums text-ink-2">
                  {nf(t.tokensM)}M <span className="text-ink-3">&middot; {pct(t.tokensM / tierTotal)}</span>
                </p>
              </div>
              <div className="h-2 rounded-full bg-bg-2" title={`${t.tier}: ${nf(t.tokensM)}M tokens (${pct(t.tokensM / tierTotal)})`}>
                <div className="h-full rounded-full bg-signal" style={{ width: `${(t.tokensM / tierMax) * 100}%` }} />
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Daily agent tokens" description="Millions of tokens per day. Weekends dip.">
          <div className="px-4 pb-4 pt-6 sm:px-[22px]">
            <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Daily agent token burn this period">
              {mockUsage.daily.map((v, i) => (
                <div key={i} className="group relative flex h-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-[4px] bg-signal transition-opacity group-hover:opacity-80"
                    style={{ height: `${(v / dailyMax) * 100}%` }}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink-2 shadow-sm group-hover:block">
                    <span className="font-semibold text-ink">{nf(v)}M</span> &middot; {dayLabel(i)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-[11.5px] tabular-nums text-ink-3">
              <span>{dayLabel(0)}</span>
              <span>{dayLabel(mockUsage.daily.length - 1)}</span>
            </div>
          </div>
          {/* A native disclosure (works without JS, announced as expandable), styled as a row:
              the default triangle marker is hidden and a caret rotates instead. The table scrolls
              inside a fixed height so opening it does not push the page a screen down. */}
          <details className="group border-t border-line">
            <summary className="flex h-12 cursor-pointer list-none items-center gap-2.5 px-4 text-[13.5px] font-semibold text-ink-2 transition-colors hover:bg-bg hover:text-ink focus-visible:outline-offset-[-2px] sm:px-[22px] [&::-webkit-details-marker]:hidden">
              <Table size={16} aria-hidden className="text-ink-3" />
              <span className="flex-1">View as table</span>
              <span className="text-[12px] font-medium text-ink-3 group-open:hidden">{mockUsage.daily.length} days</span>
              <CaretDown size={14} weight="bold" aria-hidden className="text-ink-3 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="max-h-[320px] overflow-y-auto border-t border-line">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 z-[1] bg-surface">
                  <tr className="border-b border-line">
                    <th scope="col" className={`${thClass} pl-4 sm:pl-[22px]`}>Day</th>
                    <th scope="col" className={`${thClass} pr-4 text-right sm:pr-[22px]`}>Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {mockUsage.daily.map((v, i) => (
                    <tr key={i} className="transition-colors hover:bg-bg">
                      <td className="py-2 pl-4 text-ink-2 sm:pl-[22px]">{dayLabel(i)}</td>
                      <td className="py-2 pr-4 text-right font-medium tabular-nums text-ink sm:pr-[22px]">{nf(v)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </SectionCard>
      </div>

      <Note>Sample figures. Real usage appears once metering is live for this workspace.</Note>
    </div>
  );
}
