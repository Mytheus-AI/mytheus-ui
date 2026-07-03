import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import {
  mockOrgContext,
  mockMeetings,
  mockDecisions,
  mockActions,
  mockSourcedAnswer,
  type Priority,
} from "@/lib/mock/data";

export const metadata: Metadata = {
  title: "Dashboard — Mytheus",
};

/* ---------------- formatting helpers ---------------- */

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Today, 6:00 PM" / "Tomorrow, 9:30 AM" / "Thu, Jul 2, 9:30 AM" */
function formatMeetingTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, tomorrow)) return `Tomorrow, ${time}`;

  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return `${day}, ${time}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

function formatDueDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function priorityLabel(priority: Priority): string {
  return `${priority[0].toUpperCase()}${priority.slice(1)} priority`;
}

/* ---------------- small building blocks ---------------- */

function AvatarStack({ names }: { names: string[] }) {
  const shown = names.slice(0, 3);
  const extra = names.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((name, i) => (
        <Avatar
          key={name + i}
          name={name}
          size="sm"
          className={i === 0 ? "" : "-ml-2 ring-2 ring-surface"}
        />
      ))}
      {extra > 0 ? (
        <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg-2 text-[11px] font-medium text-ink-3 ring-2 ring-surface">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

/* a compact, linked stat tile — the day's numbers at a glance */
function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="card-interactive h-full py-4">
        <p className="kicker text-[9.5px]">{label}</p>
        <p className="mt-1.5 font-mono text-[28px] leading-none tabular-nums text-ink-display">
          {value}
        </p>
        <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>
      </Card>
    </Link>
  );
}

/* ---------------- page ---------------- */

export default function DashboardPage() {
  const firstName = mockOrgContext.user.name.split(" ")[0];

  const liveMeetings = mockMeetings.filter((m) => m.status === "live");

  const upcomingMeetings = mockMeetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  const recentDecisions = [...mockDecisions]
    .sort((a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime())
    .slice(0, 3);

  const openActions = mockActions
    .filter((a) => a.status === "open")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const openActionCount = mockActions.filter((a) => a.status === "open").length;
  const upcomingCount = mockMeetings.filter((m) => m.status === "upcoming").length;
  const nextDue = openActions[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      {/* Welcome */}
      <div>
        <p className="kicker text-signal">DASHBOARD</p>
        <h1 className="display mt-2 text-[32px] sm:text-[38px]">
          Good to see you, {firstName}
        </h1>
        <p className="mt-2 text-[15px] text-ink-3">
          Here&apos;s what&apos;s happening across {mockOrgContext.org.name} today.
        </p>
      </div>

      {/* The day at a glance */}
      <section aria-label="At a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Live now"
          value={liveMeetings.length}
          hint={liveMeetings[0] ? liveMeetings[0].title : "No meeting running"}
          href={liveMeetings[0] ? `/meetings/${liveMeetings[0].id}/room` : "/meetings"}
        />
        <StatTile
          label="Upcoming"
          value={upcomingCount}
          hint="meetings on the calendar"
          href="/meetings"
        />
        <StatTile
          label="Open actions"
          value={openActionCount}
          hint={nextDue ? `next due ${formatDueDate(nextDue.dueDate)}` : "all clear"}
          href="/tasks"
        />
        <StatTile
          label="Decisions"
          value={mockDecisions.length}
          hint="confirmed on record"
          href="/decisions"
        />
      </section>

      {/* Live now */}
      {liveMeetings.length > 0 ? (
        <section aria-labelledby="live-now-heading">
          <h2 id="live-now-heading" className="sr-only">
            Live now
          </h2>
          <div className="flex flex-col gap-4">
            {liveMeetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="glow-pulse border-signal/40 bg-signal-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge tone="danger">Live</Badge>
                    <div>
                      <p className="text-[16px] font-medium text-ink">{meeting.title}</p>
                      <p className="mt-0.5 text-[13px] text-ink-3">
                        Started {formatMeetingTime(meeting.startTime)} ·{" "}
                        {formatDuration(meeting.durationMinutes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <AvatarStack names={meeting.participants} />
                    <LinkButton href={`/meetings/${meeting.id}/room`} size="sm">
                      Join room
                    </LinkButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* From your agent — the digest that makes the app feel inhabited */}
      <section aria-labelledby="agent-digest-heading">
        <h2 id="agent-digest-heading" className="text-[20px] font-medium text-ink-display">
          From your agent
        </h2>
        <div className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
          <ul className="divide-y divide-line">
            <li className="flex items-start gap-3.5 px-5 py-4">
              <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-signal" />
              <div className="min-w-0">
                <p className="text-[14px] leading-snug text-ink">
                  &ldquo;{mockSourcedAnswer.quote}&rdquo;
                </p>
                <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                  Sourced · {mockSourcedAnswer.source.meeting} · {mockSourcedAnswer.source.date}
                </p>
              </div>
            </li>
            {nextDue ? (
              <li className="flex items-start gap-3.5 px-5 py-4">
                <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-priority-medium" />
                <div className="min-w-0">
                  <p className="text-[14px] leading-snug text-ink">
                    <span className="font-medium">{nextDue.title}</span> is your
                    next deadline — due {formatDueDate(nextDue.dueDate)}.
                  </p>
                  <Link
                    href="/tasks"
                    className="link-underline mt-1.5 inline-block text-[12.5px] font-medium text-signal-deep"
                  >
                    Open my tasks
                  </Link>
                </div>
              </li>
            ) : null}
            <li className="flex items-start gap-3.5 px-5 py-4">
              <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-priority-low" />
              <div className="min-w-0">
                <p className="text-[14px] leading-snug text-ink">
                  {mockDecisions[0].title} — confirmed in {mockDecisions[0].meetingTitle}.
                </p>
                <Link
                  href="/decisions"
                  className="link-underline mt-1.5 inline-block text-[12.5px] font-medium text-signal-deep"
                >
                  See the decision record
                </Link>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Upcoming meetings */}
      <section aria-labelledby="upcoming-heading">
        <div className="flex items-center justify-between">
          <h2 id="upcoming-heading" className="text-[20px] font-medium text-ink-display">
            Upcoming meetings
          </h2>
          <Link
            href="/meetings"
            className="link-underline text-[13px] font-medium text-ink-2"
          >
            View all
          </Link>
        </div>

        {upcomingMeetings.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {upcomingMeetings.map((meeting) => (
              <Card key={meeting.id} className="card-interactive">
                <p className="text-[15px] font-medium text-ink">{meeting.title}</p>
                <p className="mt-1 text-[13px] text-ink-3">
                  {formatMeetingTime(meeting.startTime)} ·{" "}
                  {formatDuration(meeting.durationMinutes)}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <AvatarStack names={meeting.participants} />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No upcoming meetings"
              description="Meetings you're invited to will show up here as they're scheduled."
            />
          </div>
        )}
      </section>

      {/* Recent decisions + open actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-decisions-heading">
          <h2
            id="recent-decisions-heading"
            className="text-[20px] font-medium text-ink-display"
          >
            Recent decisions
          </h2>

          {recentDecisions.length > 0 ? (
            <div className="mt-4 flex flex-col gap-4">
              {recentDecisions.map((decision) => (
                <Card key={decision.id} priorityStrip={decision.priority}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-medium text-ink">{decision.title}</p>
                    <Badge tone={decision.priority}>{priorityLabel(decision.priority)}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-3">
                    {decision.summary}
                  </p>
                  <p className="mt-3 text-[12px] text-ink-3">{decision.meetingTitle}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No decisions yet"
                description="Confirmed decisions from your meetings will appear here."
              />
            </div>
          )}
        </section>

        <section aria-labelledby="open-actions-heading">
          <h2
            id="open-actions-heading"
            className="text-[20px] font-medium text-ink-display"
          >
            Open action items
          </h2>

          {openActions.length > 0 ? (
            <div className="mt-4 flex flex-col gap-4">
              {openActions.map((action) => (
                <Card key={action.id} priorityStrip={action.priority}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-medium text-ink">{action.title}</p>
                    <Badge tone={action.priority}>{priorityLabel(action.priority)}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={action.assignee} size="sm" />
                      <span className="text-[13px] text-ink-2">{action.assignee}</span>
                    </div>
                    <span className="text-[13px] text-ink-3">
                      Due {formatDueDate(action.dueDate)}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] text-ink-3">{action.meetingTitle}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No open action items"
                description="Action items assigned during meetings will show up here until they're done."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
