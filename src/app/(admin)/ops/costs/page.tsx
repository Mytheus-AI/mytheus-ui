import type { Metadata } from "next";
import { StatCard, theadRowClass, thClass } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note, PageHeader, SectionCard } from "@/components/settings/primitives";
import { loadCosts } from "@/lib/api/admin-ops";
import { sortCosts } from "@/lib/ops";

export const metadata: Metadata = { title: "Cost and lag | Mytheus" };
export const dynamic = "force-dynamic";

/* Cost and lag (plan 3.13 step 3): per-tenant agent-token use this period from
   `usage_aggregates`, plus dead-letter counts and consumer lag when the service can read them.
   Aggregates only, never tenant content. A section the server cannot fill (null) says so instead
   of showing zeros. Each tenant's use is one meter against its quota, in one hue; the figure is
   always printed beside it. */

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-US");
const pct = (v: number) => `${Math.round(v * 100)}%`;

function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export default async function OpsCostsPage() {
  const res = await loadCosts();
  if (res.kind !== "live") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Cost and lag" description="Model spend by tenant and pipeline health." />
        <Note tone={res.kind === "forbidden" ? "error" : "warning"}>
          {res.kind === "forbidden" ? "This account is not on the Mytheus staff list." : "The cost and lag figures could not be loaded just now. Try again in a moment."}
        </Note>
      </div>
    );
  }

  const d = res.data;
  const rows = sortCosts(Array.isArray(d.tenants) ? d.tenants : []);
  const total = rows.reduce((s, r) => s + (Number(r.tokens_consumed) || 0), 0);
  const nearQuota = rows.filter((r) => r.ratio !== null && r.ratio >= 0.8).length;
  const dlqTotal = d.dlq ? d.dlq.reduce((s, x) => s + x.count, 0) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cost and lag" description={`Agent token use by tenant${d.period ? ` for ${periodLabel(d.period)}` : ""}, and pipeline health. Aggregates only.`} />

      {d.truncated ? (
        <Note tone="warning">Showing the {rows.length} newest tenants only, so the totals below leave out older tenants.</Note>
      ) : null}

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Agent tokens this period" value={compact.format(total)} hint={`${whole.format(total)} in all`} />
        <StatCard label="Tenants past 80%" value={nearQuota} hint={nearQuota ? "Near their quota" : "None near quota"} />
        <StatCard
          label="Dead letters"
          value={dlqTotal === null ? "Not readable" : whole.format(dlqTotal)}
          hint={dlqTotal === null ? "Not readable from the ops service yet" : "Across every queue"}
        />
      </div>

      <SectionCard
        title="Agent tokens by tenant"
        headingLevel={2}
        headingId="tokens-heading"
        description="Highest share of quota first. Ticks mark 80% and 95%."
      >
        {rows.length === 0 ? (
          <EmptyState
            className="!rounded-none !border-0 !bg-transparent !py-10"
            title="No token use yet"
            description="No agent token use is recorded for this period."
          />
        ) : (
          rows.map((r) => (
            <div key={r.org_id} className="px-4 py-4 sm:px-[22px]">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="min-w-0 truncate text-[15px] font-semibold text-ink">{r.name}</p>
                <p className="shrink-0 text-[14px] tabular-nums text-ink-2">
                  <span className="font-semibold text-ink">{compact.format(r.tokens_consumed)}</span>
                  {r.token_quota ? (
                    <>
                      {" "}
                      of {compact.format(r.token_quota)} <span className="ml-1.5 text-ink-3">{pct(r.ratio ?? 0)}</span>
                    </>
                  ) : (
                    <span className="ml-1.5 text-ink-3">no quota</span>
                  )}
                </p>
              </div>
              {r.ratio !== null ? (
                <div
                  className="relative h-2.5 rounded-full bg-bg-2"
                  role="meter"
                  aria-label={`${r.name} agent tokens used`}
                  aria-valuemin={0}
                  aria-valuemax={r.token_quota ?? 0}
                  aria-valuenow={Math.min(r.tokens_consumed, r.token_quota ?? r.tokens_consumed)}
                  aria-valuetext={`${pct(r.ratio)} of quota`}
                >
                  <div
                    className={`h-full rounded-full ${r.ratio >= 0.95 ? "bg-priority-high" : r.ratio >= 0.8 ? "bg-priority-medium" : "bg-pill"} ${r.tokens_consumed > 0 ? "min-w-2.5" : ""}`}
                    style={{ width: `${Math.min(r.ratio, 1) * 100}%` }}
                  />
                  {[0.8, 0.95].map((t) => (
                    <span key={t} aria-hidden className="absolute -top-[3px] h-4 w-[2px] rounded-full bg-ink-4 ring-2 ring-surface" style={{ left: `${t * 100}%` }} />
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Dead-letter queues" headingLevel={2} headingId="dlq-heading" description="Messages that failed processing and were set aside.">
          {d.dlq === null ? (
            <p className="px-4 py-5 text-[14px] text-ink-3 sm:px-[22px]">Not readable from the ops service yet.</p>
          ) : d.dlq.length === 0 ? (
            <p className="px-4 py-5 text-[14px] text-ink-3 sm:px-[22px]">No dead letters.</p>
          ) : (
            <table className="w-full border-collapse text-left text-[14.5px]">
              <thead>
                <tr className={theadRowClass}>
                  <th scope="col" className={`${thClass} !pl-[22px]`}>Topic</th>
                  <th scope="col" className={`${thClass} text-right !pr-[22px]`}>Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.dlq.map((x) => (
                  <tr key={x.topic}>
                    <td className="break-all py-3 pl-[22px] pr-5 font-mono text-[14px] text-ink">{x.topic}</td>
                    <td className="py-3 pl-5 pr-[22px] text-right tabular-nums text-ink-2">{whole.format(x.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="Consumer lag" headingLevel={2} headingId="lag-heading" description="How far each consumer group is behind its topic.">
          {d.consumer_lag === null ? (
            <p className="px-4 py-5 text-[14px] text-ink-3 sm:px-[22px]">Not readable from the ops service yet.</p>
          ) : d.consumer_lag.length === 0 ? (
            <p className="px-4 py-5 text-[14px] text-ink-3 sm:px-[22px]">No consumer groups reported.</p>
          ) : (
            <table className="w-full border-collapse text-left text-[14.5px]">
              <thead>
                <tr className={theadRowClass}>
                  <th scope="col" className={`${thClass} !pl-[22px]`}>Group</th>
                  <th scope="col" className={thClass}>Topic</th>
                  <th scope="col" className={`${thClass} text-right !pr-[22px]`}>Lag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.consumer_lag.map((x) => (
                  <tr key={`${x.group}|${x.topic}`}>
                    <td className="break-all py-3 pl-[22px] pr-5 font-mono text-[14px] text-ink">{x.group}</td>
                    <td className="break-all px-5 py-3 font-mono text-[14px] text-ink-2">{x.topic}</td>
                    <td className="py-3 pl-5 pr-[22px] text-right tabular-nums text-ink-2">{whole.format(x.lag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
