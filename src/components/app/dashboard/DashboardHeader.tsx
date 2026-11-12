import type { ReactNode } from "react";
import { Greeting, RelativeStart } from "./LiveTime";
import { plural } from "./format";
import type { HomeMeeting } from "./types";

function Figure({
  value,
  label,
  className = "",
}: {
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 px-3 first:pl-0 last:pr-0 min-[721px]:px-[30px] ${className}`}>
      <span className="display block text-[34px] leading-none text-ink min-[721px]:text-[40px]">
        {value === "-" ? (
          <>
            <span aria-hidden>-</span>
            <span className="sr-only">Not available</span>
          </>
        ) : (
          value
        )}
      </span>
      <span className="mt-1.5 block max-w-none text-[12.5px] font-semibold leading-snug text-ink-3 min-[721px]:max-w-[13ch]">
        {label}
      </span>
    </div>
  );
}

/** Greeting in the serif, a one-sentence lede, and three plain figures. No cards, no deltas. */
export function DashboardHeader({
  firstName,
  nowIso,
  nowMs,
  next,
  calendarFailed,
  todayCount,
  openTasks,
  needsYou,
}: {
  firstName: string;
  nowIso: string;
  nowMs: number;
  /** The hero meeting, or null when there is none. */
  next: HomeMeeting | null;
  /** The meetings arm could not be read. Not the same as an empty calendar. */
  calendarFailed: boolean;
  todayCount: number;
  /** null when that panel could not be read: shown as a dash, never as zero. */
  openTasks: number | null;
  needsYou: number | null;
}) {
  const waiting: ReactNode =
    needsYou === null ? (
      <>.</>
    ) : needsYou > 0 ? (
      <>
        , and your Myte is waiting on <b className="font-semibold text-ink">{plural(needsYou, "item", "items")}</b> from you.
      </>
    ) : (
      <>, and your Myte has nothing waiting on you.</>
    );

  let lede: ReactNode;
  if (calendarFailed) {
    lede = "We could not load your calendar. The rest of this page is unaffected.";
  } else if (next && next.status === "live") {
    lede = (
      <>
        <b className="font-semibold text-ink">{next.title}</b> is live now{waiting}
      </>
    );
  } else if (next) {
    lede = (
      <>
        <b className="font-semibold text-ink">{next.title}</b> starts{" "}
        <b className="font-semibold text-ink">
          <RelativeStart startIso={next.startTime} initialNow={nowMs} />
        </b>
        {waiting}
      </>
    );
  } else {
    lede = <>Your calendar is clear{waiting}</>;
  }

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5 pb-6 pt-2 min-[721px]:pb-7">
      <div className="min-w-0 flex-[1_1_380px]">
        <h1 className="display text-[clamp(28px,3vw,34px)] text-ink-display">
          <Greeting initialIso={nowIso} />, {firstName}
        </h1>
        <p className="mt-2 max-w-[56ch] text-[15px] leading-normal text-ink-3">{lede}</p>
      </div>
      <div
        role="group"
        aria-label="At a glance"
        className="grid flex-[1_1_100%] grid-cols-3 divide-x divide-line min-[721px]:flex min-[721px]:flex-[0_0_auto]"
      >
        <Figure value={calendarFailed ? "-" : todayCount} label="Meetings today" />
        <Figure value={openTasks ?? "-"} label="Open tasks" />
        <Figure value={needsYou ?? "-"} label="Items need you" />
      </div>
    </header>
  );
}
