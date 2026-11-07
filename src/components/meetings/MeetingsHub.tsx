"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Article,
  CalendarBlank,
  CalendarCheck,
  CheckSquare,
  ListChecks,
  MagnifyingGlass,
  VideoCameraSlash,
} from "@phosphor-icons/react";
import { Chip } from "./Chip";
import { MeetingRow } from "./MeetingRow";
import { MeetingsCalendar } from "./MeetingsCalendar";
import { PanelEmpty } from "./PanelEmpty";
import { WeekSummary } from "./WeekSummary";
import { dayKey, dayLabel, sameDay, shortDate, startOfDay } from "./date-utils";
import type { HubMeeting } from "./types";

/* The meetings hub: Upcoming / Live / Past tabs, search, filters, a day-grouped list, and the
   calendar and week rail. This is the one client island on the page; the page itself stays a
   Server Component and hands this the meetings it already read.

   Everything date-shaped waits for mount. The server cannot know the visitor's time zone, so
   rendering "Today" or day groups there would disagree with the browser and cause a hydration
   mismatch. Until `now` exists the list shows its loading skeleton, which is also the honest
   state: the day grouping genuinely is not known yet. */

type TabKey = "up" | "live" | "past";
const TABS: { key: TabKey; label: string }[] = [
  { key: "up", label: "Upcoming" },
  { key: "live", label: "Live" },
  { key: "past", label: "Past" },
];

type FilterKey = "agenda" | "transcript" | "outcomes";
type Filters = Record<FilterKey, boolean>;
const NO_FILTERS: Filters = { agenda: false, transcript: false, outcomes: false };

const FILTERS: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: "agenda", label: "With agenda", icon: <ListChecks size={15} aria-hidden /> },
  { key: "transcript", label: "With transcript", icon: <Article size={15} aria-hidden /> },
  { key: "outcomes", label: "With outcomes", icon: <CheckSquare size={15} aria-hidden /> },
];

function inTab(m: HubMeeting, tab: TabKey): boolean {
  if (tab === "up") return m.status !== "past";
  if (tab === "live") return m.status === "live";
  return m.status === "past";
}

