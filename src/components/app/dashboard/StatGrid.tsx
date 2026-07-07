import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { mockMeetings, mockDecisions, mockActions } from "@/lib/mock/data";
import {
  MOCK_NOW,
  daysFromNow,
  formatShortDate,
  startOfWeekUTC,
} from "./format";

const WEEK_MS = 7 * 86_400_000;

/* Open cross-meeting conflicts flagged by the agents. Not in lib/mock yet —
   local const until /bff/dashboard exposes a conflicts rollup. Mirrors the
   mockAgentSidebar conflict story (pricing rework vs. Q3 launch date). */
const openConflicts = [
  {
    id: "conf_1",
    summary: "Pricing rework vs. Q3 launch date",
    meetingId: "mtg_1",
    meetingTitle: "Q3 Roadmap Sync",
  },
] as const;

type StatDelta = {
  text: string;
  /** overdue / act-now deltas borrow the frozen priority-high ink */
  alert?: boolean;
};

function StatTile({
  label,
  value,
  delta,
  hint,
  href,
}: {
  label: string;
  value: number;
  delta: StatDelta;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="block min-w-0 rounded-card">
      <Card className="h-full px-4 py-4 transition-[border-color,box-shadow] duration-200 hover:border-line-2 hover:shadow-[0_12px_32px_-24px_rgba(40,30,20,0.4)] sm:px-5">
        <p className="kicker truncate text-[9.5px]">{label}</p>
        <div className="mt-2 flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-[26px] leading-none text-ink-display sm:text-[30px]">
            {value}
          </span>
          <span
            className={`truncate font-mono text-[10.5px] tracking-tight ${
              delta.alert ? "text-priority-high" : "text-ink-3"
            }`}
          >
            {delta.text}
          </span>
        </div>
        <p className="mt-2 truncate text-[12px] text-ink-3" title={hint}>
          {hint}
        </p>
      </Card>
    </Link>
  );
}

/* The week's numbers at a glance — every figure derives from the mock data
   against the fixed MOCK_NOW anchor, so tiles and lists always agree. */
export function StatGrid() {
  const weekStart = startOfWeekUTC(MOCK_NOW);
  const inWeek = (iso: string, start: number) => {
    const t = Date.parse(iso);
    return t >= start && t < start + WEEK_MS;
  };

  const meetingsThisWeek = mockMeetings.filter((m) => inWeek(m.startTime, weekStart));
  const meetingsLastWeek = mockMeetings.filter((m) =>
    inWeek(m.startTime, weekStart - WEEK_MS),
  );
  const meetingsDelta = meetingsThisWeek.length - meetingsLastWeek.length;
  const liveCount = mockMeetings.filter((m) => m.status === "live").length;
  const upcomingCount = mockMeetings.filter((m) => m.status === "upcoming").length;

  const decisionsThisWeek = mockDecisions.filter((d) =>
    inWeek(d.confirmedAt, weekStart),
  ).length;
  const latestDecision = [...mockDecisions].sort((a, b) =>
    b.confirmedAt.localeCompare(a.confirmedAt),
  )[0];

  const openActions = mockActions.filter((a) => a.status === "open");
  const overdueCount = openActions.filter((a) => daysFromNow(a.dueDate) < 0).length;
  const nextDue = [...openActions].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )[0];

  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  return (
    <section
      aria-label="This week at a glance"
      className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
    >
      <StatTile
        label="Meetings this week"
        value={meetingsThisWeek.length}
        delta={{ text: `${sign(meetingsDelta)} vs last week` }}
        hint={`${liveCount} live now · ${upcomingCount} upcoming`}
        href="/meetings"
      />
      <StatTile
        label="Decisions captured"
        value={mockDecisions.length}
        delta={{ text: `${sign(decisionsThisWeek)} this week` }}
        hint={latestDecision ? `Latest: ${latestDecision.title}` : "None on record yet"}
        href="/decisions"
      />
      <StatTile
        label="Action items open"
        value={openActions.length}
        delta={
          overdueCount > 0
            ? { text: `${overdueCount} overdue`, alert: true }
            : { text: "0 overdue" }
        }
        hint={
          nextDue
            ? `Next due ${formatShortDate(nextDue.dueDate)} · ${nextDue.title}`
            : "All clear"
        }
        href="/tasks"
      />
      <StatTile
        label="Conflicts flagged"
        value={openConflicts.length}
        delta={{ text: "needs review" }}
        hint={openConflicts[0].summary}
        href={`/meetings/${openConflicts[0].meetingId}`}
      />
    </section>
  );
}
