"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  CalendarCheck,
  CaretLeft,
  CaretRight,
  CursorClick,
  Funnel,
  MagnifyingGlass,
  UserCircle,
  Users,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { initials, toneOf } from "@/components/room/tone";
import { Chip } from "./Chip";
import type { MeetingTemplate, OrgGoal } from "@/lib/api/meeting-brain-types";
import { NewMeeting, type NewMeetingMe } from "./NewMeeting";
import type { PickableMember } from "./MemberPicker";
import { MONTHS, addDays, dayKey, dayLabel, formatTime, mondayOf, sameDay, shortDate, startOfDay } from "./date-utils";
import type { HubMeeting } from "./types";

/* The meetings hub client island: Upcoming / Live / Past tabs, search by title or person, the
   meetings grouped by day in aligned rows, and a rail with a month calendar (pick a day to filter
   the list) and the week in numbers. Fed with the meetings the Server Component page read from
   core-api, and the workspace's members to name hosts and draw avatars.

   Everything date-shaped waits for mount: the server cannot know the visitor's time zone, so
   rendering times or "Today" there would disagree with the browser and break hydration. Until
   then the list shows placeholder rows of the same shape. */

export type HubPerson = { name: string; imageUrl: string | null; isYou: boolean };

type Tab = "upcoming" | "live" | "past";
const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live" },
  { id: "past", label: "Past" },
];

/** How close to its start an upcoming meeting counts as "starting soon" and offers Join. */
const SOON_MS = 10 * 60_000;
const MAX_AVATARS = 4;

