import type { CSSProperties } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CheckSquare, Scales, UsersThree, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import type { DashboardRecentMeeting } from "@/lib/api/types";
import { LocalTime } from "./LiveTime";
import { CardHead, Chip, EmptyBlock, ErrorBlock, TextLink } from "./parts";
import { formatDuration, minutesBetween, plural } from "./format";

/** Your ended meetings with what was confirmed in them: `/bff/dashboard` `recent_meetings`.
 *  The counts are confirmed decisions and tasks only; a candidate nobody confirmed is not one. */
export function RecentMeetings({
  meetings,
  failed,
  className,
  style,
}: {
  meetings: DashboardRecentMeeting[];
  failed: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Card role="region" aria-labelledby="recent-meetings-title" className={`p-0 ${className ?? ""}`} style={style}>
      <CardHead
        id="recent-meetings-title"
        title="Recent meetings"
        right={<TextLink href="/meetings">All meetings</TextLink>}
      />
      {failed ? (
        <ErrorBlock title="We could not load recent meetings" text="Your meetings are safe. Try again in a moment." />
      ) : meetings.length > 0 ? (
        <ul className="divide-y divide-line pb-2">
          {meetings.map((m) => {
            const start = m.scheduled_start ?? m.created_at;
            const minutes = minutesBetween(m.scheduled_start ?? undefined, m.scheduled_end ?? undefined);
            return (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="grid min-h-[44px] gap-x-4 gap-y-2 px-[18px] py-3.5 transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-[22px]"
                >
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold leading-snug text-ink">
                      {m.title ?? "Untitled meeting"}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-ink-3">
                      <span className="inline-flex items-center gap-1">
                        <UsersThree size={14} aria-hidden />
                        {plural(m.participant_count, "person", "people")}
                      </span>
                      <span>
                        <LocalTime iso={start} variant="when" />
                        {minutes ? `, ${formatDuration(minutes)}` : null}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5 sm:justify-end">
                    <Chip>
                      <Scales size={13} aria-hidden />
                      {plural(m.decision_count, "decision", "decisions")}
                    </Chip>
                    <Chip>
                      <CheckSquare size={13} aria-hidden />
                      {plural(m.action_count, "task", "tasks")}
                    </Chip>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyBlock
          icon={<VideoCamera size={24} aria-hidden />}
          title="No finished meetings yet"
          text="Once you have been in a meeting, it shows up here with the decisions and tasks confirmed in it."
          action={<TextLink href="/meetings">Open meetings</TextLink>}
        />
      )}
    </Card>
  );
}
