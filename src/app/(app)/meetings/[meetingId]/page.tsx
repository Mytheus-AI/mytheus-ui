import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import {
  mockMeetings,
  mockMeetingDetails,
  mockDecisions,
  mockActions,
  mockTranscriptChunks,
} from "@/lib/mock/data";

export const metadata: Metadata = { title: "Meeting — Mytheus" };

/* Meeting detail (pre/post): agenda, participants, and — for past meetings —
   the outcomes the agents captured (decisions, action items, recap). RSC on
   mock data. */

export function generateStaticParams() {
  return mockMeetings.map((m) => ({ meetingId: m.id }));
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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
  const hasTranscript = mockTranscriptChunks.some((c) => c.meetingId === meeting.id);
  const isPast = meeting.status === "past";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      {/* header */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="kicker text-signal">Meeting</p>
          {meeting.status === "live" ? (
            <Badge tone="danger">Live</Badge>
          ) : (
            <Badge tone="default" className="capitalize">
              {meeting.status}
            </Badge>
          )}
        </div>
        <h1 className="display mt-2 break-words text-[clamp(1.8rem,4vw,2.4rem)]">
          {meeting.title}
        </h1>
        <p className="mt-2 text-[14px] text-ink-3">
          {dateFormatter.format(new Date(meeting.startTime))} · {meeting.durationMinutes} min
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {meeting.status !== "past" && (
            <LinkButton href={`/meetings/${meeting.id}/room`} variant="primary">
              {meeting.status === "live" ? "Join the room" : "Open the room"}
            </LinkButton>
          )}
          {hasTranscript && (
            <LinkButton href={`/meetings/${meeting.id}/transcript`} variant="outline">
              View transcript
            </LinkButton>
          )}
        </div>
      </div>

      {/* participants */}
      <Card>
        <p className="kicker mb-4">Participants</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {meeting.participants.map((name) => (
            <li key={name} className="flex items-center gap-2.5">
              <Avatar name={name} size="sm" />
              <span className="text-[14px] text-ink">{name}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* agenda */}
      <Card>
        <p className="kicker mb-4">Agenda</p>
        {detail && detail.agenda.length > 0 ? (
          <ol className="space-y-3">
            {detail.agenda.map((item, i) => (
              <li key={item} className="flex gap-3.5 text-[14px] text-ink">
                <span className="font-mono text-[12px] tabular-nums text-signal">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-ink-3">No agenda was set for this meeting.</p>
        )}
      </Card>

      {/* outcomes */}
      {isPast ? (
        <section>
          <h2 className="text-[20px] font-medium text-ink-display">Outcomes</h2>

          {detail?.recap && (
            <Card className="mt-4 bg-signal-soft/40">
              <p className="kicker mb-2">Recap</p>
              <p className="text-[14px] leading-relaxed text-ink">{detail.recap}</p>
            </Card>
          )}

          {decisions.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {decisions.map((d) => (
                <Card key={d.id} priorityStrip={d.priority}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 text-[15px] font-medium text-ink">{d.title}</p>
                    <Badge tone={d.priority} className="shrink-0 capitalize">
                      {d.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-3">{d.summary}</p>
                  {d.lineage && (
                    <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-bg-2 px-3 py-1 text-[11.5px] font-medium text-ink-2">
                      {d.lineage.map((m, i) => (
                        <span key={m} className="flex items-center gap-1.5">
                          {i > 0 && <span aria-hidden className="text-ink-3">→</span>}
                          {m}
                        </span>
                      ))}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}

          {actions.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {actions.map((a) => (
                <Card key={a.id} priorityStrip={a.priority}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p
                      className={`min-w-0 text-[14.5px] font-medium ${
                        a.status === "done" ? "text-ink-3 line-through" : "text-ink"
                      }`}
                    >
                      {a.title}
                    </p>
                    <span className="flex shrink-0 items-center gap-2">
                      <Avatar name={a.assignee} size="sm" />
                      <span className="text-[13px] text-ink-2">{a.assignee}</span>
                      <span className="whitespace-nowrap text-[12.5px] text-ink-3">
                        · due {a.dueDate.slice(5)}
                      </span>
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!detail?.recap && decisions.length === 0 && actions.length === 0 && (
            <EmptyState
              className="mt-4"
              title="No outcomes captured"
              description="Decisions and action items confirmed in this meeting would appear here."
            />
          )}
        </section>
      ) : (
        <Card>
          <p className="kicker mb-2">Before you join</p>
          <p className="text-[14px] leading-relaxed text-ink-2">
            Your agent has the agenda and the relevant history from earlier
            meetings. Notes it takes in the room are yours only, and nothing is
            saved or assigned without your confirm.
          </p>
        </Card>
      )}

      <div>
        <Link href="/meetings" className="link-underline text-[13px] font-medium text-ink-2">
          ← All meetings
        </Link>
      </div>
    </div>
  );
}
