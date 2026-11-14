import type { Metadata } from "next";
import Link from "next/link";
import { SectionCard, cardPad } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { PageHead } from "@/components/ui/Page";
import { KpiStrip, QuotaList } from "@/components/ops/viz/Figures";
import { Donut } from "@/components/ops/viz/Donut";
import { Heatmap } from "@/components/ops/viz/Heatmap";
import { TrendPanel } from "@/components/ops/overview/TrendPanel";
import { MembersPanel } from "@/components/ops/overview/MembersPanel";
import { memberPlaces } from "@/lib/ops-geo";
import { RefreshButton } from "@/components/ops/RefreshButton";
import { REGION_PLACES, fmt, periodLabel, planFill, planLabel, planRank, weekPoints } from "@/lib/ops-charts";
import { loadOverview } from "@/lib/api/admin-ops";
import { zonedFormat } from "@/lib/timezone-server";

export const metadata: Metadata = { title: "Overview | Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* The superadmin landing page (ADR-0046 D3): the whole platform at a glance. Every figure is an
   aggregate over control-plane tables, counted with each workspace's RLS binding in turn; no
   meeting, transcript or decision content is read. Opening it is recorded in the ops audit log.

   Reading order: the headline figures, the weekly trend beside the plan mix, where workspaces
   live, then who is closest to their quota and how busy the console itself has been. */

const whole = new Intl.NumberFormat("en-US");
const clock = () => zonedFormat({ hour: "numeric", minute: "2-digit" });
const linkClass = "text-[14px] font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink-3";

export default async function OpsOverviewPage() {
  const res = await loadOverview();
  const head = { title: "Overview", context: "The whole platform at a glance. Aggregates only; opening this page is recorded in the ops audit log." };
  if (res.kind !== "live") {
    return (
      <>
        <PageHead {...head} />
        {res.kind === "forbidden" ? <Note tone="error">This account is not on the Mytheus staff list.</Note> : <ErrorState title="The overview could not be loaded" />}
      </>
    );
  }

  const o = res.data;
  const t = o.totals;
  const signups = weekPoints(o.signups_by_week);
  const meetings = weekPoints(o.meetings_by_week);
  const newThisWeek = signups.at(-1)?.value ?? 0;
  const month = periodLabel(o.period);

  // Live workspaces at the end of each week: the total now, less the sign-ups since.
  const running: number[] = [];
  let count = t.tenants;
  for (let i = signups.length - 1; i >= 0; i--) {
    running.unshift(count);
    count -= signups[i].value;
  }

  const where = o.member_zones ? memberPlaces(o.member_zones, t.members) : null;
  // Storage is a separate fact from where people are: say which region holds the data, and that
  // it is the default every workspace is given when it is created.
  const placed = (o.regions ?? []).filter((r) => r.region !== "unplaced");
  const storage = placed.length
    ? `Data storage region, a separate setting: ${placed
        .map((r) => `${REGION_PLACES[r.region]?.short ?? r.region.toUpperCase()} for ${r.workspaces} ${r.workspaces === 1 ? "workspace" : "workspaces"}`)
        .join(", ")}. New workspaces get US by default; nothing chooses it at sign-up.`
    : null;

  const plans = [...o.plans]
    .sort((a, b) => planRank(a.plan) - planRank(b.plan))
    .map((p) => ({ key: p.plan, label: planLabel(p.plan), value: p.count, fill: planFill(p.plan) }));

  return (
    <>
      <PageHead {...head} action={<RefreshButton readAt={clock().format(new Date())} />} />

      <div className="flex flex-col gap-5 xl:gap-6">
        <KpiStrip
          label="Platform totals"
          items={[
            {
              label: "Workspaces",
              value: whole.format(t.tenants),
              hint: `${newThisWeek ? `${whole.format(newThisWeek)} new this week` : "None new this week"}, ${t.suspended ? `${whole.format(t.suspended)} suspended` : "none suspended"}`,
              trend: running,
            },
            { label: "Members", value: whole.format(t.members), hint: `Across ${whole.format(t.active)} active workspaces` },
            {
              label: "Meetings, last 7 days",
              value: whole.format(t.meetings_7d),
              hint: `${whole.format(t.meetings_total)} in all`,
              trend: meetings.map((p) => p.value),
            },
            { label: "Agent tokens", value: fmt(t.tokens_period), hint: `This period, ${month}` },
            {
              label: "New feedback",
              value: whole.format(t.feedback_new ?? 0),
              hint: (
                <Link href="/ops/feedback" className="underline decoration-line-2 underline-offset-2 hover:text-ink">
                  {t.feedback_new ? "Open the inbox" : "Inbox is clear"}
                </Link>
              ),
            },
          ]}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:gap-6">
          <TrendPanel
            series={[
              { key: "meetings", label: "Meetings", caption: "Meetings created per week, last 12 weeks", unit: ["meeting", "meetings"], points: meetings },
              { key: "signups", label: "New workspaces", caption: "New workspaces per week, last 12 weeks", unit: ["workspace", "workspaces"], points: signups },
            ]}
          />
          <SectionCard title="Workspaces by plan" headingId="plans-heading" description="The plan each workspace is subscribed to, lowest to highest.">
            <div className={cardPad}>
              <Donut parts={plans} unit={["workspace", "workspaces"]} caption="Workspaces by plan" />
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Where members are"
          headingId="regions-heading"
          description="Each member placed by the time zone they saved, at that zone's city, grouped by country. A hub grows with its members."
          clip={false}
          aside={
            <Link href="/ops/workspaces" className={linkClass}>
              Every workspace
            </Link>
          }
        >
          <div className={cardPad}>
            {where ? (
              <MembersPanel places={where.places} notSet={where.notSet} total={t.members} storage={storage} />
            ) : (
              <p className="text-[14px] text-ink-3">Member locations come with the next admin-ops-service deploy; this service does not send them yet.</p>
            )}
          </div>
        </SectionCard>

        <div className="grid gap-5 lg:grid-cols-2 xl:gap-6">
          <SectionCard
            title="Closest to their token quota"
            headingId="leaders-heading"
            description={`The ten workspaces nearest their quota in ${month}. Ticks mark 80% and 95%.`}
            aside={
              <Link href="/ops/costs" className={linkClass}>
                All workspaces
              </Link>
            }
          >
            <div className={cardPad}>
              <QuotaList
                empty="No agent token use recorded this period."
                rows={o.token_leaders.map((l) => ({ key: l.org_id, name: l.name, value: l.tokens, quota: l.token_quota }))}
              />
            </div>
          </SectionCard>
          <SectionCard
            title="Console activity"
            headingId="activity-heading"
            description="Calls to the ops console per day over the last 14 days, every staff member, reads included."
            aside={
              <Link href="/ops/staff" className={linkClass}>
                Staff
              </Link>
            }
          >
            <div className={cardPad}>
              <div className="mx-auto max-w-[460px]">
                <Heatmap days={o.ops_activity_by_day} caption="Ops console calls per day, last 14 days" unit={["call", "calls"]} />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
