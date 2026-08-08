import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockMeetings } from "@/lib/mock/data";
import type { MeetingView } from "@/lib/api/present";
import type { ArmStatus } from "@/lib/api/types";
import {
  MOCK_NOW,
  daysFromNow,
  formatClock,
  formatDayLong,
  formatDuration,
  isSameUTCDay,
} from "./format";

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

function MeetingRow({ meeting }: { meeting: MeetingView }) {
  const live = meeting.status === "live";
  // Both are absent on real data until later bands: duration comes from transcription
  // (Plan 3-4) and the participant list needs joined user records with display names. The
  // row shows what it has instead of rendering "0 attendees", which would state a
  // fabricated fact as a measured one.
  const attendees = meeting.participants?.length;
  const duration = meeting.durationMinutes;
  const subtitle = live
    ? [`Started ${formatClock(meeting.startTime)}`, duration ? formatDuration(duration) : null]
        .filter(Boolean)
        .join(" · ")
    : attendees !== undefined
      ? `${attendees} attendee${attendees === 1 ? "" : "s"}`
      : formatClock(meeting.startTime);
  return (
    <li
      className={`flex min-w-0 items-center gap-3 px-5 py-3 sm:gap-4 ${
        live ? "bg-signal-soft" : ""
      }`}
    >
      <div className="w-[72px] shrink-0">
        {live ? (
          <Badge tone="danger">Live</Badge>
        ) : (
          <>
            <p className="font-mono text-[12.5px] tabular-nums text-ink-2">
              {formatClock(meeting.startTime)}
            </p>
            {/* Omitted rather than shown as "0m": duration arrives with transcription. */}
            {duration !== undefined ? (
              <p className="mt-0.5 font-mono text-[10.5px] text-ink-3">
                {formatDuration(duration)}
              </p>
            ) : null}
          </>
        )}
      </div>

      <Link
        href={`/meetings/${meeting.id}`}
        className="group flex min-h-[44px] min-w-0 flex-1 flex-col justify-center"
      >
        <p className="truncate text-[14px] font-medium text-ink transition-colors duration-150 group-hover:text-signal-deep">
          {meeting.title}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{subtitle}</p>
      </Link>

      {meeting.participants?.length ? (
        <div className="hidden shrink-0 md:block">
          <AvatarStack names={meeting.participants} />
        </div>
      ) : null}

      <div className="shrink-0">
        {live ? (
          <LinkButton
            href={`/meetings/${meeting.id}/room`}
            size="sm"
            className="min-h-[40px]"
          >
            Join room
          </LinkButton>
        ) : (
          <Link
            href={`/meetings/${meeting.id}`}
            className="flex min-h-[40px] items-center rounded-pill px-3 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-bg-2 hover:text-ink"
          >
            Details
          </Link>
        )}
      </div>
    </li>
  );
}

export function TodaysMeetings({
  className = "",
  meetings,
  status,
}: {
  className?: string;
  /** Real `bff` data when supplied. Falls back to the mock so any caller that has not been
   *  reconciled yet keeps rendering exactly as before. */
  meetings?: MeetingView[];
  /** The arm status from `GET /bff/dashboard`. `degraded` is NOT the same as empty: one means
   *  the panel failed to load, the other that there is nothing scheduled, and showing
   *  "nothing on the calendar" for a failed read is the specific mistake the status prevents. */
  status?: ArmStatus;
}) {
  const source: MeetingView[] = meetings ?? mockMeetings;
  // Real data is already filtered and ordered by the server (`upcoming_meetings`, ascending
  // with NULLs last), so re-filtering it against MOCK_NOW would hide everything. Only the
  // mock needs the local day filter.
  const isReal = meetings !== undefined;
  const now = isReal ? new Date() : MOCK_NOW;

  const today = isReal
    ? source
    : source
        .filter((m) => m.status !== "past" && isSameUTCDay(new Date(m.startTime), now))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const tomorrow = isReal
    ? undefined
    : source
        .filter((m) => m.status === "upcoming" && daysFromNow(m.startTime) === 1)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  const degraded = status === "degraded";

  return (
    <section
      aria-labelledby="todays-meetings-heading"
      className={`flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 px-5 pt-4">
        <div className="min-w-0">
          <h2
            id="todays-meetings-heading"
            className="text-[17px] font-medium text-ink-display"
          >
            Today&apos;s meetings
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">{formatDayLong(MOCK_NOW)}</p>
        </div>
        <Link
          href="/meetings"
          className="link-underline flex min-h-[40px] shrink-0 items-center text-[13px] font-medium text-ink-2"
        >
          View all
        </Link>
      </div>

      {degraded ? (
        <div className="mt-3 flex-1 border-t border-line p-5">
          <EmptyState
            className="py-10"
            title="Could not load your meetings"
            description="This panel failed to load. The rest of the dashboard is unaffected; reload to try again."
          />
        </div>
      ) : today.length > 0 ? (
        <ul className="mt-3 flex-1 divide-y divide-line border-t border-line">
          {today.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} />
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex-1 border-t border-line p-5">
          <EmptyState
            className="py-10"
            title="Nothing on the calendar today"
            description="Meetings you're invited to will show up here on the day they run."
          />
        </div>
      )}

      {tomorrow ? (
        <p className="border-t border-line bg-bg-2 px-5 py-3 text-[12.5px] text-ink-3">
          Tomorrow: <span className="text-ink-2">{tomorrow.title}</span> ·{" "}
          {formatClock(tomorrow.startTime)}
        </p>
      ) : null}
    </section>
  );
}
