import Link from "next/link";
import { Broadcast, Check } from "@phosphor-icons/react/dist/ssr";
import { LocalTime, RelativeStart } from "./LiveTime";
import { CardHead, cardClass } from "@/components/ui/Card";
import { TextLink } from "@/components/ui/TextLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDuration, formatShortDate, minutesBetween } from "./format";
import type { HomeMeeting } from "./types";

const LATER_LIMIT = 4;
type State = "live" | "next" | "past" | "idle";

function Node({ state }: { state: State }) {
  const cls = {
    live: "border-priority-high bg-priority-high-soft",
    next: "border-signal bg-signal-soft",
    past: "border-ok bg-ok text-surface",
    idle: "border-line-2 bg-surface",
  }[state];
  return (
    <span aria-hidden className={`relative z-[1] mt-px grid h-[18px] w-[18px] place-items-center rounded-full border-2 ${cls}`}>
      {state === "past" ? <Check size={10} weight="bold" /> : null}
    </span>
  );
}

function Row({ meeting, isNext, nowMs }: { meeting: HomeMeeting; isNext: boolean; nowMs: number }) {
  const state: State =
    meeting.status === "live" ? "live" : meeting.status === "past" ? "past" : isNext ? "next" : "idle";
  const length = minutesBetween(meeting.startTime, meeting.endTime);
  return (
    <li className="grid grid-cols-[62px_18px_minmax(0,1fr)] items-start gap-x-3 py-[9px]">
      <div className="pt-0.5 text-right text-[12.5px] font-semibold leading-snug text-ink-3">
        {meeting.startTime ? <LocalTime iso={meeting.startTime} /> : "Not set"}
      </div>
      <Node state={state} />
      <Link
        href={`/meetings/${meeting.id}`}
        className="-mx-2 -my-1 block min-h-[40px] min-w-0 rounded-ctl px-2 py-1 transition-colors duration-150 hover:bg-surface-2 active:bg-bg-2"
      >
        <span
          className={`block text-[14px] leading-snug ${state === "past" ? "font-medium text-ink-3" : "font-semibold text-ink"}`}
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
            <span className="font-semibold text-signal-ink">
              Up next, <RelativeStart startIso={meeting.startTime} initialNow={nowMs} />
            </span>
          ) : state === "past" ? (
            length ? `Ended, ${formatDuration(length)}` : "Ended"
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

/** The current-time marker between what has happened today and what is still to come. */
function NowMarker() {
  return (
    <li role="separator" aria-label="Now" className="relative z-[1] grid grid-cols-[62px_18px_minmax(0,1fr)] items-center gap-x-3 py-1.5">
      <span className="text-right text-[12.5px] font-bold text-signal-ink">Now</span>
      <span aria-hidden className="h-[18px] w-[18px] rounded-full bg-signal shadow-[0_0_0_4px_var(--signal-soft)]" />
      <span aria-hidden className="h-0.5 rounded-full bg-signal-line opacity-60" />
    </li>
  );
}

/** Today's meetings as a timeline with a "now" marker, plus a short "Later" list for the rest. */
export function TodayTimeline({
  today,
  later,
  nextId,
  calendarFailed,
  nowMs,
  className = "",
}: {
  today: HomeMeeting[];
  later: HomeMeeting[];
  /** Id of the meeting highlighted as "up next" (the hero meeting), if it is in `today`. */
  nextId?: string;
  calendarFailed: boolean;
  nowMs: number;
  className?: string;
}) {
  const dateLabel = formatShortDate(new Date(nowMs).toISOString());
  const shownLater = later.slice(0, LATER_LIMIT);
  const moreLater = later.length - shownLater.length;
  // The marker goes before the first meeting that has not started yet; after everything when
  // the whole day is behind you. A live meeting counts as started.
  const firstAhead = today.findIndex((m) => m.status === "upcoming");
  const nowAt = firstAhead === -1 ? today.length : firstAhead;

  return (
    <section aria-labelledby="today-title" className={cardClass({ flush: true, className })}>
      <CardHead id="today-title" title="Today" right={<span className="text-[12.5px] font-semibold text-ink-3">{dateLabel}</span>} />

      {calendarFailed ? (
        <ErrorState variant="inline"
          title="We could not load your schedule"
          text="Your meetings are safe. This panel failed to load, and the rest of the page is unaffected."
        />
      ) : today.length === 0 && later.length === 0 ? (
        <EmptyState inCard art="calendar"
          title="A clear day"
          description="Meetings you schedule or are invited to appear here as a timeline, with the next one highlighted."
          action={<TextLink href="/meetings">Open meetings</TextLink>}
        />
      ) : (
        <>
          {today.length > 0 ? (
            <ol className="relative px-[18px] pb-[18px] pt-1 before:absolute before:bottom-7 before:left-[100px] before:top-[22px] before:w-0.5 before:rounded-full before:bg-line sm:px-[22px] sm:before:left-[104px]">
              {today.map((m, i) => (
                <FragmentRow key={m.id} showNow={i === nowAt}>
                  <Row meeting={m} isNext={m.id === nextId} nowMs={nowMs} />
                </FragmentRow>
              ))}
              {nowAt === today.length ? <NowMarker /> : null}
            </ol>
          ) : (
            <p className="px-[18px] pb-3 text-[14px] text-ink-3 sm:px-[22px]">Nothing else is scheduled today.</p>
          )}

          {shownLater.length > 0 ? (
            <div className="border-t border-line px-[18px] pb-[18px] pt-3.5 sm:px-[22px]">
              <h3 className="kicker mb-1.5">Later</h3>
              <ul className="divide-y divide-line">
                {shownLater.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/meetings/${m.id}`}
                      className="-mx-2 block min-h-[44px] rounded-ctl px-2 py-2 transition-colors duration-150 hover:bg-surface-2 active:bg-bg-2"
                    >
                      <span className="block truncate text-[14px] font-medium text-ink">{m.title}</span>
                      <span className="block text-[12.5px] text-ink-3">
                        {m.startTime ? <LocalTime iso={m.startTime} variant="when" /> : "Not scheduled yet"}
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
    </section>
  );
}

function FragmentRow({ showNow, children }: { showNow: boolean; children: React.ReactNode }) {
  return (
    <>
      {showNow ? <NowMarker /> : null}
      {children}
    </>
  );
}
