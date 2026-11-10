import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookmarkSimple,
  CalendarBlank,
  CheckCircle,
  CheckSquare,
  Circle,
  CircleHalf,
  ListChecks,
  MinusCircle,
  NotePencil,
  Robot,
  Scales,
  Sparkle,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { catchUpLead } from "@/components/briefs/catch-up-format";
import { Chip } from "@/components/meetings/Chip";
import { STATUS_LABEL } from "@/components/meetings/agenda-status";
import type { AgendaStatus } from "@/lib/api/meeting-agenda-types";
import { fetchMeetingCatchUp } from "@/lib/api/meeting-brain";
import type { MeetingCatchUp } from "@/lib/api/meeting-brain-types";
import { listMembers } from "@/lib/api/members";
import { agentFace } from "@/lib/realtime/agent-persona";
import { Doodle } from "@/components/ui/Doodle";
import "@/styles/meeting-hub.css";
import "@/styles/meeting-agenda.css";
import "@/styles/meeting-brain.css";

export const metadata: Metadata = { title: "Catch-up | Mytheus" };
export const dynamic = "force-dynamic";

/* The catch-up (mytheus-docs ADR-0039 B8), for someone who sent their agent or missed the
   meeting: the link the "your agent's catch-up" reminder opens. Built to be read in a minute: one
   summary sentence, then what you now own first (the thing you must act on), then what was
   decided, how far the agenda got with the meeting agent's notes, the notes your agent kept for
   you and the questions it carried. Three columns on a wide screen, two on a laptop, one on a
   phone. A server component. */

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
const dueFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function due(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : `Due ${dueFormatter.format(d)}`;
}

const STATUS_ICON: Record<AgendaStatus, Icon> = {
  pending: Circle,
  in_progress: CircleHalf,
  covered: CheckCircle,
  skipped: MinusCircle,
};

export default async function CatchUpPage({ params }: { params: { meetingId: string } }) {
  const meeting = await resolveCallMeeting(params.meetingId);
  const ended = meeting.status === "past";
  const [catchUp, members] = await Promise.all([
    ended ? fetchMeetingCatchUp(meeting.id) : Promise.resolve(null),
    listMembers(),
  ]);
  const names = new Map((members ?? []).map((m) => [m.id, m.name]));
  const nameOf = (id: string) => names.get(id) ?? "Former member";
  const you = members?.find((m) => m.isYou) ?? null;
  const sentAgent = !!you && meeting.participants.some((p) => p.id === you.id && p.attendance === "agent");
  const face = you ? agentFace(you.id, you.name, you.agentName, you.agentSeed) : null;
  const start = new Date(meeting.startTime);

  return (
    <div className="mx-page md cu" id="page-catch-up">
      <Link href={`/meetings/${meeting.id}`} className="mx-back">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        Back to the meeting
      </Link>

      <header className="mx-head">
        <div className="mx-head-main">
          <div className="md-chips">
            <Chip tone="accent">
              <Sparkle size={14} aria-hidden="true" />
              Catch-up
            </Chip>
            {sentAgent ? (
              <Chip tone="low">
                <Robot size={14} aria-hidden="true" />
                Your agent attended for you
              </Chip>
            ) : null}
          </div>
          <h1 className="mx-title">{meeting.title}</h1>
          <div className="md-meta">
            <span>
              <CalendarBlank size={18} aria-hidden="true" />
              {dayFormatter.format(start)}, {meeting.durationMinutes} min
            </span>
          </div>
        </div>
        <div className="mx-actions">
          <LinkButton href={`/meetings/${meeting.id}`} variant="outline">
            Open the meeting
          </LinkButton>
        </div>
      </header>

      {!ended ? (
        <EmptyState
          title="The catch-up comes after the meeting"
          description="Once it ends, this page shows what you now own, what was decided and how far the agenda got."
          action={<LinkButton href={`/meetings/${meeting.id}`}>Open the meeting</LinkButton>}
        />
      ) : catchUp && catchUp.ok ? (
        <CatchUpBody c={catchUp.data} nameOf={nameOf} face={sentAgent ? face : null} />
      ) : catchUp && catchUp.reason === "none" ? (
        <EmptyState
          title="This catch-up isn't for you"
          description="It is for people who sent their agent or missed the meeting. The meeting page has the recap, the transcript and what was kept."
          action={<LinkButton href={`/meetings/${meeting.id}`}>Open the meeting</LinkButton>}
        />
      ) : (
        <div className="mx-card mt-state" role="alert">
          <h2>The catch-up couldn&rsquo;t be loaded</h2>
          <p>Something went wrong reading it. It is still there: reload the page to try again.</p>
          <LinkButton href={`/meetings/${meeting.id}/catch-up`} variant="outline">
            Try again
          </LinkButton>
        </div>
      )}
    </div>
  );
}

