import type { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";
import { BarList, ColumnChart, dayPoints, fmt, weekPoints } from "@/components/ops/charts";
import { SectionCard, cardPad } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { loadOverview } from "@/lib/api/admin-ops";

export const metadata: Metadata = { title: "Overview | Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* The superadmin landing page (ADR-0046 D3): the whole platform at a glance. Every figure is an
   aggregate over control-plane tables, counted with each workspace's RLS binding in turn; no
   meeting, transcript or decision content is read. Opening it is recorded in the ops audit log. */

const whole = new Intl.NumberFormat("en-US");

function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export default async function OpsOverviewPage() {
  const res = await loadOverview();
  if (res.kind !== "live") {
    return (
      <div className="flex flex-col gap-5">
        <SectionBar title="Overview" context="The whole platform at a glance." />
        {res.kind === "forbidden" ? (
          <Note tone="error">This account is not on the Mytheus staff list.</Note>
        ) : (
          <ErrorState title="The overview could not be loaded" />
        )}
      </div>
    );
  }

  const o = res.data;
  const t = o.totals;
  const signups = weekPoints(o.signups_by_week);
  const meetings = weekPoints(o.meetings_by_week);
  const newThisWeek = signups.at(-1)?.value ?? 0;
  const month = periodLabel(o.period);

  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Overview" context="The whole platform at a glance. Aggregates only; opening this page is recorded in the ops audit log." />

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Workspaces" value={whole.format(t.tenants)} hint={newThisWeek ? `${newThisWeek} new this week` : "None new this week"} />
        <StatCard label="Active" value={whole.format(t.active)} hint={t.suspended ? `${t.suspended} suspended` : "None suspended"} />
        <StatCard label="Members" value={whole.format(t.members)} hint="Across every workspace" />
        <StatCard label="Meetings this week" value={whole.format(t.meetings_7d)} hint={`${whole.format(t.meetings_total)} in all`} />
        <StatCard label="Agent tokens" value={fmt(t.tokens_period)} hint={`This period, ${month}`} />
        <StatCard
          label="New feedback"
          value={whole.format(t.feedback_new ?? 0)}
          hint={<Link href="/ops/feedback" className="underline decoration-line-2 underline-offset-2 hover:text-ink">Open the inbox</Link>}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="New workspaces" headingId="signups-heading" description="Sign-ups per week, last 12 weeks. This week in coral." clip={false}>
          <div className={cardPad}>
            <ColumnChart points={signups} caption="New workspaces per week, last 12 weeks" unit={["workspace", "workspaces"]} />
          </div>
        </SectionCard>
        <SectionCard title="Meetings" headingId="meetings-heading" description="Meetings created per week across every workspace." clip={false}>
          <div className={cardPad}>
            <ColumnChart points={meetings} caption="Meetings per week, last 12 weeks" unit={["meeting", "meetings"]} />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Workspaces by plan" headingId="plans-heading" description="The plan each workspace is subscribed to.">
          <div className={cardPad}>
            <BarList
              caption="Workspaces by plan"
              items={o.plans.map((p) => ({
                key: p.plan,
                label: p.plan === "none" ? "No plan" : p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
                value: p.count,
                note: t.tenants ? `${Math.round((p.count / t.tenants) * 100)}%` : undefined,
              }))}
            />
          </div>
        </SectionCard>
        <SectionCard
          title="Token use against quota"
          headingId="leaders-heading"
          description={`The ten workspaces closest to their quota in ${month}.`}
          aside={<Link href="/ops/costs" className="text-[14px] font-semibold text-ink-2 underline decoration-line-2 underline-offset-2 hover:text-ink">All workspaces</Link>}
        >
          <div className={cardPad}>
            <BarList
              caption="Workspaces closest to their token quota"
              empty="No agent token use recorded this period."
              items={o.token_leaders.map((l) => {
                const ratio = l.token_quota ? l.tokens / l.token_quota : null;
                return {
                  key: l.org_id,
                  label: l.name,
                  value: l.tokens,
                  share: ratio ?? undefined,
                  note: ratio === null ? "no quota" : `${Math.round(ratio * 100)}% of ${fmt(l.token_quota ?? 0)}`,
                  tone: ratio === null ? "default" : ratio >= 0.95 ? "high" : ratio >= 0.8 ? "medium" : "default",
                };
              })}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Ops activity" headingId="activity-heading" description="Calls to the ops console per day, last 14 days, every staff member. Today in coral." clip={false}>
        <div className={cardPad}>
          <ColumnChart points={dayPoints(o.ops_activity_by_day)} caption="Ops console calls per day, last 14 days" unit={["call", "calls"]} height={112} />
        </div>
      </SectionCard>
    </div>
  );
}
