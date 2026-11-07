import type { CSSProperties } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CheckSquare, Scales, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { mockMeetings } from "@/lib/mock/data";
import { CardHead, Chip, EmptyBlock, TextLink } from "./parts";
import { formatClock, formatDuration, formatShortDate, plural } from "./format";

/** Finished meetings with what the agent captured. There is no past-meetings arm on
 *  `GET /bff/dashboard` yet, so this reads the mock (as the decisions panel does). */
export function RecentMeetings({ className, style }: { className?: string; style?: CSSProperties }) {
  const recent = mockMeetings
    .filter((m) => m.status === "past")
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 4);

  return (
    <Card role="region" aria-labelledby="recent-meetings-title" className={`p-0 ${className ?? ""}`} style={style}>
      <CardHead
        id="recent-meetings-title"
        title="Recent meetings"
        right={<TextLink href="/meetings">All meetings</TextLink>}
      />
      {recent.length > 0 ? (
        <ul className="divide-y divide-line pb-2">
          {recent.map((m) => {
            const shown = m.participants.slice(0, 3);
            const extra = m.participants.length - shown.length;
            return (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="grid min-h-[44px] gap-x-4 gap-y-2 px-[18px] py-3.5 transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-[22px]"
                >
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold leading-snug text-ink">
                      {m.title}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-ink-3">
                      <span className="flex items-center">
                        {shown.map((name, i) => (
                          <Avatar
                            key={name}
                            name={name}
                            size="sm"
                            className={i === 0 ? "" : "-ml-2 ring-2 ring-surface"}
                          />
                        ))}
                        {extra > 0 ? (
                          <span className="-ml-2 grid h-7 w-7 place-items-center rounded-full bg-bg-2 text-[11px] font-medium text-ink-3 ring-2 ring-surface">
                            +{extra}
                          </span>
                        ) : null}
                      </span>
                      <span>
                        {formatShortDate(m.startTime)}, {formatClock(m.startTime)},{" "}
                        {formatDuration(m.durationMinutes)}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5 sm:justify-end">
                    <Chip>
                      <Scales size={13} aria-hidden />
                      {plural(m.decisionCount, "decision", "decisions")}
                    </Chip>
                    <Chip>
                      <CheckSquare size={13} aria-hidden />
                      {plural(m.actionCount, "action", "actions")}
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
          title="No meetings yet"
          text="Once you have held a meeting, it shows up here with the decisions and action items your agent captured."
          action={<TextLink href="/meetings">Open meetings</TextLink>}
        />
      )}
    </Card>
  );
}