function CatchUpBody({
  c,
  nameOf,
  face,
}: {
  c: MeetingCatchUp;
  nameOf: (id: string) => string;
  face: { name: string; seed: string } | null;
}) {
  const covered = c.agenda.filter((a) => a.status === "covered").length;
  return (
    <>
      <section className="mx-card cu-lead" aria-label="Summary">
        {face ? (
          <span className="cu-face" aria-hidden="true">
            <Doodle seed={face.seed} className="block h-full w-full" />
          </span>
        ) : null}
        <div className="cu-lead-text">
          {face ? <p className="cu-from">From {face.name}</p> : null}
          <p className="cu-sentence">{catchUpLead(c)}</p>
        </div>
        <dl className="cu-stats">
          <div>
            <dt>Now yours</dt>
            <dd>{c.assigned_to_me.length}</dd>
          </div>
          <div>
            <dt>Decided</dt>
            <dd>{c.decisions.length}</dd>
          </div>
          <div>
            <dt>Agenda</dt>
            <dd>
              {c.agenda.length > 0 ? (
                <>
                  {covered}
                  <small> of {c.agenda.length}</small>
                </>
              ) : (
                <small>None</small>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="cu-grid">
        <div className="md-col">
          <section className="mx-card mx-card-pad cu-own" aria-labelledby="cu-own-h">
            <div className="mx-card-head">
              <h2 className="mx-card-title" id="cu-own-h">
                <CheckSquare size={18} aria-hidden="true" />
                Now yours
              </h2>
              {c.assigned_to_me.length > 0 ? (
                <Link href="/work/tasks" className="cu-more">
                  All your tasks
                </Link>
              ) : null}
            </div>
            {c.assigned_to_me.length === 0 ? (
              <p className="br-empty">Nothing from this meeting was assigned to you.</p>
            ) : (
              <ul className="cu-own-list">
                {c.assigned_to_me.map((a) => (
                  <li key={a.id}>
                    <span className="cu-own-title">{a.title}</span>
                    {due(a.due_date) ? <span className="cu-own-due">{due(a.due_date)}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mx-card mx-card-pad" aria-labelledby="cu-q-h">
            <div className="mx-card-head">
              <h2 className="mx-card-title" id="cu-q-h">
                <BookmarkSimple size={18} aria-hidden="true" />
                Your questions
              </h2>
            </div>
            {c.my_questions.length === 0 ? (
              <p className="br-empty">You didn&rsquo;t send any questions with your agent.</p>
            ) : (
              <>
                <p className="mx-help">Your agent carried these. Look for the answers in the decisions and notes here.</p>
                <ol className="cf-list cu-qs">
                  {c.my_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </div>

        <div className="md-col">
          <section className="mx-card mx-card-pad" aria-labelledby="cu-d-h">
            <div className="mx-card-head">
              <h2 className="mx-card-title" id="cu-d-h">
                <Scales size={18} aria-hidden="true" />
                Decided
              </h2>
            </div>
            {c.decisions.length === 0 ? (
              <p className="br-empty">No decisions were confirmed in this meeting.</p>
            ) : (
              <ul className="cu-decisions">
                {c.decisions.map((d) => (
                  <li key={d.id}>{d.content}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="mx-card mx-card-pad" aria-labelledby="cu-n-h">
            <div className="mx-card-head">
              <h2 className="mx-card-title" id="cu-n-h">
                <NotePencil size={18} aria-hidden="true" />
                Notes kept for you
              </h2>
              <span className="mx-card-note">Only you</span>
            </div>
            {c.my_notes.length === 0 ? (
              <p className="br-empty">Your agent kept no notes for you from this one.</p>
            ) : (
              <ul className="cu-notes">
                {c.my_notes.map((n) => (
                  <li key={n.id}>{n.content}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="md-col">
          <section className="mx-card mx-card-pad" aria-labelledby="cu-a-h">
            <div className="mx-card-head">
              <h2 className="mx-card-title" id="cu-a-h">
                <ListChecks size={18} aria-hidden="true" />
                Agenda
              </h2>
              {c.agenda.length > 0 ? (
                <span className="mx-card-note">
                  {covered} of {c.agenda.length} covered
                </span>
              ) : null}
            </div>
            {c.agenda.length === 0 ? (
              <p className="br-empty">This meeting had no agenda.</p>
            ) : (
              <ol className="cu-agenda">
                {c.agenda.map((a) => {
                  const SIcon = STATUS_ICON[a.status];
                  return (
                    <li key={a.id} className={`is-${a.status}`}>
                      <SIcon size={18} weight={a.status === "covered" ? "fill" : "regular"} aria-hidden="true" />
                      <div>
                        <p className="cu-agenda-title">
                          {a.title}
                          <span className="sr-only">, {STATUS_LABEL[a.status]}</span>
                        </p>
                        <p className="ag-meta">
                          <span aria-hidden="true">{STATUS_LABEL[a.status]}</span>
                          {a.owner_user_id ? `, ${nameOf(a.owner_user_id)}` : null}
                        </p>
                        {a.agent_note ? (
                          <p className="ag-note">
                            <Sparkle size={13} aria-hidden="true" />
                            <span>
                              <span className="sr-only">Meeting agent note: </span>
                              {a.agent_note}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
