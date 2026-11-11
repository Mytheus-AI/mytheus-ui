"use client";

import Link from "next/link";
import { CalendarBlank, Lightning } from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { capacitySegments, weekSummary, type Capacity, type CapacityLevel } from "@/lib/promises/ledger";

/* The week capacity bar: one column per workday (a weekend day only when something lands on it),
   each a track that fills with what that day already holds: the meeting share drawn darker, the
   things due on top, the colour saying how full it is (green has room, amber is tight, red is
   too full). A line of plain words says the same for everyone, and each day is a list item with
   its own sentence, so the bar is never the only signal. Private to you: nothing here is shared. */

const FILL: Record<CapacityLevel, string> = {
  ok: "bg-ok",
  tight: "bg-priority-medium",
  over: "bg-priority-high",
  off: "bg-ink-4",
};

const LEVEL_WORD: Record<CapacityLevel, string> = { ok: "Room", tight: "Tight", over: "Full", off: "Off" };

export function CapacityWeek({
  capacity,
  today,
  loading = false,
  error = null,
  onRetry,
}: {
  capacity: Capacity | null;
  today: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const segments = capacity ? capacitySegments(capacity, today) : [];
  return (
    <Card as="section" aria-labelledby="week-h" className="!py-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 id="week-h" className="display text-[20px] text-ink-display">
            Your week
          </h2>
          <p className="mt-1 text-[14.5px] text-ink-3" aria-live="polite">
            {error ? error : capacity ? weekSummary(capacity, today) : "Reading your week..."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {capacity && capacity.overdue ? (
            <Chip tone="outline" className="!text-priority-high">
              {capacity.overdue} overdue
            </Chip>
          ) : null}
          {capacity && capacity.undated ? (
            <Chip tone="outline" icon={<CalendarBlank size={13} />}>
              {capacity.undated} with no date
            </Chip>
          ) : null}
          {error && onRetry ? (
            <button type="button" onClick={onRetry} className="h-9 rounded-ctl px-3 text-[14px] font-semibold text-ink-2 hover:bg-bg-2">
              Retry
            </button>
          ) : null}
        </div>
      </div>

      {loading && !capacity ? (
        <div className="mt-4 grid grid-cols-5 gap-2" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mx-bone h-[74px] rounded-ctl bg-bg-2" />
          ))}
        </div>
      ) : segments.length ? (
        <ol className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }} aria-label="Your days this week">
          {segments.map((s) => (
            <li key={s.date} className="min-w-0" title={s.description}>
              <span className="sr-only">{s.description}</span>
              <div aria-hidden className="flex items-baseline justify-between gap-1">
                <span className={`text-[13px] font-semibold ${s.isToday ? "text-ink" : "text-ink-3"}`}>{s.short}</span>
                <span className="hidden truncate text-[12.5px] tabular-nums text-ink-3 sm:inline">{s.items ? `${s.items} due` : ""}</span>
                <span className="text-[12.5px] tabular-nums text-ink-3 sm:hidden">{s.items || ""}</span>
              </div>
              <div
                aria-hidden
                className={`relative mt-1.5 h-3 overflow-hidden rounded-full bg-bg-2 ${s.isToday ? "ring-1 ring-ink-4 ring-offset-1 ring-offset-surface" : ""}`}
              >
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${FILL[s.level]} ${s.isPast ? "opacity-50" : ""} transition-[width] duration-200 motion-reduce:transition-none`}
                  style={{ width: `${Math.round(s.fill * 100)}%` }}
                />
                {s.meetingFill > 0 ? (
                  <div className="absolute inset-y-0 left-0 rounded-full bg-ink-2 opacity-40" style={{ width: `${Math.round(s.meetingFill * 100)}%` }} />
                ) : null}
              </div>
              <div aria-hidden className="mt-1.5 flex items-center justify-between gap-1 text-[12.5px] text-ink-3">
                <span className={s.level === "over" ? "font-semibold text-priority-high" : s.level === "tight" ? "font-semibold text-priority-medium" : ""}>
                  {s.away ? "Away" : LEVEL_WORD[s.level]}
                </span>
                {s.meetingHours ? <span className="hidden truncate tabular-nums sm:inline">{s.meetingHours} h mtg</span> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {capacity ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3 text-[13px] text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-4 rounded-full bg-ink-2 opacity-40" /> Meetings
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-4 rounded-full bg-ok" /> Promises and tasks due
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lightning size={13} aria-hidden />
            {capacity.calendar_synced ? (
              "Counts your Google Calendar too, with focus time kept free."
            ) : (
              <>
                Only Mytheus meetings count.{" "}
                <Link href="/settings/integrations" className="font-semibold text-ink-2 underline-offset-4 hover:underline">
                  Google Calendar
                </Link>{" "}
                adds the rest.
              </>
            )}
          </span>
        </div>
      ) : null}
    </Card>
  );
}
