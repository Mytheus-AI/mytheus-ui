"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { Tag } from "./Tag";
import { addDays, dayDiff, mondayOf, shortDate, startOfDay } from "./date-utils";
import type { HubMeeting } from "./types";

/* The meetings hub client island: search, the All / Upcoming / Ended filter, the "Up next" and
   "Past" lists, and the rail. Ported from the meeting design (non/mytheus-web meetings page) and
   fed with the meetings the Server Component page already read.

   Everything date-shaped waits for mount: the server cannot know the visitor's time zone, so
   rendering times or "Today" there would disagree with the browser and break hydration. Until
   then the lists show placeholders of the same shape. */

const FILTERS = ["All", "Upcoming", "Ended"] as const;
type Filter = (typeof FILTERS)[number];

/** How close to its start an upcoming meeting counts as "starting soon" and offers Join. */
const SOON_MS = 10 * 60_000;

const clock = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function shortDay(d: Date, today: Date): string {
  const diff = dayDiff(d, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return shortDate(d);
}

function matches(m: HubMeeting, q: string): boolean {
  if (!q) return true;
  return `${m.title} ${m.participants.join(" ")}`.toLowerCase().includes(q);
}

function hoursAndMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function Skeleton() {
  return (
    <div className="rec-list" role="status" aria-label="Loading meetings">
      {[0, 1, 2].map((i) => (
        <div className="up-card" key={i} aria-hidden="true">
          <span className="mh-skel" style={{ width: 74, height: 48, borderRadius: 12 }} />
          <span className="up-body">
            <span className="mh-skel" style={{ width: "55%", height: 13 }} />
            <span className="mh-skel" style={{ width: "35%", height: 10, marginTop: 8 }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function MeetingsHub({ meetings }: { meetings: HubMeeting[] }) {
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const q = query.trim().toLowerCase();

  const upcoming = useMemo(
    () =>
      filter === "Ended"
        ? []
        : meetings
            .filter((m) => m.status !== "past" && matches(m, q))
            .sort((a, b) => {
              if (a.status === "live" && b.status !== "live") return -1;
              if (b.status === "live" && a.status !== "live") return 1;
              return Date.parse(a.startTime) - Date.parse(b.startTime);
            }),
    [meetings, filter, q],
  );

  const past = useMemo(
    () =>
      filter === "Upcoming"
        ? []
        : meetings
            .filter((m) => m.status === "past" && matches(m, q))
            .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime)),
    [meetings, filter, q],
  );

  /* The rail's "This week": Monday to Sunday around today, plain sums of real fields. */
  const week = useMemo(() => {
    if (!now) return null;
    const mon = mondayOf(now);
    const sun = addDays(mon, 6);
    const inWeek = meetings.filter((m) => {
      const d = startOfDay(new Date(m.startTime));
      return d >= mon && d <= sun;
    });
    return {
      count: inWeek.length,
      minutes: inWeek.reduce((a, m) => a + m.durationMinutes, 0),
      decisions: inWeek.reduce((a, m) => a + m.decisionCount, 0),
      actions: inWeek.reduce((a, m) => a + m.actionCount, 0),
    };
  }, [meetings, now]);

  /* The next call is the live one, else the earliest scheduled one. */
  const next = useMemo(() => {
    const open = meetings.filter((m) => m.status !== "past");
    return (
      open.find((m) => m.status === "live") ??
      [...open].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0]
    );
  }, [meetings]);

  const today = now ? startOfDay(now) : null;

  return (
    <div className="canvas cols-2">
      <div>
        <div className="tr-toolbar reveal" style={{ animationDelay: ".05s" }}>
          <div className="tr-search">
            <MagnifyingGlass size={14} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search meetings"
              aria-label="Search meetings"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="seg" role="group" aria-label="Filter meetings">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                className={`seg-btn tap${filter === f ? " is-on" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {!now || !today ? (
          <Skeleton />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <div className="section-label reveal" style={{ animationDelay: ".08s", paddingBottom: 9 }}>
                  Up next
                </div>
                <div className="rec-list" style={{ marginBottom: 22 }}>
                  {upcoming.map((m, i) => {
                    const start = new Date(m.startTime);
                    const until = start.getTime() - now.getTime();
                    const soon = m.status === "upcoming" && until >= 0 && until <= SOON_MS;
                    const joinable = m.status === "live" || soon;
                    return (
                      <div
                        className="up-card reveal"
                        style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                        key={m.id}
                      >
                        <span className="up-when">
                          <b>{clock.format(start)}</b>
                          <span>{shortDay(start, today)}</span>
                        </span>
                        <span className="up-body">
                          <strong>{m.title}</strong>
                          <small>
                            {m.durationMinutes} min · {plural(m.participants.length, "person", "people")} invited
                          </small>
                        </span>
                        <span className="up-acts">
                          {joinable ? (
                            <span className="live-chip">
                              <span className="live-dot" aria-hidden="true"></span>
                              {m.status === "live"
                                ? "Live now"
                                : `Starts in ${Math.max(1, Math.ceil(until / 60_000))} min`}
                            </span>
                          ) : (
                            <Tag variant="neutral">{shortDay(start, today)}</Tag>
                          )}
                          <Link href={`/meetings/${m.id}`} className="btn-ghost-sm tap">
                            Details
                          </Link>
                          {joinable && (
                            <Link
                              href={`/meetings/${m.id}/join`}
                              className="btn-accent-sm tap"
                              aria-label={`Join ${m.title}`}
                            >
                              Join
                            </Link>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {past.length > 0 && (
              <>
                <div className="section-label reveal" style={{ animationDelay: ".12s", paddingBottom: 9 }}>
                  Past
                </div>
                <div className="rec-list">
                  {past.map((m, i) => (
                    <div
                      className="rec-card reveal"
                      style={{ animationDelay: `${0.14 + i * 0.05}s` }}
                      key={m.id}
                    >
                      <Link
                        href={`/meetings/${m.id}`}
                        className="rec-play tap"
                        aria-label={`Open meeting: ${m.title}`}
                      >
                        <ArrowRight size={15} weight="bold" aria-hidden="true" />
                      </Link>
                      <div className="rec-main">
                        <div className="rec-title-row">
                          <strong>{m.title}</strong>
                          <Tag variant="neutral">{shortDay(new Date(m.startTime), today)}</Tag>
                        </div>
                        <div className="rec-meta">
                          {m.durationMinutes} min · {plural(m.participants.length, "person", "people")}
                          {m.hasTranscript ? " · transcribed" : ""}
                        </div>
                        {m.recap && <p className="rec-sum">{m.recap}</p>}
                        {(m.decisionCount > 0 || m.actionCount > 0) && (
                          <div className="rec-tags">
                            {m.decisionCount > 0 && (
                              <Tag variant="green" dot>
                                {plural(m.decisionCount, "decision", "decisions")}
                              </Tag>
                            )}
                            {m.actionCount > 0 && (
                              <Tag variant="orange" dot>
                                {plural(m.actionCount, "action", "actions")}
                              </Tag>
                            )}
                          </div>
                        )}
                        <div className="meet-links">
                          <Link href={`/meetings/${m.id}`} className="foot-link tap">
                            Open meeting
                          </Link>
                          {m.hasTranscript && (
                            <Link href={`/meetings/${m.id}/transcript`} className="foot-link tap">
                              Transcript
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {upcoming.length === 0 && past.length === 0 && (
              <div className="board-empty" style={{ borderTop: "none" }} aria-live="polite">
                {meetings.length === 0
                  ? "No meetings yet. Meetings your team schedules through Mytheus appear here."
                  : q
                    ? `No meetings match "${query.trim()}". Try a different search.`
                    : filter === "Upcoming"
                      ? "Nothing scheduled. New meetings appear here as soon as they are booked."
                      : "No ended meetings yet."}
              </div>
            )}
          </>
        )}
      </div>

      <div className="rail-stack">
        <div className="panel reveal" style={{ animationDelay: ".12s" }}>
          <div className="panel-head">
            <h2>This week</h2>
          </div>
          <div className="panel-body">
            {!week ? (
              <span className="mh-skel" style={{ height: 90 }} aria-hidden="true" />
            ) : week.count === 0 ? (
              <p className="rail-note" style={{ marginTop: 0 }}>
                Nothing on your calendar this week.
              </p>
            ) : (
              [
                {
                  n: String(week.count),
                  label: `${week.count === 1 ? "meeting" : "meetings"}, ${hoursAndMinutes(week.minutes)} in calls`,
                },
                { n: String(week.decisions), label: week.decisions === 1 ? "decision captured" : "decisions captured" },
                { n: String(week.actions), label: week.actions === 1 ? "action captured" : "actions captured" },
              ].map((d) => (
                <div className="digest-row" key={d.label}>
                  <b>{d.n}</b>
                  <span>{d.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {next && (
          <div className="panel reveal" style={{ animationDelay: ".16s" }}>
            <div className="panel-head">
              <h2>Before your next call</h2>
            </div>
            <div className="panel-body">
              <p className="rail-note" style={{ marginTop: 0 }}>
                <b>{next.title}</b>
                {next.status === "live" ? " is live now. " : " is next on your calendar. "}
                {next.agendaCount > 0
                  ? `Its agenda has ${plural(next.agendaCount, "item", "items")}, ready to read before you join.`
                  : "No agenda has been shared for it yet."}
              </p>
              <div className="meet-links">
                <Link href={`/meetings/${next.id}`} className="foot-link tap">
                  Open meeting
                </Link>
                {next.status === "live" && (
                  <Link href={`/meetings/${next.id}/join`} className="foot-link tap">
                    Join
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
