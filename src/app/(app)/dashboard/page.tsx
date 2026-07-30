import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/Button";
import { apiSafe } from "@/lib/api/client";
import { toMeetingView } from "@/lib/api/present";
import type { DashboardResponse } from "@/lib/api/types";
import { resolveOrgContext } from "@/lib/api/org-context";
// mockActions stays: `action_items` is a shaped-but-empty arm on the server until the agent
// and confirmation bands (Plan 7-9), so counting real ones would render "0 open action items"
// as though it were measured.
import { mockActions } from "@/lib/mock/data";
import { ActionItems } from "@/components/app/dashboard/ActionItems";
import { AgentActivityStrip } from "@/components/app/dashboard/AgentActivityStrip";
import { formatDayLong, greetingFor } from "@/components/app/dashboard/format";
import { RecentDecisions } from "@/components/app/dashboard/RecentDecisions";
import { StatGrid } from "@/components/app/dashboard/StatGrid";
import { TodaysMeetings } from "@/components/app/dashboard/TodaysMeetings";

export const metadata: Metadata = {
  title: "Dashboard — Mytheus",
};

/**
 * The dashboard, reading `GET /bff/dashboard` server-side.
 *
 * `apiSafe` rather than `api`: this page is a composite, and one failed read should degrade
 * its own panel rather than replacing the whole screen with an error boundary. That mirrors
 * how `bff` already reports a per-arm status instead of failing the composite.
 *
 * The meetings arm is real. The other three panels still read the mock, because `action_items`,
 * `worklogs` and `decisions` are shaped-but-empty on the server until Plan 7-9: wiring them now
 * would replace a populated demo with three permanently empty boxes and no new information.
 */
export default async function DashboardPage() {
  const [orgContext, dashboard] = await Promise.all([
    resolveOrgContext(),
    apiSafe<DashboardResponse>("/bff/dashboard"),
  ]);

  const firstName = (orgContext?.user.name ?? "there").split(" ")[0];
  const orgName = orgContext?.org.name ?? "your workspace";

  const meetingsArm = dashboard.ok ? dashboard.data.upcoming_meetings : null;
  const upcoming = (meetingsArm?.items ?? []).map(toMeetingView);
  // A failed fetch and a server-reported degraded arm are the same thing to the panel.
  const meetingsStatus = dashboard.ok ? meetingsArm?.status : "degraded";

  const now = new Date();
  const todayCount = upcoming.filter(
    (m) => m.startTime && new Date(m.startTime).toDateString() === now.toDateString(),
  ).length;
  const openCount = mockActions.filter((a) => a.status === "open").length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      {/* Greeting / today header row */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="kicker text-signal">Dashboard</p>
          <h1 className="display mt-2 text-[30px] sm:text-[36px]">
            {greetingFor(now)}, {firstName}
          </h1>
          <p className="mt-2 text-[14.5px] text-ink-3">
            {formatDayLong(now)} · {todayCount} meeting
            {todayCount === 1 ? "" : "s"} today · {openCount} open action item
            {openCount === 1 ? "" : "s"} at {orgName}
          </p>
        </div>
        <LinkButton
          href="/meetings"
          variant="outline"
          className="min-h-[44px] shrink-0"
        >
          All meetings
        </LinkButton>
      </header>

      {/* The week's numbers, with trend deltas */}
      <StatGrid />

      {/* What your personal agent has been doing — calm, one line per item */}
      <AgentActivityStrip />

      {/* Today's schedule + your action items + the decision record.
          Single column at base; meetings full-width with actions/decisions
          paired at md; 3/2 split with decisions 3-up across the bottom at xl. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        <TodaysMeetings
          className="md:col-span-2 xl:col-span-3"
          meetings={upcoming}
          status={meetingsStatus}
        />
        <ActionItems className="xl:col-span-2" />
        <RecentDecisions className="xl:col-span-5" />
      </div>
    </div>
  );
}
