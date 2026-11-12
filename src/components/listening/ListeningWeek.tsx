"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, LockSimple, Repeat } from "@phosphor-icons/react";
import { Card, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LinkButton } from "@/components/ui/Button";
import { notifyError, notifySuccess } from "@/lib/toast";
import { clearAttendanceChoice, setAttendanceChoice } from "@/app/actions/listening";
import type { AttendanceChoice, ListeningWeek, WeekMeeting } from "@/lib/api/listening-types";
import { CHOICE_LABEL, addDays, groupWeek, savedLabel, sourceLabel, summarize, summaryLine, weekLabel, withChoice } from "@/lib/listening";
import { ChoiceControl } from "./ChoiceControl";

/* The week: every meeting you are invited to, each with Attend / Agent listens / Skip. Seven day
   columns from xl up (the choice as three icons with their names in the tooltip and for screen
   readers), one day under another below that (the choice with its words). A change shows at once
   and the headline recounts; if the server refuses it the meeting goes back and says why. Undo
   puts back what was there: your earlier choice, or what your rules say. */

const CONFIDENTIAL = "Confidential meeting: no Myte listens. Attend or skip.";

function time(iso: string | null | undefined, zone: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: zone }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function ListeningWeekView({ week, today }: { week: ListeningWeek; today: string }) {
  const [meetings, setMeetings] = useState<WeekMeeting[]>(week.meetings);
  const [busy, setBusy] = useState<string | null>(null);
  const summary = useMemo(() => summarize(meetings), [meetings]);
  const days = useMemo(() => groupWeek(meetings, week.week_start, week.time_zone, today), [meetings, week.week_start, week.time_zone, today]);
  const current = week.week_start <= today && today <= week.week_end;

  const choose = async (m: WeekMeeting, next: AttendanceChoice) => {
    if (next === m.choice || busy) return;
    const before = meetings;
    setBusy(m.meeting_id);
    setMeetings((list) => withChoice(list, m.meeting_id, next));
    const res = await setAttendanceChoice(m.meeting_id, next);
    setBusy(null);
    if (!res.ok) {
      setMeetings(before);
      notifyError(res.message);
      return;
    }
    setMeetings((list) => withChoice(list, m.meeting_id, res.data.choice, res.data.source));
    const undo = async () => {
      const back = m.source === "manual" ? await setAttendanceChoice(m.meeting_id, m.choice) : await clearAttendanceChoice(m.meeting_id);
      if (!back.ok) return notifyError(back.message);
      setMeetings((list) => withChoice(list, m.meeting_id, back.data.choice, back.data.source));
    };
    notifySuccess(next === "agent_listens" ? `Your Myte listens to ${m.title}` : next === "skip" ? `Skipping ${m.title}` : `Attending ${m.title}`, {
      undo: () => void undo(),
    });
  };

  return (
    <Card as="section" flush aria-labelledby="week-h">
      <CardHead
        id="week-h"
        title={current ? "Your week" : weekLabel(week.week_start, week.week_end)}
        description={
          <span aria-live="polite">
            {summaryLine(summary, current ? "This week" : "That week")}
            {summary.invited ? "." : ""}
          </span>
        }
        right={
          <nav aria-label="Weeks" className="flex items-center gap-1">
            <LinkButton href={`/meetings/listening?start=${addDays(week.week_start, -7)}`} variant="ghost" size="sm" icon aria-label="Previous week">
              <CaretLeft size={16} weight="bold" aria-hidden />
            </LinkButton>
            {!current ? (
              <LinkButton href="/meetings/listening" variant="outline" size="sm">
                This week
              </LinkButton>
            ) : null}
            <LinkButton href={`/meetings/listening?start=${addDays(week.week_start, 7)}`} variant="ghost" size="sm" icon aria-label="Next week">
              <CaretRight size={16} weight="bold" aria-hidden />
            </LinkButton>
          </nav>
        }
        divided
      />
      <Totals summary={summary} />
      {meetings.length === 0 ? (
        <div className="px-4 py-10 text-center sm:px-[22px]">
          <p className="display text-[20px] text-ink">No meetings this week</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-[14px] leading-relaxed text-ink-3">
            Meetings you are invited to show up here, each with a choice: attend, let your Myte listen, or skip.
          </p>
          <LinkButton href="/meetings" variant="outline" size="sm" className="mt-4">
            See all meetings
          </LinkButton>
        </div>
      ) : (
        <>
          {/* Seven columns from xl. */}
          <ol aria-label="Days" className="hidden grid-cols-7 divide-x divide-line border-t border-line xl:grid">
            {days.map((d) => (
              <li key={d.date} className={`min-w-0 ${d.today ? "bg-surface-2" : ""}`} aria-label={d.label}>
                <p className={`px-2.5 pb-2 pt-3 text-[13px] font-semibold ${d.today ? "text-signal-ink" : "text-ink-3"}`} aria-hidden>
                  {d.short} {d.date.slice(8).replace(/^0/, "")}
                  {d.today ? <span className="sr-only"> (today)</span> : null}
                </p>
                <ul className="space-y-2 px-2 pb-3">
                  {d.meetings.length === 0 ? (
                    <li className="px-1 py-2 text-[12.5px] text-ink-3">Nothing</li>
                  ) : (
                    d.meetings.map((m) => (
                      <li key={m.meeting_id} className="rounded-ctl border border-line bg-surface p-2 shadow-warm-1">
                        <p className="text-[12.5px] tabular-nums text-ink-3">{time(m.scheduled_start, week.time_zone)}</p>
                        <Link href={`/meetings/${m.meeting_id}`} className="mt-0.5 line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink hover:underline">
                          {m.title}
                        </Link>
                        <p className="mt-1 flex flex-wrap items-center gap-1 text-[12.5px] text-ink-3">
                          {CHOICE_LABEL[m.choice]}
                          {sourceLabel(m.source) === "by rule" ? ", by rule" : ""}
                        </p>
                        <div className="mt-1.5">
                          <ChoiceControl
                            name={`${m.meeting_id}-col`}
                            value={m.choice}
                            onChange={(c) => void choose(m, c)}
                            label={`Your choice for ${m.title}`}
                            agentDisabledReason={m.can_agent_listen ? null : CONFIDENTIAL}
                            disabled={busy === m.meeting_id || m.status === "ended"}
                            iconOnly
                          />
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </li>
            ))}
          </ol>
          {/* One day under another below xl. */}
          <ol aria-label="Days" className="divide-y divide-line border-t border-line xl:hidden">
            {days
              .filter((d) => d.meetings.length > 0)
              .map((d) => (
                <li key={d.date}>
                  <h3 className={`bg-surface-2 px-4 py-2 text-[13.5px] font-semibold sm:px-[22px] ${d.today ? "text-signal-ink" : "text-ink-2"}`}>
                    {d.label}
                    {d.today ? " (today)" : ""}
                  </h3>
                  <ul className="divide-y divide-line">
                    {d.meetings.map((m) => (
                      <li key={m.meeting_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3 sm:px-[22px]">
                        <div className="min-w-0 flex-[1_1_14rem]">
                          <Link href={`/meetings/${m.meeting_id}`} className="text-[15px] font-semibold leading-snug text-ink hover:underline">
                            {m.title}
                          </Link>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
                            <span className="tabular-nums">
                              {time(m.scheduled_start, week.time_zone)}, {m.duration_minutes} min
                            </span>
                            {m.recurring ? (
                              <Chip icon={<Repeat size={12} />}>Recurring</Chip>
                            ) : null}
                            {m.confidential ? <Chip icon={<LockSimple size={12} />}>Confidential</Chip> : null}
                            {m.source === "rule" ? <Chip tone="outline">By rule</Chip> : null}
                          </p>
                        </div>
                        <ChoiceControl
                          name={`${m.meeting_id}-row`}
                          value={m.choice}
                          onChange={(c) => void choose(m, c)}
                          label={`Your choice for ${m.title}`}
                          agentDisabledReason={m.can_agent_listen ? null : CONFIDENTIAL}
                          disabled={busy === m.meeting_id || m.status === "ended"}
                          size="sm"
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        </>
      )}
      <p className="border-t border-line px-4 py-3 text-[13px] text-ink-3 sm:px-[22px]">
        Times are in {week.time_zone.replace(/_/g, " ")}.{" "}
        <Link href="/settings/listening" className="font-semibold text-ink-2 underline-offset-4 hover:underline">
          Change it in Settings
        </Link>
      </p>
    </Card>
  );
}

function Totals({ summary }: { summary: ReturnType<typeof summarize> }) {
  const cells = [
    { label: "Attend", value: String(summary.attend) },
    { label: "Myte listens", value: String(summary.agent_listens) },
    { label: "Skip", value: String(summary.skip) },
    { label: "Time back", value: savedLabel(summary.minutes_saved) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="bg-surface px-4 py-3 sm:px-[22px]">
          <dt className="text-[13px] font-semibold text-ink-3">{c.label}</dt>
          <dd className="display mt-0.5 text-[26px] tabular-nums text-ink">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}
