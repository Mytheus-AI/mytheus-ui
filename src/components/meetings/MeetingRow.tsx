"use client";

import Link from "next/link";
import { Article, CheckSquare, ListChecks, Scales, VideoCamera } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "./Chip";
import { formatTime } from "./date-utils";
import type { HubMeeting } from "./types";

/* One meeting in a day group. The whole row is the link to the detail page (stretched title
   link); the Join/Open action sits above it. At 760px and up it is a five column grid, below
   that it collapses to three stacked bands: time and status, title and facts, people and action. */

const ROW_BASE =
  "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-4 py-3.5 transition-colors duration-150 min-[760px]:grid-cols-[88px_minmax(0,1fr)_auto_128px_84px] min-[760px]:gap-x-4 min-[760px]:px-5 min-[760px]:py-4";
const ROW_IDLE =
  "hover:bg-[color-mix(in_srgb,var(--bg)_55%,var(--surface))] focus-within:bg-[color-mix(in_srgb,var(--bg)_55%,var(--surface))]";
const ROW_LIVE = "bg-[image:var(--wash)] hover:brightness-[1.02]";

const ACTION_BASE =
  "relative z-[2] inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 text-[13px] font-semibold transition-[background-color,filter,transform] duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function MeetingRow({
  meeting,
  past,
  divided,
}: {
  meeting: HubMeeting;
  past?: boolean;
  /** Draws the hairline between rows. */
  divided?: boolean;
}) {
  const live = meeting.status === "live";
  const start = new Date(meeting.startTime);
  const shown = meeting.participants.slice(0, 4);
  const extra = meeting.participants.length - shown.length;
  const metaTone = live ? "text-ink-2" : "text-ink-3";

  const facts: { key: string; icon: React.ReactNode; text: string }[] = [];
  if (meeting.agendaCount > 0) {
    facts.push({
      key: "agenda",
      icon: <ListChecks size={14} aria-hidden />,
      text: `${plural(meeting.agendaCount, "agenda item", "agenda items")}`,
    });
  }
  if (meeting.decisionCount > 0) {
    facts.push({
      key: "decisions",
      icon: <Scales size={14} aria-hidden />,
      text: plural(meeting.decisionCount, "decision", "decisions"),
    });
  }
  if (meeting.actionCount > 0) {
    facts.push({
      key: "actions",
      icon: <CheckSquare size={14} aria-hidden />,
      text: plural(meeting.actionCount, "action", "actions"),
    });
  }
  if (meeting.hasTranscript) {
    facts.push({ key: "transcript", icon: <Article size={14} aria-hidden />, text: "Transcript" });
  }

  return (
    <li className={`${ROW_BASE} ${live ? ROW_LIVE : ROW_IDLE} ${divided ? "border-t border-line" : ""}`}>
      <div className="col-start-1 row-start-1 flex items-baseline gap-2 min-[760px]:block min-[760px]:[grid-area:auto]">
        <b className="block text-[15px] font-bold leading-tight text-ink">{formatTime(start)}</b>
        <span className={`text-[12.5px] ${metaTone}`}>{meeting.durationMinutes} min</span>
      </div>

      <div className="col-span-2 row-start-2 min-w-0 min-[760px]:col-span-1 min-[760px]:[grid-area:auto]">
        <Link
          href={`/meetings/${meeting.id}`}
          className="inline-block max-w-full text-[15.5px] font-semibold leading-snug tracking-[-0.005em] text-ink after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:content-[''] hover:underline hover:underline-offset-[3px] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-signal"
        >
          {meeting.title}
        </Link>
        {facts.length > 0 && (
          <ul className={`mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] ${metaTone}`}>
            {facts.map((f) => (
              <li key={f.key} className="inline-flex items-center gap-1.5">
                {f.icon}
                {f.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        role="img"
        aria-label={plural(meeting.participants.length, "participant", "participants")}
        className="col-start-1 row-start-3 flex items-center -space-x-2 min-[760px]:[grid-area:auto]"
      >
        {shown.map((name) => (
          <Avatar key={name} name={name} size="sm" className="ring-2 ring-surface" />
        ))}
        {extra > 0 && (
          <span className="relative z-0 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-bg-2 px-1.5 text-[11px] font-semibold text-ink-2 ring-2 ring-surface">
            +{extra}
          </span>
        )}
      </div>

      <div className="col-start-2 row-start-1 justify-self-end min-[760px]:justify-self-start min-[760px]:[grid-area:auto]">
        {live ? (
          <Chip tone="high" className="gap-2">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-priority-high opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-priority-high" />
            </span>
            Live
          </Chip>
        ) : past ? (
          <Chip>Ended</Chip>
        ) : (
          <Chip tone="low">Scheduled</Chip>
        )}
      </div>

      <div className="col-start-2 row-start-3 justify-self-end min-[760px]:justify-self-end min-[760px]:[grid-area:auto]">
        {past ? (
          <Link
            href={`/meetings/${meeting.id}`}
            aria-label={`Open ${meeting.title}`}
            className={`${ACTION_BASE} border border-line-2 text-ink hover:bg-bg`}
          >
            Open
          </Link>
        ) : live ? (
          <Link
            href={`/meetings/${meeting.id}/room`}
            aria-label={`Join ${meeting.title}`}
            className={`${ACTION_BASE} bg-signal-deep text-white hover:brightness-110 [.mx-app[data-theme=dark]_&]:text-bg`}
          >
            <VideoCamera size={15} weight="bold" aria-hidden />
            Join
          </Link>
        ) : (
          <Link
            href={`/meetings/${meeting.id}/room`}
            aria-label={`Join ${meeting.title}`}
            className={`${ACTION_BASE} border border-line-2 text-ink hover:bg-bg`}
          >
            Join
          </Link>
        )}
      </div>
    </li>
  );
}
