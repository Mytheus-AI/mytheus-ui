import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/Button";
import { mockActions, mockMeetings, mockOrgContext } from "@/lib/mock/data";
import { ActionItems } from "@/components/app/dashboard/ActionItems";
import { AgentActivityStrip } from "@/components/app/dashboard/AgentActivityStrip";
import {
  MOCK_NOW,
  formatDayLong,
  greetingFor,
  isSameUTCDay,
} from "@/components/app/dashboard/format";
import { RecentDecisions } from "@/components/app/dashboard/RecentDecisions";
import { StatGrid } from "@/components/app/dashboard/StatGrid";
import { TodaysMeetings } from "@/components/app/dashboard/TodaysMeetings";

export const metadata: Metadata = {
  title: "Dashboard — Mytheus",
};

export default function DashboardPage() {
  const firstName = mockOrgContext.user.name.split(" ")[0];

  const todayCount = mockMeetings.filter(
    (m) => m.status !== "past" && isSameUTCDay(new Date(m.startTime), MOCK_NOW),
  ).length;
  const openCount = mockActions.filter((a) => a.status === "open").length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      {/* Greeting / today header row */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="kicker text-signal">Dashboard</p>
          <h1 className="display mt-2 text-[30px] sm:text-[36px]">
            {greetingFor(MOCK_NOW)}, {firstName}
          </h1>
          <p className="mt-2 text-[14.5px] text-ink-3">
            {formatDayLong(MOCK_NOW)} · {todayCount} meeting
            {todayCount === 1 ? "" : "s"} today · {openCount} open action item
            {openCount === 1 ? "" : "s"} at {mockOrgContext.org.name}
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
        <TodaysMeetings className="md:col-span-2 xl:col-span-3" />
        <ActionItems className="xl:col-span-2" />
        <RecentDecisions className="xl:col-span-5" />
      </div>
    </div>
  );
}
