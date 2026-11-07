import type { CSSProperties } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Broadcast, CalendarBlank, Check } from "@phosphor-icons/react/dist/ssr";
import { LocalTime, RelativeStart } from "./LiveTime";
import { CardHead, EmptyBlock, ErrorBlock, TextLink } from "./parts";
import { formatDuration, formatShortDate, minutesBetween } from "./format";
import type { HomeMeeting } from "./types";

const LATER_LIMIT = 4;

function Node({ state }: { state: "live" | "next" | "past" | "idle" }) {
  const cls = {
    live: "border-signal bg-signal-soft",
    next: "border-signal bg-signal-soft",
    past: "border-line-2 bg-bg-3",
    idle: "border-line-2 bg-surface",
  }[state];
  return (
    <span
      aria-hidden
      className={`relative z-[1] mt-px grid h-[18px] w-[18px] place-items-center rounded-full border-2 ${cls}`}
    >
      {state === "past" ? <Check size={10} weight="bold" className="text-ink-3" /> : null}
    </span>
  );
}

function Row({
  meeting,
  isNext,
  nowMs,
}: {
  meeting: HomeMeeting;
  isNext: boolean;
  nowMs: number;
}) {
  const state = meeting.status === "live" ? "live" : meeting.status === "past" ? "past" : isNext ? "next" : "idle";
  const length = minutesBetween(meeting.startTime, meeting.endTime);
  return (
    <li className="grid grid-cols-[62px_18px_minmax(0,1fr)] items-start gap-x-3 py-[9px]">
      <div className="pt-0.5 text-right text-[12.5px] font-semibold leading-snug text-ink-3">
        {meeting.startTime ? <LocalTime iso={meeting.startTime} /> : "TBD"}
      </div>
      <Node state={state} />
      <Link
        href={`/meetings/${meeting.id}`}
        className="-mx-2 -my-1 block min-w-0 rounded-pill px-2 py-1 transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3"
      >
        <span
          className={`block text-[14px] leading-snug ${
            state === "past" ? "font-medium text-ink-3" : "font-semibold text-ink"
          }`}
        >
          {meeting.title}
        </span>
        <span className="block text-[12.5px] text-ink-3">
          {state === "live" ? (
            <span className="inline-flex items-center gap-1 font-semibold text-priority-high">
              <Broadcast size={13} weight="fill" aria-hidden />
              Live now
            </span>
          ) : state === "next" ? (
            <span className="font-semibold text-signal-deep">
              Up next, <RelativeStart startIso={meeting.startTime} initialNow={nowMs} />
            </span>
          ) : state === "past" ? (
            "Ended"
          ) : length ? (
            formatDuration(length)
          ) : (
            "Scheduled"
          )}
        </span>
      </Link>
    </li>
  );
}

/** Today's meetings as a timeline, plus a short "Later" list for the rest of the arm. */
export function TodayTimeline({
  today,
  later,
  nextId,
  calendarFailed,
  nowMs,
  className,
  style,
}: {
  today: HomeMeeting[];
  later: HomeMeeting[];
  /** Id of the meeting highlighted as "up next" (the hero meeting), if it is in `today`. */
  nextId?: string;
  calendarFailed: boolean;
  nowMs: number;
  className?: string;
  style?: CSSProperties;
}) {
  const dateLabel = formatShortDate(new Date(nowMs).toISOString());
  const shownLater = later.slice(0, LATER_LIMIT);
  const moreLater = later.length - shownLater.length;

  return (
    <Card
      role="region"
      aria-labelledby="today-title"
      className={`p-0 ${className ?? ""}`}
      style={style}
    >
      <CardHead
        id="today-title"
        title="Today"
        right={<span className="text-[13px] font-semibold text-ink-3">{dateLabel}</span>}
      />

      {calendarFailed ? (
        <ErrorBlock
          title="We could not load your schedule"
          text="Your meetings are safe. This panel failed to load, and the rest of the page is unaffected."
        />
      ) : today.length === 0 && later.length === 0 ? (
        <EmptyBlock
          icon={<CalendarBlank size={24} aria-hidden />}
          title="A clear day"
          text="Meetings you schedule or are invited to appear here as a timeline, with the next one highlighted."
          action={<TextLink href="/meetings">Open meetings</TextLink>}
        />
      ) : (
        <>
          {today.length > 0 ? (
            <ol
              className={`relative px-[18px] pb-[18px] pt-1 sm:px-[22px] ${
                today.length > 1
                  ? "before:absolute before:bottom-7 before:left-[100px] before:top-[22px] before:w-0.5 before:rounded-sm before:bg-line sm:before:left-[104px]"
                  : ""
              }`}
            >
              {today.map((m) => (
                <Row key={m.id} meeting={m} isNext={m.id === nextId} nowMs={nowMs} />
              ))}
            </ol>
          ) : (
            <p className="px-[18px] pb-3 text-[14px] text-ink-3 sm:px-[22px]">
              Nothing else is scheduled today.
            </p>
          )}

          {shownLater.length > 0 ? (
            <div className="border-t border-line px-[18px] pb-[18px] pt-3.5 sm:px-[22px]">
              <h3 className="kicker mb-1.5 uppercase">Later</h3>
              <ul className="divide-y divide-line">
                {shownLater.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/meetings/${m.id}`}
                      className="-mx-2 block min-h-[44px] rounded-pill px-2 py-2 transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3"
                    >
                      <span className="block truncate text-[14px] font-medium text-ink">
                        {m.title}
                      </span>
                      <span className="block text-[12.5px] text-ink-3">
                        {m.startTime ? (
                          <LocalTime iso={m.startTime} variant="when" />
                        ) : (
                          "Not scheduled yet"
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {moreLater > 0 ? (
                <div className="mt-1">
                  <TextLink href="/meetings">{moreLater} more in Meetings</TextLink>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
