import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Article,
  CalendarBlank,
  CheckCircle,
  CheckSquare,
  Circle,
  Clock,
  ListChecks,
  Scales,
  Sparkle,
  VideoCamera,
} from "@phosphor-icons/react/ssr";
import { Avatar } from "@/components/ui/Avatar";
import { ActionLink } from "@/components/meetings/ActionLink";
import { Chip } from "@/components/meetings/Chip";
import { MeetingTabs, type MeetingTab } from "@/components/meetings/MeetingTabs";
import { PanelEmpty } from "@/components/meetings/PanelEmpty";
import {
  mockMeetings,
  mockMeetingDetails,
  mockDecisions,
  mockActions,
  mockTranscriptChunks,
} from "@/lib/mock/data";

export const metadata: Metadata = { title: "Meeting | Mytheus" };

/* Meeting detail (pre/post): agenda, participants, and, for past meetings, the outcomes the
   agents captured (decisions, action items, recap). RSC on mock data. The header and every tab
   panel are rendered here on the server; only the tab switcher is a client island.

   Left out on purpose, because the app has no data or behaviour behind them yet: a recording
   player, the confirmed-versus-unconfirmed split, accepted invites and consent status, and the
   Confirm, Edit, Share and Copy invite buttons. */

export function generateStaticParams() {
  return mockMeetings.map((m) => ({ meetingId: m.id }));
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** "2026-07-05" as a local calendar date, so no time zone can move it a day. */
function parseDueDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-line bg-surface p-5 ${className}`}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const TEXT_LINK =
  "inline-flex items-center gap-1.5 rounded-md text-[13px] font-semibold text-signal-deep transition-colors hover:underline hover:underline-offset-[3px] active:opacity-70";

export default function MeetingDetailPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);
  if (!meeting) notFound();

  const detail = mockMeetingDetails.find((d) => d.meetingId === meeting.id);
  const decisions = mockDecisions.filter((d) => d.meetingId === meeting.id);
  const actions = mockActions.filter((a) => a.meetingId === meeting.id);
  const chunks = mockTranscriptChunks.filter((c) => c.meetingId === meeting.id);
  const hasTranscript = chunks.length > 0;
  const isPast = meeting.status === "past";
  const agenda = detail?.agenda ?? [];

  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.durationMinutes * 60_000);
  const shown = meeting.participants.slice(0, 4);
  const extra = meeting.participants.length - shown.length;
  const transcriptHref = `/meetings/${meeting.id}/transcript`;

  /* ---------- shared blocks ---------- */

  const agendaCard = (
    <Panel title="Agenda">
      {agenda.length > 0 ? (
        <ol className="flex flex-col">
          {agenda.map((item, i) => (
            <li
              key={item}
              className={`flex gap-3.5 py-2.5 text-[14.5px] text-ink ${i > 0 ? "border-t border-line" : ""}`}
            >
              <span className="w-6 shrink-0 pt-px text-[12.5px] font-bold tabular-nums text-signal-deep">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 break-words font-medium">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[14px] text-ink-3">No agenda was set for this meeting.</p>
      )}
    </Panel>
  );

  const peopleCard = (
    <Panel title={isPast ? "Participants" : "Who is coming"}>
      <ul className="flex flex-col">
        {meeting.participants.map((name, i) => (
          <li
            key={name}
            className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
          >
            <Avatar name={name} size="md" />
            <span className="min-w-0 truncate text-[14px] font-medium text-ink">{name}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );

  /* ---------- overview ---------- */

  const overview = isPast ? (
    <div className="grid items-start gap-6 min-[1060px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Panel
          title="Recap"
          action={
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
              <Sparkle size={15} weight="fill" className="text-signal-deep" aria-hidden />
              Captured by your agent
            </span>
          }
        >
          {detail?.recap ? (
            <p className="font-medium leading-[1.45] tracking-[-0.01em] text-ink [font-family:var(--font-newsreader),Georgia,serif] text-[18px] min-[700px]:text-[21px]">
              {detail.recap}
            </p>
          ) : (
            <p className="text-[14px] text-ink-3">
              No recap was written for this meeting. Decisions and action items appear in their own
              tabs when there are any.
            </p>
          )}
          <dl className="mt-[18px] flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-4">
            {[
              { n: String(decisions.length), l: decisions.length === 1 ? "decision" : "decisions" },
              { n: String(actions.length), l: actions.length === 1 ? "action item" : "action items" },
              {
                n: String(meeting.participants.length),
                l: meeting.participants.length === 1 ? "participant" : "participants",
              },
              { n: `${meeting.durationMinutes} min`, l: "length" },
            ].map((s) => (
              <div key={s.l}>
                <dd className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">
                  {s.n}
                </dd>
                <dt className="text-[12.5px] text-ink-3">{s.l}</dt>
              </div>
            ))}
          </dl>
        </Panel>
        {agendaCard}
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        {peopleCard}
        <Panel title="Transcript">
          {hasTranscript ? (
            <>
              <p className="text-[14px] text-ink-2">
                {plural(chunks.length, "line", "lines")} of conversation, searchable, with speakers
                you can match to teammates.
              </p>
              <Link href={transcriptHref} className={`${TEXT_LINK} mt-3`}>
                Open transcript
                <ArrowRight size={14} aria-hidden />
              </Link>
            </>
          ) : (
            <p className="text-[14px] text-ink-3">
              This meeting ran before transcription was enabled.
            </p>
          )}
        </Panel>
      </div>
    </div>
  ) : (
    <div className="grid items-start gap-6 min-[1060px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        {agendaCard}
        <Panel title="Before you join">
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            Your agent has the agenda and the relevant history from earlier meetings. Notes it takes
            in the room are yours only, and nothing is saved or assigned without your confirm.
          </p>
        </Panel>
      </div>
      <div className="flex min-w-0 flex-col gap-5">{peopleCard}</div>
    </div>
  );

  /* ---------- transcript ---------- */

  const excerpt = chunks.slice(0, 8);
  const transcriptPanel = hasTranscript ? (
    <div className="grid items-start gap-6 min-[1060px]:grid-cols-[minmax(0,1fr)_340px]">
      <Panel
        title="Transcript"
        action={
          <span className="text-[13px] text-ink-3">
            First {excerpt.length} of {chunks.length} lines
          </span>
        }
        className="min-w-0"
      >
        <ol>
          {excerpt.map((c, i) => {
            const [mm, ss] = c.at.split(":").map(Number);
            const seconds = (mm || 0) * 60 + (ss || 0);
            return (
              <li
                key={c.id}
                className={`grid grid-cols-[50px_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 py-2.5 min-[700px]:grid-cols-[56px_132px_minmax(0,1fr)] ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <Link
                  href={`${transcriptHref}#t=${seconds}`}
                  aria-label={`Open transcript at ${c.at}`}
                  className="self-start rounded-md py-px text-[12.5px] font-bold tabular-nums text-ink-3 transition-colors hover:text-signal-deep hover:underline hover:underline-offset-[3px] active:opacity-70"
                >
                  {c.at}
                </Link>
                <b className="truncate text-[13.5px] font-semibold text-ink">{c.speaker}</b>
                <p className="col-span-2 text-[14px] leading-relaxed text-ink-2 min-[700px]:col-span-1">
                  {c.text}
                </p>
              </li>
            );
          })}
        </ol>
        <div className="mt-4">
          <ActionLink href={transcriptHref} variant="dark">
            <Article size={16} weight="bold" aria-hidden />
            Open the full transcript
          </ActionLink>
        </div>
      </Panel>
      <Panel title="Search and speakers" className="min-w-0">
        <p className="text-[14px] text-ink-3">
          The full transcript has in-page search, timestamps you can highlight and share, and
          speaker matching.
        </p>
      </Panel>
    </div>
  ) : (
    <PanelEmpty
      className="max-w-[640px]"
      icon={<Article size={34} />}
      title={isPast ? "No transcript for this meeting" : "Nothing to read yet"}
      description={
        isPast
          ? "This meeting ran before transcription was enabled."
          : "Live captions start when the meeting begins. Your agent writes the transcript as people speak."
      }
    />
  );

  /* ---------- decisions ---------- */

  const decisionsPanel =
    decisions.length > 0 ? (
      <ul className="flex max-w-[860px] flex-col gap-3.5">
        {decisions.map((d) => (
          <li key={d.id} className="rounded-card border border-line bg-surface p-5">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <Chip tone="accent">
                <CheckCircle size={14} weight="fill" aria-hidden />
                Confirmed {shortDateFormatter.format(new Date(d.confirmedAt))}
              </Chip>
              <Chip tone={d.priority} className="capitalize">
                {d.priority} priority
              </Chip>
            </div>
            <p className="text-[16px] font-semibold leading-snug text-ink">{d.title}</p>
            <p className="mt-1.5 text-[14px] text-ink-3">{d.summary}</p>
            {d.lineage && d.lineage.length > 1 && (
              <div className="mt-3.5">
                <p className="mb-1.5 text-[12px] font-semibold text-ink-3">Follows from</p>
                <p className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-bg-2 px-3 py-1 text-[12px] font-medium text-ink-2">
                  {d.lineage.map((m, i) => (
                    <span key={m} className="inline-flex items-center gap-1.5">
                      {i > 0 && <ArrowRight size={12} aria-hidden />}
                      {m}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <PanelEmpty
        className="max-w-[640px]"
        icon={<Scales size={34} />}
        title={isPast ? "No decisions captured" : "No decisions yet"}
        description={
          isPast
            ? "Decisions confirmed in this meeting would appear here."
            : "Decisions your agent detects during the call appear here once they are confirmed."
        }
      />
    );

  /* ---------- actions ---------- */

  const actionsPanel =
    actions.length > 0 ? (
      <div className="max-w-[860px]">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Chip tone={actions.every((a) => a.status === "done") ? "accent" : "medium"}>
            {actions.filter((a) => a.status === "done").length} of {actions.length} done
          </Chip>
          <span className="flex-1" />
          <Link href="/tasks" className={TEXT_LINK}>
            Open tasks
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <ul className="flex flex-col gap-3.5">
          {actions.map((a) => {
            const done = a.status === "done";
            return (
              <li key={a.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex items-start gap-3">
                  {done ? (
                    <CheckCircle
                      size={20}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-signal-deep"
                      role="img"
                      aria-label="Done"
                    />
                  ) : (
                    <Circle size={20} className="mt-0.5 shrink-0 text-ink-3" role="img" aria-label="Open" />
                  )}
                  <p
                    className={`min-w-0 text-[15.5px] font-semibold leading-snug ${
                      done ? "text-ink-3 line-through" : "text-ink"
                    }`}
                  >
                    {a.title}
                  </p>
                </div>
                <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 pl-8">
                  <span className="inline-flex items-center gap-2 text-[13px] text-ink-2">
                    <Avatar name={a.assignee} size="sm" />
                    {a.assignee}
                  </span>
                  <Chip>
                    <CalendarBlank size={13} aria-hidden />
                    Due {shortDateFormatter.format(parseDueDate(a.dueDate))}
                  </Chip>
                  <Chip tone={a.priority} className="capitalize">
                    {a.priority} priority
                  </Chip>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    ) : (
      <PanelEmpty
        className="max-w-[640px]"
        icon={<CheckSquare size={34} />}
        title={isPast ? "No action items captured" : "No action items yet"}
        description={
          isPast
            ? "Action items confirmed in this meeting would appear here."
            : "Action items are proposed during the meeting. Nothing becomes a task until its owner confirms it."
        }
      />
    );

  const tabs: MeetingTab[] = [
    { key: "overview", label: "Overview" },
    { key: "transcript", label: "Transcript" },
    { key: "decisions", label: "Decisions", count: isPast ? decisions.length : undefined },
    { key: "actions", label: "Actions", count: isPast ? actions.length : undefined },
  ];

  return (
    <div className="mx-auto max-w-6xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <Link
        href="/meetings"
        className="mb-3 inline-flex items-center gap-1.5 rounded-md text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink active:opacity-70"
      >
        <ArrowLeft size={14} aria-hidden />
        All meetings
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-5 pt-1">
        <div className="min-w-0 flex-[1_1_420px]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {meeting.status === "live" ? (
              <Chip tone="high" className="gap-2">
                <span aria-hidden className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-priority-high opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-priority-high" />
                </span>
                Live
              </Chip>
            ) : isPast ? (
              <Chip>Ended</Chip>
            ) : (
              <Chip tone="low">Upcoming</Chip>
            )}
            {hasTranscript && (
              <Chip>
                <Article size={13} aria-hidden />
                Transcript available
              </Chip>
            )}
            {agenda.length > 0 && (
              <Chip>
                <ListChecks size={13} aria-hidden />
                {plural(agenda.length, "agenda item", "agenda items")}
              </Chip>
            )}
          </div>
          <h1 className="display break-words text-[clamp(1.9rem,3.4vw,2.5rem)] text-ink-display">
            {meeting.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <CalendarBlank size={17} aria-hidden />
              {dateFormatter.format(start)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={17} aria-hidden />
              {timeFormatter.format(start)} to {timeFormatter.format(end)}, {meeting.durationMinutes}{" "}
              min
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="flex -space-x-2" aria-hidden>
                {shown.map((name) => (
                  <Avatar key={name} name={name} size="sm" className="ring-2 ring-bg" />
                ))}
                {extra > 0 && (
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-bg-2 px-1.5 text-[11px] font-semibold text-ink-2 ring-2 ring-bg">
                    +{extra}
                  </span>
                )}
              </span>
              {plural(meeting.participants.length, "participant", "participants")}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 min-[700px]:w-auto">
          {!isPast && (
            <ActionLink
              href={`/meetings/${meeting.id}/room`}
              variant="accent"
              className="max-[699px]:flex-1"
            >
              <VideoCamera size={17} weight="bold" aria-hidden />
              {meeting.status === "live" ? "Join the room" : "Open the room"}
            </ActionLink>
          )}
          {hasTranscript && (
            <ActionLink href={transcriptHref} variant={isPast ? "dark" : "ghost"} className="max-[699px]:flex-1">
              <Article size={17} weight="bold" aria-hidden />
              {isPast ? "Open transcript" : "View transcript"}
            </ActionLink>
          )}
        </div>
      </header>

      <MeetingTabs
        tabs={tabs}
        panels={{
          overview,
          transcript: transcriptPanel,
          decisions: decisionsPanel,
          actions: actionsPanel,
        }}
      />
    </div>
  );
}
