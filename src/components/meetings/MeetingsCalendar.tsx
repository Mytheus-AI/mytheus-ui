"use client";

import { CaretLeft, CaretRight, CursorClick, Funnel } from "@phosphor-icons/react";
import { MONTHS, addDays, dayKey, mondayOf, sameDay, shortDate } from "./date-utils";

/* Month grid, Monday first, always six weeks so the card never changes height while paging.
   A day is a toggle that filters the list; the dot under a number is real state (a meeting is
   scheduled or held that day). */

const ICON_BTN =
  "grid h-8 w-8 place-items-center rounded-pill text-ink-2 transition-[background-color,color,transform] duration-150 hover:bg-bg-2 hover:text-ink active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100";

const DAY_BASE =
  "relative grid h-10 place-items-center rounded-[10px] text-[13.5px] font-semibold transition-[background-color,color,transform,filter] duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100";

export function MeetingsCalendar({
  today,
  month,
  selected,
  counts,
  onMonthChange,
  onSelect,
}: {
  today: Date;
  /** First day of the month on show. */
  month: Date;
  selected: Date | null;
  /** `dayKey` to number of meetings that day. */
  counts: Map<string, number>;
  onMonthChange: (next: Date) => void;
  onSelect: (day: Date) => void;
}) {
  const y = month.getFullYear();
  const mo = month.getMonth();
  const start = mondayOf(new Date(y, mo, 1));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <section className="rounded-card border border-line bg-surface p-5" aria-label="Calendar">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="display text-[19px] text-ink-display" aria-live="polite">
          {MONTHS[mo]} {y}
        </h2>
        <div className="flex gap-0.5">
          <button
            type="button"
            className={ICON_BTN}
            aria-label="Previous month"
            onClick={() => onMonthChange(new Date(y, mo - 1, 1))}
          >
            <CaretLeft size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={ICON_BTN}
            aria-label="Next month"
            onClick={() => onMonthChange(new Date(y, mo + 1, 1))}
          >
            <CaretRight size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={i}
            aria-hidden
            className="pb-1.5 pt-1 text-[11.5px] font-bold tracking-[0.04em] text-ink-3"
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          const n = counts.get(dayKey(d)) ?? 0;
          const isToday = sameDay(d, today);
          const isSel = selected ? sameDay(d, selected) : false;
          const out = d.getMonth() !== mo;
          const tone = isToday
            ? "bg-signal-deep text-white hover:brightness-110 [.mx-app[data-theme=dark]_&]:text-bg"
            : out
              ? "font-medium text-ink-3 hover:bg-bg-2 hover:text-ink"
              : "text-ink-2 hover:bg-bg-2 hover:text-ink";
          return (
            <button
              key={dayKey(d)}
              type="button"
              aria-pressed={isSel}
              aria-label={`${shortDate(d)}${isToday ? ", today" : ""}, ${
                n ? `${n} ${n === 1 ? "meeting" : "meetings"}` : "no meetings"
              }`}
              onClick={() => onSelect(d)}
              className={`${DAY_BASE} ${tone} ${isSel ? "ring-2 ring-inset ring-ink" : ""}`}
            >
              {d.getDate()}
              {n > 0 && (
                <span
                  aria-hidden
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    isToday
                      ? "bg-white [.mx-app[data-theme=dark]_&]:bg-bg"
                      : "bg-signal-deep"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex min-h-7 items-center gap-2 text-[12.5px] text-ink-3">
        {selected ? (
          <>
            <Funnel size={14} aria-hidden />
            Filtering to {shortDate(selected)}. Select it again to clear.
          </>
        ) : (
          <>
            <CursorClick size={14} aria-hidden />
            Select a day to filter the list.
          </>
        )}
      </p>
    </section>
  );
}