function matches(m: HubMeeting, q: string, f: Filters, day: Date | null): boolean {
  if (f.agenda && m.agendaCount === 0) return false;
  if (f.transcript && !m.hasTranscript) return false;
  if (f.outcomes && m.decisionCount + m.actionCount === 0) return false;
  if (day && !sameDay(new Date(m.startTime), day)) return false;
  if (q) {
    const hay = `${m.title} ${m.participants.join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-lg bg-bg-2 motion-safe:animate-pulse ${className}`} />;
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading meetings">
      <Skeleton className="mb-3 ml-1 h-6 w-32" />
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`grid grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-4 px-5 py-[18px] ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <Skeleton className="h-9" />
            <div>
              <Skeleton className="mb-2 h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-7" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading meetings</span>
    </div>
  );
}

function RailSkeleton() {
  return (
    <div aria-hidden className="grid gap-5 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-1">
      <div className="rounded-card border border-line bg-surface p-5">
        <Skeleton className="mb-4 h-6 w-36" />
        <Skeleton className="h-56" />
      </div>
      <div className="rounded-card border border-line bg-surface p-5">
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MeetingsHub({ meetings }: { meetings: HubMeeting[] }) {
  const [now, setNow] = useState<Date | null>(null);
  const [tab, setTab] = useState<TabKey>("up");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [day, setDay] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date | null>(null);
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    up: null,
    live: null,
    past: null,
  });

  useEffect(() => {
    const d = new Date();
    setNow(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = Boolean(q || day || filters.agenda || filters.transcript || filters.outcomes);
  const today = now ? startOfDay(now) : null;

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { up: 0, live: 0, past: 0 };
    for (const m of meetings) {
      if (!matches(m, q, filters, day)) continue;
      (Object.keys(c) as TabKey[]).forEach((k) => {
        if (inTab(m, k)) c[k] += 1;
      });
    }
    return c;
  }, [meetings, q, filters, day]);

  const groups = useMemo(() => {
    const list = meetings
      .filter((m) => inTab(m, tab) && matches(m, q, filters, day))
      .map((m) => ({ m, at: new Date(m.startTime) }))
      .sort((a, b) =>
        tab === "past" ? b.at.getTime() - a.at.getTime() : a.at.getTime() - b.at.getTime(),
      );
    const out: { day: Date; items: HubMeeting[] }[] = [];
    for (const { m, at } of list) {
      const last = out[out.length - 1];
      if (last && sameDay(last.day, at)) last.items.push(m);
      else out.push({ day: startOfDay(at), items: [m] });
    }
    return { out, total: list.length };
  }, [meetings, tab, q, filters, day]);

  const dayCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of meetings) {
      const k = dayKey(new Date(m.startTime));
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [meetings]);

  const clearAll = () => {
    setQuery("");
    setFilters(NO_FILTERS);
    setDay(null);
  };

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.key === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].key;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const onSelectDay = (d: Date) => {
    if (day && sameDay(day, d)) {
      setDay(null);
      return;
    }
    setDay(d);
    const hits = meetings.filter((m) => sameDay(new Date(m.startTime), d));
    if (hits.length > 0 && !hits.some((m) => inTab(m, tab))) {
      setTab(hits[0].status === "past" ? "past" : "up");
    }
    if (month && d.getMonth() !== month.getMonth()) {
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const emptyCopy =
    tab === "live"
      ? { title: "Nothing live right now", text: "When a meeting starts it shows up here with a Join button." }
      : { title: "Nothing here yet", text: "Meetings your team schedules through Mytheus will appear here." };

  return (
    <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-label="Meeting list" className="min-w-0">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Meeting status"
              onKeyDown={onTabKey}
              className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-pill bg-bg-2 p-1"
            >
              {TABS.map((t) => {
                const selected = tab === t.key;
                return (
                  <button
                    key={t.key}
                    ref={(el) => {
                      tabRefs.current[t.key] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`mt-tab-${t.key}`}
                    aria-selected={selected}
                    aria-controls="mt-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(t.key)}
                    className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-[10px] px-3.5 text-[13.5px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                      selected
                        ? "bg-surface text-ink shadow-[0_1px_2px_rgba(40,30,20,0.12)]"
                        : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    {t.key === "live" && counts.live > 0 && (
                      <span aria-hidden className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-priority-high opacity-60 motion-safe:animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-priority-high" />
                      </span>
                    )}
                    {t.label}
                    <span
                      className={`rounded-full px-1.5 text-[11.5px] ${
                        selected ? "bg-bg-2 text-ink-2" : "bg-surface text-ink-3"
                      }`}
                    >
                      {now ? counts[t.key] : "-"}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="relative block min-w-[200px] flex-1">
              <span className="sr-only">Search meetings</span>
              <MagnifyingGlass
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or person"
                autoComplete="off"
                className="h-11 w-full rounded-pill border border-line-2 bg-surface pl-10 pr-3 text-[14px] text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-signal"
              />
            </label>
          </div>

          <div role="group" aria-label="Filters" className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const on = filters[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilters((cur) => ({ ...cur, [f.key]: !cur[f.key] }))}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                    on
                      ? "border-pill bg-pill text-white"
                      : "border-line-2 bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              );
            })}
            <span className="ml-auto text-[12.5px] text-ink-3" aria-live="polite">
              {now && meetings.length > 0
                ? `${groups.total} ${groups.total === 1 ? "meeting" : "meetings"}`
                : ""}
            </span>
          </div>
        </div>

        <div id="mt-panel" role="tabpanel" aria-labelledby={`mt-tab-${tab}`}>
          {!now || !today ? (
            <ListSkeleton />
          ) : meetings.length === 0 ? (
            <PanelEmpty
              icon={<CalendarBlank size={34} />}
              title="No meetings yet"
              description="Meetings will show up here once your team starts scheduling them through Mytheus."
            />
          ) : (
            <>
              {day && (
                <div className="mb-3.5 flex flex-wrap items-center gap-2">
                  <Chip tone="accent">
                    <CalendarCheck size={14} aria-hidden />
                    Showing {shortDate(day)}
                  </Chip>
                  <button
                    type="button"
                    onClick={() => setDay(null)}
                    className="h-8 rounded-pill px-3 text-[13px] font-semibold text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink active:scale-[0.97]"
                  >
                    Clear day
                  </button>
                </div>
              )}

              {groups.out.length === 0 ? (
                <PanelEmpty
                  icon={
                    tab === "live" && !filtered ? (
                      <VideoCameraSlash size={34} />
                    ) : (
                      <CalendarBlank size={34} />
                    )
                  }
                  title={filtered ? "No meetings match" : emptyCopy.title}
                  description={
                    filtered
                      ? "Nothing in this tab fits your search and filters. Try clearing them."
                      : emptyCopy.text
                  }
                  action={
                    filtered ? (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="h-11 rounded-pill border border-line-2 px-5 text-[14px] font-semibold text-ink transition-[background-color,transform] duration-150 hover:bg-bg active:scale-[0.98]"
                      >
                        Clear search and filters
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="flex flex-col gap-[22px]">
                  {groups.out.map((g) => {
                    const lbl = dayLabel(g.day, today);
                    return (
                      <section key={g.day.getTime()} aria-label={lbl.primary}>
                        <div className="flex flex-wrap items-baseline gap-x-2.5 px-1 pb-2.5">
                          <h3 className="display text-[20px] text-ink-display">{lbl.primary}</h3>
                          <span className="text-[13px] text-ink-3">{lbl.secondary}</span>
                        </div>
                        <ul className="overflow-hidden rounded-card border border-line bg-surface">
                          {g.items.map((m, i) => (
                            <MeetingRow
                              key={m.id}
                              meeting={m}
                              past={m.status === "past"}
                              divided={i > 0}
                            />
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <aside
        aria-label="Calendar and week summary"
        className="min-w-0 min-[1100px]:sticky min-[1100px]:top-2"
      >
        {!now || !today || !month ? (
          <RailSkeleton />
        ) : (
          <div className="grid gap-5 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-1">
            <MeetingsCalendar
              today={today}
              month={month}
              selected={day}
              counts={dayCounts}
              onMonthChange={setMonth}
              onSelect={onSelectDay}
            />
            <WeekSummary meetings={meetings} today={today} />
          </div>
        )}
      </aside>
    </div>
  );
}