function inTab(m: HubMeeting, tab: Tab): boolean {
  if (tab === "live") return m.status === "live";
  if (tab === "past") return m.status === "past";
  return m.status !== "past";
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function hours(minutes: number): string {
  const h = minutes / 60;
  return h === 0 ? "0" : h < 10 ? h.toFixed(1).replace(/\.0$/, "") : String(Math.round(h));
}

function SkeletonRows() {
  return (
    <div role="status" aria-label="Loading meetings">
      <div className="mt-group-head" aria-hidden="true">
        <span className="mt-skel" style={{ width: 120, height: 22 }} />
      </div>
      <div className="mx-card mt-card" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="mt-skel-row" key={i}>
            <span className="mt-skel" style={{ height: 34 }} />
            <span>
              <span className="mt-skel" style={{ width: "60%", height: 16, marginBottom: 8 }} />
              <span className="mt-skel" style={{ width: "38%", height: 12 }} />
            </span>
            <span className="mt-skel" style={{ height: 30 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MeetingsHub({
  meetings,
  people = {},
  invitable = null,
  me = null,
  unavailable = false,
  templates = [],
  goals = [],
}: {
  meetings: HubMeeting[];
  /** Internal user id to name and photo, for hosts, avatars and search by person. */
  people?: Record<string, HubPerson>;
  /** Members the empty state's New meeting can invite. */
  invitable?: PickableMember[] | null;
  /** You, for the empty state's New meeting host and owner pickers. */
  me?: NewMeetingMe | null;
  /** The list could not be loaded, which is not the same as having no meetings. */
  unavailable?: boolean;
  /** Meeting types and active goals for the empty state's New meeting (ADR-0039). */
  templates?: MeetingTemplate[] | null;
  goals?: OrgGoal[];
}) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [day, setDay] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date | null>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ upcoming: null, live: null, past: null });

  useEffect(() => {
    const t = new Date();
    setNow(t);
    setMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const q = query.trim().toLowerCase();
  const nameOf = (id: string) => people[id]?.name ?? "";

  const matches = (m: HubMeeting) => {
    if (day && !sameDay(new Date(m.startTime), day)) return false;
    if (!q) return true;
    const hay = `${m.title} ${m.participants.map((p) => nameOf(p.id)).join(" ")}`.toLowerCase();
    return hay.includes(q);
  };

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { upcoming: 0, live: 0, past: 0 };
    for (const m of meetings) if (matches(m)) for (const t of TABS) if (inTab(m, t.id)) c[t.id] += 1;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings, q, day, people]);

  const list = useMemo(() => {
    const rows = meetings.filter((m) => inTab(m, tab) && matches(m));
    rows.sort((a, b) => {
      if (tab !== "past") {
        if (a.status === "live" && b.status !== "live") return -1;
        if (b.status === "live" && a.status !== "live") return 1;
        return Date.parse(a.startTime) - Date.parse(b.startTime);
      }
      return Date.parse(b.startTime) - Date.parse(a.startTime);
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings, tab, q, day, people]);

  /* Group consecutive meetings by calendar day. */
  const groups = useMemo(() => {
    const out: { key: string; date: Date; items: HubMeeting[] }[] = [];
    for (const m of list) {
      const d = startOfDay(new Date(m.startTime));
      const key = dayKey(d);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(m);
      else out.push({ key, date: d, items: [m] });
    }
    return out;
  }, [list]);

  /* The week in numbers: Monday to Sunday around today, plain sums of real fields. */
  const week = useMemo(() => {
    if (!now) return null;
    const mon = mondayOf(now);
    const sun = addDays(mon, 6);
    const inWeek = meetings.filter((m) => {
      const d = startOfDay(new Date(m.startTime));
      return d >= mon && d <= sun;
    });
    const held = inWeek.filter((m) => m.status === "past" && !m.missed);
    return {
      range: `${shortDate(mon)} to ${shortDate(sun)}`,
      total: inWeek.length,
      ahead: inWeek.filter((m) => m.status !== "past").length,
      held: held.length,
      booked: inWeek.reduce((a, m) => a + m.durationMinutes, 0),
    };
  }, [meetings, now]);

  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of meetings) {
      const k = dayKey(new Date(m.startTime));
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [meetings]);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next: Tab | null = null;
    if (e.key === "ArrowRight") next = TABS[(i + 1) % TABS.length].id;
    else if (e.key === "ArrowLeft") next = TABS[(i + TABS.length - 1) % TABS.length].id;
    else if (e.key === "Home") next = TABS[0].id;
    else if (e.key === "End") next = TABS[TABS.length - 1].id;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const pickDay = (d: Date) => {
    if (day && sameDay(day, d)) return setDay(null);
    setDay(d);
    // Show the day's meetings even when they sit in another tab.
    const hits = meetings.filter((m) => sameDay(new Date(m.startTime), d));
    if (hits.length && !hits.some((m) => inTab(m, tab))) setTab(hits.some((m) => m.status !== "past") ? "upcoming" : "past");
  };

  const reset = () => {
    setQuery("");
    setDay(null);
  };

  const today = now ? startOfDay(now) : null;
  const filtered = Boolean(q || day);

  let body;
  if (unavailable) {
    body = (
      <div className="mx-card mt-state" role="alert">
        <WarningCircle size={34} weight="fill" className="mt-state-ico is-error" aria-hidden />
        <h3>Could not load your meetings</h3>
        <p>The meeting service did not respond. Your meetings are safe, only the list failed to load.</p>
        <Button onClick={() => router.refresh()}>
          <ArrowClockwise size={18} weight="bold" aria-hidden />
          Try again
        </Button>
      </div>
    );
  } else if (!now || !today) {
    body = <SkeletonRows />;
  } else if (meetings.length === 0) {
    body = (
      <EmptyState
        title="No meetings yet"
        description="Start or schedule a meeting. Your agent joins it with you, takes notes and holds decisions for you to confirm."
        action={<NewMeeting members={invitable} me={me} templates={templates} goals={goals} />}
      />
    );
  } else if (groups.length === 0) {
    body = filtered ? (
      <EmptyState
        title="No meetings match"
        description="Nothing in this tab fits your search and the day you picked. Try clearing them."
        action={
          <Button variant="outline" onClick={reset}>
            Clear search and day
          </Button>
        }
      />
    ) : tab === "live" ? (
      <EmptyState title="Nothing live right now" description="When a meeting starts, it shows up here with a Join button." />
    ) : tab === "upcoming" ? (
      <EmptyState title="Nothing scheduled" description="New meetings appear here as soon as they are booked." />
    ) : (
      <EmptyState title="No ended meetings yet" description="Once a meeting has run, its transcript and outcomes are a click away from here." />
    );
  } else {
    body = groups.map((g) => {
      const label = dayLabel(g.date, today);
      return (
        <div className="mt-group" key={g.key}>
          <div className="mt-group-head">
            <h3>{label.primary}</h3>
            <span>{label.secondary}</span>
          </div>
          <div className="mx-card mt-card">
            {g.items.map((m) => (
              <Row key={m.id} m={m} now={now} people={people} />
            ))}
          </div>
        </div>
      );
    });
  }

  return (
    <div className="mt-layout">
      <section aria-label="Meeting list" className="mt-main">
        <div className="mt-tools">
          <div className="mt-tabs" role="tablist" aria-label="Meeting status" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`mt-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="mt-panel"
                tabIndex={tab === t.id ? 0 : -1}
                className="mt-tab tap"
                onClick={() => setTab(t.id)}
              >
                {t.id === "live" && now && counts.live > 0 ? <span className="mx-live-dot" aria-hidden="true" /> : null}
                {t.label}
                <span className="mx-count">{now ? counts[t.id] : "-"}</span>
              </button>
            ))}
          </div>
          <label className="mt-search">
            <MagnifyingGlass size={18} aria-hidden />
            <input
              type="search"
              placeholder="Search by title or person"
              aria-label="Search meetings"
              autoComplete="off"
              value={query}
              disabled={unavailable}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {day ? (
          <div className="mt-dayrow">
            <Chip tone="accent">
              <CalendarCheck size={15} aria-hidden />
              Showing {shortDate(day)}
            </Chip>
            <button type="button" className="mt-link tap" onClick={() => setDay(null)}>
              Clear day
            </button>
          </div>
        ) : null}

        <div id="mt-panel" role="tabpanel" aria-labelledby={`mt-tab-${tab}`}>
          {body}
        </div>
        <p className="sr-only" aria-live="polite">
          {now && !unavailable ? plural(list.length, "meeting", "meetings") : ""}
        </p>
      </section>

      <aside className="mt-rail" aria-label="Calendar and this week">
        <div className="mx-card mx-card-pad">
          <div className="cal-head">
            <h2 className="cal-month">{month ? `${MONTHS[month.getMonth()]} ${month.getFullYear()}` : "Calendar"}</h2>
            <div className="cal-nav">
              <button
                type="button"
                className="cx-icon-btn sm tap"
                aria-label="Previous month"
                disabled={!month}
                onClick={() => month && setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <CaretLeft size={16} weight="bold" aria-hidden />
              </button>
              <button
                type="button"
                className="cx-icon-btn sm tap"
                aria-label="Next month"
                disabled={!month}
                onClick={() => month && setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <CaretRight size={16} weight="bold" aria-hidden />
              </button>
            </div>
          </div>
          {month && today ? (
            <div className="cal-grid">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span className="cal-dow" aria-hidden="true" key={i}>
                  {d}
                </span>
              ))}
              {Array.from({ length: 42 }, (_, i) => addDays(mondayOf(month), i)).map((d) => {
                const n = perDay.get(dayKey(d)) ?? 0;
                const isToday = sameDay(d, today);
                const sel = day ? sameDay(d, day) : false;
                return (
                  <button
                    key={d.getTime()}
                    type="button"
                    className={`cal-day tap${d.getMonth() !== month.getMonth() ? " is-out" : ""}${isToday ? " is-today" : ""}${n ? " has-mt" : ""}${sel ? " is-sel" : ""}`}
                    aria-pressed={sel}
                    aria-label={`${shortDate(d)}${isToday ? ", today" : ""}, ${n ? plural(n, "meeting", "meetings") : "no meetings"}`}
                    onClick={() => pickDay(d)}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="mt-skel" style={{ height: 250 }} aria-hidden="true" />
          )}
          <p className="cal-note">
            {day ? (
              <>
                <Funnel size={16} aria-hidden />
                Filtering to {shortDate(day)}. Select it again to clear.
              </>
            ) : (
              <>
                <CursorClick size={16} aria-hidden />
                Select a day to filter the list.
              </>
            )}
          </p>
        </div>

        <div className="mx-card mx-card-pad">
          <div className="mx-card-head">
            <h2 className="mx-card-title">This week</h2>
            {week ? <span className="mx-card-note">{week.range}</span> : null}
          </div>
          {week ? (
            <dl className="wk-grid">
              <div>
                <dt>Meetings</dt>
                <dd>{week.total}</dd>
              </div>
              <div>
                <dt>Still ahead</dt>
                <dd>{week.ahead}</dd>
              </div>
              <div>
                <dt>Held</dt>
                <dd>{week.held}</dd>
              </div>
              <div>
                <dt>Time booked</dt>
                <dd>
                  {hours(week.booked)} <small>hrs</small>
                </dd>
              </div>
            </dl>
          ) : (
            <span className="mt-skel" style={{ height: 120 }} aria-hidden="true" />
          )}
        </div>
      </aside>
    </div>
  );
}

function Row({ m, now, people }: { m: HubMeeting; now: Date; people: Record<string, HubPerson> }) {
  const start = new Date(m.startTime);
  const until = start.getTime() - now.getTime();
  const live = m.status === "live";
  const past = m.status === "past";
  const soon = m.status === "upcoming" && until >= 0 && until <= SOON_MS;
  // A meeting recorded on a phone in a room has no call to join; it opens like any other.
  const joinable = (live || soon) && !m.recordedInPerson;

  const host = m.participants.find((p) => p.role === "host");
  const hostPerson = host ? people[host.id] : undefined;
  const hostLine = hostPerson ? (hostPerson.isYou ? "Hosted by you" : `Hosted by ${hostPerson.name.split(" ")[0]}`) : null;
  const shown = m.participants.slice(0, MAX_AVATARS);
  const extra = m.participants.length - shown.length;

  const chip = live ? (
    <Chip tone="high">
      <span className="mx-live-dot" aria-hidden="true" />
      {m.recordedInPerson ? "Recording in person" : "Live"}
    </Chip>
  ) : m.recordedInPerson && past ? (
    <Chip>Recorded in person</Chip>
  ) : soon ? (
    <Chip tone="accent">Starts in {Math.max(1, Math.ceil(until / 60_000))} min</Chip>
  ) : past ? (
    <Chip>{m.missed ? "Nobody joined" : "Ended"}</Chip>
  ) : (
    <Chip tone="low">Scheduled</Chip>
  );

  return (
    <div className={`mt-row${live ? " is-live" : ""}`}>
      <div className="mt-time">
        <b>{formatTime(start)}</b>
        <span>{m.durationMinutes} min</span>
      </div>
      <div className="mt-body">
        <Link className="mt-title" href={`/meetings/${m.id}`}>
          {m.title}
        </Link>
        <div className="mt-meta">
          {hostLine ? (
            <span>
              <UserCircle size={15} aria-hidden />
              {hostLine}
            </span>
          ) : null}
          <span>
            <Users size={15} aria-hidden />
            {plural(m.invited, "person", "people")} invited
          </span>
        </div>
      </div>
      <div className="mx-avs mt-avs" role="img" aria-label={plural(m.participants.length, "participant", "participants")}>
        {shown.map((p) => {
          const who = people[p.id];
          return (
            <span className={`mx-av sm ${toneOf(p.id)}`} key={p.id} title={who?.name}>
              {who?.imageUrl ? (
                // Clerk's CDN; a plain <img> keeps it out of next/image's domain list.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={who.imageUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                initials(who?.name ?? "?")
              )}
            </span>
          );
        })}
        {extra > 0 ? <span className="mx-av sm mt-more">+{extra}</span> : null}
      </div>
      <span className="mt-status">{chip}</span>
      <span className="mt-act">
        {joinable ? (
          <LinkButton href={`/meetings/${m.id}/join`} size="sm">
            <span className="sr-only">Join {m.title}</span>
            <span aria-hidden="true">Join</span>
          </LinkButton>
        ) : past && !m.missed ? (
          <LinkButton href={`/meetings/${m.id}/transcript`} variant="outline" size="sm">
            <span className="sr-only">Transcript of {m.title}</span>
            <span aria-hidden="true">Transcript</span>
          </LinkButton>
        ) : (
          <LinkButton href={`/meetings/${m.id}`} variant="outline" size="sm">
            <span className="sr-only">Open {m.title}</span>
            <span aria-hidden="true">Open</span>
          </LinkButton>
        )}
      </span>
    </div>
  );
}
