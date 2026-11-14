import type { Metadata } from "next";
import { theadRowClass, thClass } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard, cardPad } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { PageHead } from "@/components/ui/Page";
import { KpiStrip, QuotaList } from "@/components/ops/viz/Figures";
import { Treemap, type TreeItem } from "@/components/ops/viz/Treemap";
import { fmt, periodLabel } from "@/lib/ops-charts";
import { loadCosts } from "@/lib/api/admin-ops";
import { sortCosts } from "@/lib/ops";

export const metadata: Metadata = { title: "Cost and lag | Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* Cost and lag (plan 3.13 step 3): per-tenant agent-token use this period from
   `usage_aggregates`, plus dead-letter counts and consumer lag when the service can read them.
   Aggregates only, never tenant content. A section the server cannot fill (null) says so instead
   of showing zeros. The treemap answers "who is spending it"; the meters under it answer "who is
   about to run out", highest share of quota first. */

const whole = new Intl.NumberFormat("en-US");
const TOP = 11;

export default async function OpsCostsPage() {
  const res = await loadCosts();
  const title = "Cost and lag";
  if (res.kind !== "live") {
    return (
      <>
        <PageHead title={title} context="Model spend by workspace and pipeline health." />
        {res.kind === "forbidden" ? (
          <Note tone="error">This account is not on the Mytheus staff list.</Note>
        ) : (
          <ErrorState title="The cost and lag figures could not be loaded" />
        )}
      </>
    );
  }

  const d = res.data;
  const rows = sortCosts(Array.isArray(d.tenants) ? d.tenants : []);
  const total = rows.reduce((s, r) => s + (Number(r.tokens_consumed) || 0), 0);
  const nearQuota = rows.filter((r) => r.ratio !== null && r.ratio >= 0.8).length;
  const overQuota = rows.filter((r) => r.ratio !== null && r.ratio >= 1).length;
  const dlqTotal = d.dlq ? d.dlq.reduce((s, x) => s + x.count, 0) : null;
  const spenders = [...rows].filter((r) => r.tokens_consumed > 0).sort((a, b) => b.tokens_consumed - a.tokens_consumed);
  const top = spenders.slice(0, TOP);
  const tail = spenders.slice(TOP);
  const tiles: TreeItem[] = [
    ...top.map((r) => ({
      key: r.org_id,
      label: r.name,
      value: r.tokens_consumed,
      state: (r.ratio === null ? "ok" : r.ratio >= 0.95 ? "high" : r.ratio >= 0.8 ? "medium" : "ok") as TreeItem["state"],
      note: r.token_quota ? `${Math.round((r.ratio ?? 0) * 100)}% of its ${fmt(r.token_quota)} quota` : "no quota set",
    })),
    ...(tail.length
      ? [
          {
            key: "other",
            label: `${tail.length} other ${tail.length === 1 ? "workspace" : "workspaces"}`,
            value: tail.reduce((s, r) => s + r.tokens_consumed, 0),
            state: "other" as const,
          },
        ]
      : []),
  ];
  const leader = spenders[0];

  return (
    <>
      <PageHead title={title} context={`Agent token use by workspace${d.period ? ` for ${periodLabel(d.period)}` : ""}, and pipeline health. Aggregates only.`} />

      <div className="flex flex-col gap-5 xl:gap-6">
        {d.truncated ? <Note tone="warning">Showing the {rows.length} newest workspaces only, so the totals below leave out older workspaces.</Note> : null}

        <KpiStrip
          label="Cost figures"
          items={[
            { label: "Agent tokens this period", value: fmt(total), hint: `${whole.format(total)} in all` },
            {
              label: "Largest spender",
              value: leader ? `${Math.round((leader.tokens_consumed / Math.max(1, total)) * 100)}%` : "None",
              hint: leader ? `${leader.name}, of all tokens` : "No use recorded",
            },
            { label: "Past 80% of quota", value: nearQuota, hint: overQuota ? `${overQuota} past their quota` : nearQuota ? "Near their quota" : "None near quota" },
            {
              label: "Dead letters",
              value: dlqTotal === null ? "Not readable" : whole.format(dlqTotal),
              hint: dlqTotal === null ? "Not readable from the ops service yet" : "Across every queue",
            },
          ]}
        />

        <SectionCard
          title="Share of agent tokens"
          headingLevel={2}
          headingId="share-heading"
          description={`Each tile is one workspace, sized by its share of this period's tokens; the ${TOP} largest, then everyone else together. Colour shows how close it is to its quota.`}
          clip={false}
        >
          <div className={cardPad}>
            <Treemap items={tiles} caption="Workspaces by share of agent tokens this period" />
          </div>
        </SectionCard>

        <SectionCard
          title="Agent tokens against quota"
          headingLevel={2}
          headingId="tokens-heading"
          description="Every workspace, highest share of its quota first. Ticks mark 80% and 95%."
        >
          {rows.length === 0 ? (
            <EmptyState inCard art="billing" title="No token use yet" description="No agent token use is recorded for this period." />
          ) : (
            <div className={cardPad}>
              <div className="grid gap-x-10 gap-y-4 lg:grid-cols-2">
                <QuotaList
                  empty=""
                  rows={rows.slice(0, Math.ceil(rows.length / 2)).map((r) => ({ key: r.org_id, name: r.name, value: r.tokens_consumed, quota: r.token_quota }))}
                />
                <QuotaList
                  empty=""
                  rows={rows.slice(Math.ceil(rows.length / 2)).map((r) => ({ key: r.org_id, name: r.name, value: r.tokens_consumed, quota: r.token_quota }))}
                />
              </div>
            </div>
          )}
        </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2 xl:gap-6">
        <SectionCard title="Dead-letter queues" headingLevel={2} headingId="dlq-heading" description="Messages that failed processing and were set aside.">
          {d.dlq === null ? (
            <p className="px-4 py-5 text-[14px] text-ink-3 sm:px-[22px]">Not readable from the ops service yet.</p>
          ) : d.dlq.length === 0 ? (
            <p className="px-4 py-5 text-[14px] text-ink-3 sm:px-[22px]">No dead letters.</p>
          ) : (
            <table className="mx-table w-full border-collapse text-left text-[14px]">
              <thead>
                <tr className={theadRowClass}>
                  <th scope="col" className={`${thClass} !pl-[22px]`}>Topic</th>
                  <th scope="col" className={`${thClass} text-right !pr-[22px]`}>Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.dlq.map((x) => (
                  <tr key={x.topic}>
                    <th scope="row" className="break-all py-3 pl-[22px] pr-5 text-left font-mono text-[14px] font-normal text-ink">
                      {x.topic}
                    </th>
                    <td data-label="Messages" className="py-3 pl-5 pr-[22px] text-right tabular-nums text-ink-2">
                      {whole.format(x.count)}
                    </td>
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
            <table className="mx-table w-full border-collapse text-left text-[14px]">
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
                    <th scope="row" className="break-all py-3 pl-[22px] pr-5 text-left font-mono text-[14px] font-normal text-ink">
                      {x.group}
                    </th>
                    <td data-label="Topic" className="break-all px-5 py-3 font-mono text-[14px] text-ink-2">
                      {x.topic}
                    </td>
                    <td data-label="Lag" className="py-3 pl-5 pr-[22px] text-right tabular-nums text-ink-2">
                      {whole.format(x.lag)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
      </div>
    </>
  );
}
