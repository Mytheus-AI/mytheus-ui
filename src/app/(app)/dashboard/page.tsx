import type { Metadata } from "next";
import { apiSafe } from "@/lib/api/client";
import { toMeetingView } from "@/lib/api/present";
import type { DashboardResponse } from "@/lib/api/types";
import { resolveOrgContext } from "@/lib/api/org-context";
import { openConflicts, myOpenTasks } from "@/components/app/dashboard/data";
import { DashboardHeader } from "@/components/app/dashboard/DashboardHeader";
import { HeroUpNext } from "@/components/app/dashboard/HeroUpNext";
import { NeedsYou } from "@/components/app/dashboard/NeedsYou";
import { MyNotes, type DashboardNote } from "@/components/app/dashboard/MyNotes";
import { RecentDecisions } from "@/components/app/dashboard/RecentDecisions";
import { RecentMeetings } from "@/components/app/dashboard/RecentMeetings";
import { TaskList } from "@/components/app/dashboard/TaskList";
import { TodayTimeline } from "@/components/app/dashboard/TodayTimeline";
import { reveal } from "@/components/app/dashboard/parts";
import type { HomeMeeting } from "@/components/app/dashboard/types";

export const metadata: Metadata = {
  title: "Dashboard | Mytheus",
};

/**
 * Home, reading `GET /bff/dashboard` server-side.
 *
 * `apiSafe` rather than `api`: this page is a composite, and one failed read should degrade
 * its own panel rather than replacing the whole screen with an error boundary. That mirrors
 * how `bff` already reports a per-arm status instead of failing the composite.
 *
 * The meetings arm is real and drives the hero, the header and the Today timeline. The task,
 * decision, recent-meeting and conflict panels still read the mock, because `action_items` and
 * `decisions` are shaped-but-empty on the server until Plan 8: wiring them now would replace a
 * populated demo with permanently empty boxes. Your notes (`worklogs`) are real.
 *
 * Server Component throughout. The only client code is small leaf islands: the live countdown
 * and relative time, local-timezone times, the greeting word, and the retry button.
 */
export default async function DashboardPage() {
  const [orgContext, dashboard] = await Promise.all([
    resolveOrgContext(),
    apiSafe<DashboardResponse>("/bff/dashboard"),
  ]);

  const firstName = (orgContext?.user.name ?? "there").split(" ")[0];

  const meetingsArm = dashboard.ok ? dashboard.data.upcoming_meetings : null;
  const meetings: HomeMeeting[] = (meetingsArm?.items ?? []).map((m, i) => ({
    ...toMeetingView(m),
    endTime: meetingsArm?.items[i]?.scheduled_end ?? undefined,
  }));
  // `worklogs` is real since Plan 7: the caller's own notes. Read loosely so a client generated
  // before the arm was typed still compiles.
  const notesArm = dashboard.ok
    ? (dashboard.data.worklogs as { status: string; items: unknown[] } | undefined)
    : undefined;
  const notes = (notesArm?.items ?? []) as DashboardNote[];
  const notesFailed = !dashboard.ok || notesArm?.status === "degraded";
  // A failed fetch and a server-reported degraded arm are the same thing to the panels.
  const calendarFailed = !dashboard.ok || meetingsArm?.status === "degraded";

  const now = new Date();
  const nowMs = now.getTime();
  const isToday = (m: HomeMeeting) =>
    m.startTime !== "" && new Date(m.startTime).toDateString() === now.toDateString();

  // The hero is the live meeting if there is one, otherwise the first scheduled one that has
  // not already finished. The server orders the arm ascending with unscheduled last.
  const active = meetings.filter((m) => m.status !== "past");
  const next = active.find((m) => m.status === "live") ?? active.find((m) => m.startTime !== "") ?? null;
  const after = next ? (active.find((m) => m.id !== next.id && m.startTime !== "") ?? null) : null;

  const today = meetings.filter(isToday);
  const later = meetings.filter((m) => !isToday(m) && m.status !== "past");

  const { mine } = myOpenTasks();

  return (
    <div className="mx-auto max-w-[1240px]">
      <div {...reveal(0)}>
        <DashboardHeader
          firstName={firstName}
          nowIso={now.toISOString()}
          nowMs={nowMs}
          next={calendarFailed ? null : next}
          calendarFailed={calendarFailed}
          todayCount={today.length}
          openTasks={mine.length}
          needsYou={openConflicts.length}
        />
      </div>

      {/* Wide main column plus a fixed, narrower rail. Under 1100px the rail drops below and
          becomes two columns; under 720px everything is one column. */}
      <div className="grid grid-cols-1 items-start gap-6 min-[1101px]:grid-cols-[minmax(0,1fr)_minmax(300px,368px)]">
        <div className="flex min-w-0 flex-col gap-7">
          <HeroUpNext next={next} after={after} calendarFailed={calendarFailed} nowMs={nowMs} {...reveal(1)} />
          <NeedsYou {...reveal(2)} />
          <RecentMeetings {...reveal(5)} />
        </div>

        <aside
          aria-label="Today, tasks and decisions"
          className="grid min-w-0 grid-cols-1 items-start gap-5 min-[721px]:grid-cols-2 min-[1101px]:flex min-[1101px]:flex-col min-[1101px]:items-stretch"
        >
          <TodayTimeline
            today={today}
            later={later}
            nextId={next?.id}
            calendarFailed={calendarFailed}
            nowMs={nowMs}
            {...reveal(3)}
          />
          <MyNotes notes={notes} failed={notesFailed} {...reveal(4)} />
          <TaskList {...reveal(4)} />
          <RecentDecisions
            className={`${reveal(6).className} min-[721px]:col-span-2 min-[1101px]:col-span-1`}
            style={reveal(6).style}
          />
        </aside>
      </div>
    </div>
  );
}
