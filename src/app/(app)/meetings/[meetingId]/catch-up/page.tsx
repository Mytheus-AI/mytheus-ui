import type { Metadata } from "next";
import Link from "next/link";
import {
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
import type { ReactNode } from "react";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Page, PageHead } from "@/components/ui/Page";
import { catchUpLead } from "@/components/briefs/catch-up-format";
import { STATUS_LABEL } from "@/components/meetings/agenda-status";
import type { AgendaStatus } from "@/lib/api/meeting-agenda-types";
import { fetchMeetingCatchUp } from "@/lib/api/meeting-brain";
import type { MeetingCatchUp } from "@/lib/api/meeting-brain-types";
import { listMembers } from "@/lib/api/members";
import { agentFace } from "@/lib/realtime/agent-persona";
import { AgentOrb } from "@/components/agent/AgentOrb";
import "@/styles/meeting-agenda.css";
import "@/styles/meeting-brain.css";

export const metadata: Metadata = { title: "Catch-up | Mytheus" };
export const dynamic = "force-dynamic";

/* The catch-up (mytheus-docs ADR-0039 B8), for someone who sent their agent or missed the
   meeting: the link the "your Myte's catch-up" reminder opens. Built to be read in a minute: one
   summary sentence, then what you now own first (the thing you must act on), then what was
   decided, how far the agenda got with the meeting agent's notes, the notes your Myte kept for
   you and the questions it carried. Three columns on a wide screen, two on a laptop, one on a
   phone. A server component on the shared frame (Page, PageHead, Card); the topbar breadcrumb
   reads Meetings, the meeting, Catch-up, so the page carries no back link of its own. */

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
  const [catchUp, members] = await Promise.all([ended ? fetchMeetingCatchUp(meeting.id) : Promise.resolve(null), listMembers()]);
  const names = new Map((members ?? []).map((m) => [m.id, m.name]));
  const nameOf = (id: string) => names.get(id) ?? "Former member";
  const you = members?.find((m) => m.isYou) ?? null;
  const sentAgent = !!you && meeting.participants.some((p) => p.id === you.id && p.attendance === "agent");
  const face = you ? agentFace(you.id, you.name, you.agentName, you.agentSeed) : null;
  const start = new Date(meeting.startTime);

  const openMeeting = (
    <LinkButton href={`/meetings/${meeting.id}`} variant="outline">
      Open the meeting
    </LinkButton>
  );

  return (
    <Page>
      <PageHead
        title={meeting.title}
        context={
          <span className="inline-flex items-center gap-2">
            <CalendarBlank size={18} aria-hidden="true" className="text-ink-4" />
            {dayFormatter.format(start)}, {meeting.durationMinutes} min
          </span>
        }
        action={openMeeting}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="accent" icon={<Sparkle size={14} aria-hidden="true" />}>
            Catch-up
          </Chip>
          {sentAgent ? (
            <Chip tone="low" icon={<Robot size={14} aria-hidden="true" />}>
              Your Myte attended for you
            </Chip>
          ) : null}
        </div>
      </PageHead>

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
          description="It is for people who sent their Myte or missed the meeting. The meeting page has the recap, the transcript and what was kept."
          action={<LinkButton href={`/meetings/${meeting.id}`}>Open the meeting</LinkButton>}
        />
      ) : (
        <ErrorState
          title="The catch-up couldn't be loaded"
          text="Something went wrong reading it. It is still there: try again in a moment."
          action={openMeeting}
        />
      )}
    </Page>
  );
}

/** A catch-up card's title: the icon, then the words. */
function Title({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      {children}
    </span>
  );
}

const iconClass = "shrink-0 text-ink-3";
const note = "text-[14px] text-ink-3";

function CatchUpBody({ c, nameOf, face }: { c: MeetingCatchUp; nameOf: (id: string) => string; face: { name: string; seed: string } | null }) {
  const covered = c.agenda.filter((a) => a.status === "covered").length;
  return (
    <>
      <section className="cu-lead" aria-label="Summary">
        {face ? (
          <span className="cu-face" aria-hidden="true">
            <AgentOrb seed={face.seed} size={56} />
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

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:gap-6">
        <div className="flex min-w-0 flex-col gap-5 xl:gap-6">
          <Card as="section" flush aria-labelledby="cu-own-h" className="!border-[color:color-mix(in_srgb,var(--signal)_28%,var(--line))]">
            <CardHead
              id="cu-own-h"
              title={<Title icon={<CheckSquare size={18} aria-hidden="true" className="shrink-0 text-signal-ink" />}>Now yours</Title>}
              right={
                <>
                  {c.assigned_to_me.length > 0 ? (
                    <Link href="/work/tasks" className="cu-more">
                      All your tasks
                    </Link>
                  ) : null}
                </>
              }
            />
            <CardBody>
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
            </CardBody>
          </Card>

          <Card as="section" flush aria-labelledby="cu-q-h">
            <CardHead
              id="cu-q-h"
              title={<Title icon={<BookmarkSimple size={18} aria-hidden="true" className={iconClass} />}>Your questions</Title>}
            />
            <CardBody>
              {c.my_questions.length === 0 ? (
                <p className="br-empty">You didn&rsquo;t send any questions with your Myte.</p>
              ) : (
                <>
                  <p className="text-[14px] leading-normal text-ink-3">
                    Your Myte carried these. Look for the answers in the decisions and notes here.
                  </p>
                  <ol className="cf-list cu-qs">
                    {c.my_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5 xl:gap-6">
          <Card as="section" flush aria-labelledby="cu-d-h">
            <CardHead id="cu-d-h" title={<Title icon={<Scales size={18} aria-hidden="true" className={iconClass} />}>Decided</Title>} />
            <CardBody>
              {c.decisions.length === 0 ? (
                <p className="br-empty">No decisions were confirmed in this meeting.</p>
              ) : (
                <ul className="cu-decisions">
                  {c.decisions.map((d) => (
                    <li key={d.id}>{d.content}</li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card as="section" flush aria-labelledby="cu-n-h">
            <CardHead
              id="cu-n-h"
              title={<Title icon={<NotePencil size={18} aria-hidden="true" className={iconClass} />}>Notes kept for you</Title>}
              right={
                <>
                  <span className={note}>Only you</span>
                </>
              }
            />
            <CardBody>
              {c.my_notes.length === 0 ? (
                <p className="br-empty">Your Myte kept no notes for you from this one.</p>
              ) : (
                <ul className="cu-notes">
                  {c.my_notes.map((n) => (
                    <li key={n.id}>{n.content}</li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5 md:col-span-2 xl:col-span-1 xl:gap-6">
          <Card as="section" flush aria-labelledby="cu-a-h">
            <CardHead
              id="cu-a-h"
              title={<Title icon={<ListChecks size={18} aria-hidden="true" className={iconClass} />}>Agenda</Title>}
              right={
                <>
                  {c.agenda.length > 0 ? (
                    <span className={note}>
                      {covered} of {c.agenda.length} covered
                    </span>
                  ) : null}
                </>
              }
            />
            <CardBody>
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
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
