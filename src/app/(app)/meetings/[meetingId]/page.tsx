import type { Metadata } from "next";
import type { ComponentProps } from "react";
import Link from "next/link";
import {
  ArrowBendUpLeft,
  ArrowLeft,
  ArrowRight,
  Article,
  CalendarBlank,
  CheckSquare,
  Clock,
  LockSimple,
  NotePencil,
  Question,
  Robot,
  Sparkle,
  Scales,
  ShieldCheck,
  UserCircle,
  UsersThree,
  VideoCamera,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AgendaPerson } from "@/components/meetings/AgendaEditor";
import { AttendanceCard } from "@/components/meetings/AttendanceCard";
import { CarryForwardCard } from "@/components/meetings/CarryForwardCard";
import { PreApprovedAnswers } from "@/components/meetings/PreApprovedAnswers";
import { WhatMyAgentSaid } from "@/components/meeting/WhatMyAgentSaid";
import { BriefSection } from "@/components/briefs/BriefSection";
import { HealthCard } from "@/components/health/HealthCard";
import { Chip } from "@/components/meetings/Chip";
import { MeetingAgendaCard } from "@/components/meetings/MeetingAgendaCard";
import { InviteToMeeting } from "@/components/meetings/InviteToMeeting";
import type { PickableMember } from "@/components/meetings/MemberPicker";
import { wordCount } from "@/components/meetings/transcript-utils";
import { initials, toneOf } from "@/components/room/tone";
import { fetchCarryForward } from "@/lib/api/meeting";
import { fetchActiveGoals, fetchMeetingBrief, fetchMeetingHealth, type BrainRead } from "@/lib/api/meeting-brain";
import type { MeetingBrief, MeetingHealth, OrgGoal } from "@/lib/api/meeting-brain-types";
import { agentFace } from "@/lib/realtime/agent-persona";
import type { CarryForward } from "@/lib/api/meeting-agenda-types";
import type { CallMeeting } from "@/lib/api/meetings";
import { listMembers, type WorkspaceMemberView } from "@/lib/api/members";
import { fetchTranscriptSurface, type TranscriptChunk } from "@/lib/api/transcript";
import "@/styles/meeting-hub.css";
import "@/styles/meeting-agenda.css";
import "@/styles/meeting-brain.css";

export const metadata: Metadata = { title: "Meeting | Mytheus" };

/* A meeting's page, read from core-api. A title row (status, the serif title, when and who, the
   one primary action), then two columns laid out for what you need at that moment:

   - Before or during the call: when it is, what your agent will do, and who is invited (by name).
   - After it: the recap with talk time, and "From this meeting": what was said (the transcript)
     joined by the coral line to what was kept (decisions, tasks, agent collaboration). No Join: a
     call that has ended stays ended (meeting-service closes an empty room after five minutes and
     refuses new tokens for an ended meeting).
   - Missed: its time passed and nobody joined. Said plainly, with who was invited.

   Every person is an internal user id; names come from the workspace's members.

   ADR-0038 D11: the host is named in the title row, a follow-up links the meeting it follows, the
   agenda shows each item's status and the meeting agent's note (the host or creator can edit it
   and set statuses), and a follow-up shows what the earlier meeting left open.

   ADR-0039 E: before it starts you can send your agent instead (with an update and questions,
   reversible until it starts) and read your brief (#brief, where the reminder links); carried
   forward actions show their latest status; after it ends the health card sits beside the recap
   and the catch-up is a link away. On a wide screen the main area is two columns of cards beside
   the people rail, so nothing sits in a narrow centred strip. */

export const dynamic = "force-dynamic";

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "in 2 hours", "3 hours ago": how far `to` is from `from`, in the largest whole unit. */
function relative(from: Date, to: Date): string {
  const mins = Math.round((to.getTime() - from.getTime()) / 60000);
  const abs = Math.abs(mins);
  if (abs < 1) return "now";
  const [n, unit] =
    abs < 60 ? [abs, "minute"] : abs < 60 * 24 ? [Math.round(abs / 60), "hour"] : [Math.round(abs / 1440), "day"];
  const span = `${n} ${unit}${n === 1 ? "" : "s"}`;
  return mins >= 0 ? `in ${span}` : `${span} ago`;
}

type Person = {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  isYou: boolean;
  host: boolean;
  /** Sent their agent instead (ADR-0039 B5). */
  proxy: boolean;
};

/** The parts of the page that ADR-0038 adds, assembled once in the page and passed down. */
type Plan = {
  agenda: AgendaItemsProps;
  carry: { previous: { id: string; title: string }; data: CarryForward | null } | null;
  nameOf: (id: string) => string;
  /** Send my agent instead, for a participant (null otherwise). */
  attendance: ComponentProps<typeof AttendanceCard> | null;
  /** Your brief, before it ends and when you are in it. */
  brief: BrainRead<MeetingBrief> | null;
  /** The health card, after it ended. */
  health: BrainRead<MeetingHealth> | null;
  goals: OrgGoal[];
  /** You sent your agent: the catch-up is yours. */
  sentAgent: boolean;
};
type AgendaItemsProps = {
  meetingId: string;
  items: CallMeeting["agenda"];
  people: AgendaPerson[];
  canEdit: boolean;
  ended: boolean;
  meetingMinutes: number;
};

function PlanCards({ plan, side }: { plan: Plan; side: "main" | "aside" }) {
  if (side === "main") return <MeetingAgendaCard {...plan.agenda} goals={plan.goals} />;
  return plan.carry ? <CarryForwardCard previous={plan.carry.previous} data={plan.carry.data} nameOf={plan.nameOf} /> : null;
}

/* The catch-up, for whoever missed it or sent their agent (ADR-0039 B8). */
function CatchUpLink({ meetingId, sentAgent }: { meetingId: string; sentAgent: boolean }) {
  return (
    <Link href={`/meetings/${meetingId}/catch-up`} className={`mx-card md-linkcard tap${sentAgent ? " cu-link is-yours" : " cu-link"}`}>
      <span className="md-plan-ico" aria-hidden="true">
        <Sparkle size={18} />
      </span>
      <span className="md-linkcard-text">
        <strong>{sentAgent ? "Your agent's catch-up" : "Catch up in a minute"}</strong>
        <span>What you now own, what was decided, and how far the agenda got</span>
      </span>
      <ArrowRight size={16} weight="bold" aria-hidden="true" />
    </Link>
  );
}

function people(meeting: CallMeeting, members: WorkspaceMemberView[] | null): Person[] {
  const byId = new Map((members ?? []).map((m) => [m.id, m]));
  return meeting.participants
    .map((p) => {
      const m = byId.get(p.id);
      return {
        id: p.id,
        name: m?.name ?? "Former member",
        email: m?.email ?? "",
        imageUrl: m?.imageUrl ?? null,
        isYou: m?.isYou ?? false,
        host: meeting.hostUserId ? p.id === meeting.hostUserId : p.role === "host",
        proxy: p.attendance === "agent",
      };
    })
    .sort((a, b) => Number(b.host) - Number(a.host) || Number(b.isYou) - Number(a.isYou) || a.name.localeCompare(b.name));
}

function Face({ person, size = "" }: { person: Person; size?: "" | "sm" }) {
  return (
    <span className={`mx-av ${size} ${toneOf(person.id)}`} aria-hidden="true">
      {person.imageUrl ? (
        // Clerk's CDN; a plain <img> keeps it out of next/image's domain list.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.imageUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        initials(person.name)
      )}
    </span>
  );
}

function PeopleCard({ list, title }: { list: Person[]; title: string }) {
  return (
    <section className="mx-card mx-card-pad" aria-labelledby="md-people-h">
      <div className="mx-card-head">
        <h2 className="mx-card-title" id="md-people-h">
          {title}
        </h2>
        <span className="mx-card-note">{plural(list.length, "person", "people")}</span>
      </div>
      {list.length === 0 ? (
        <p className="mx-help">Nobody is on this meeting&rsquo;s list yet.</p>
      ) : (
        <ul className="md-people">
          {list.map((p) => (
            <li key={p.id}>
              <Face person={p} />
              <span className="md-person">
                <strong>
                  {p.name}
                  {p.isYou && <small> (you)</small>}
                </strong>
                {p.email && <span>{p.email}</span>}
              </span>
              {p.proxy ? (
                <Chip tone="low" title={`${p.isYou ? "You are" : `${p.name} is`} sending an agent instead`}>
                  <Robot size={14} aria-hidden="true" />
                  Sending agent
                </Chip>
              ) : null}
              {p.host && <Chip>Host</Chip>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WhenCard({ meeting, note, live }: { meeting: CallMeeting; note: string; live?: boolean }) {
  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.durationMinutes * 60000);
  return (
    <section className="mx-card mx-card-pad" aria-labelledby="md-when-h">
      <div className="mx-card-head">
        <h2 className="mx-card-title" id="md-when-h">
          When
        </h2>
        {live ? (
          <Chip tone="high">
            <span className="mx-live-dot" aria-hidden="true" />
            Live now
          </Chip>
        ) : null}
      </div>
      <div className="md-when">
        <span className="md-date" aria-hidden="true">
          <small>{monthFormatter.format(start)}</small>
          <b>{start.getDate()}</b>
        </span>
        <span className="md-when-text">
          <strong>
            {dayFormatter.format(start)}, {timeFormatter.format(start)} to {timeFormatter.format(end)}
          </strong>
          <span>{note}</span>
        </span>
      </div>
    </section>
  );
}

const AGENT_PLAN: { icon: Icon; text: string }[] = [
  { icon: NotePencil, text: "Takes private notes for you while you talk. Only you can see them." },
  { icon: Scales, text: "Flags decisions as they are made and waits for your Confirm before saving one." },
  { icon: CheckSquare, text: "Picks up action items with an owner and a due date, for you to approve." },
  { icon: Question, text: "Suggests questions and brings in context from your earlier meetings." },
];

function AgentCard() {
  return (
    <section className="mx-card mx-card-pad" aria-labelledby="md-agent-h">
      <div className="mx-card-head">
        <h2 className="mx-card-title" id="md-agent-h">
          What your agent will do
        </h2>
      </div>
      <p className="mx-help">
        It joins the call with you. What it writes shows in your sidebar during the call and is yours only.
      </p>
      <ul className="md-plan">
        {AGENT_PLAN.map((p) => (
          <li key={p.text}>
            <span className="md-plan-ico" aria-hidden="true">
              <p.icon size={17} />
            </span>
            <p>{p.text}</p>
          </li>
        ))}
      </ul>
      <p className="md-foot">
        <ShieldCheck size={16} weight="fill" aria-hidden="true" />
        Nothing is saved to your workspace until you confirm it.
      </p>
    </section>
  );
}

function UpcomingDetail({
  meeting,
  list,
  hasTranscript,
  plan,
}: {
  meeting: CallMeeting;
  list: Person[];
  hasTranscript: boolean;
  plan: Plan;
}) {
  const live = meeting.status === "live";
  const start = new Date(meeting.startTime);
  const now = new Date();
  const note = live
    ? `Started ${relative(now, start)}`
    : start > now
      ? `Starts ${relative(now, start)}. The room opens when you join.`
      : `Was due ${relative(now, start)}, still open to join`;

  return (
    <div className="md-cols">
      <div className="md-pair">
        <div className="md-col">
          <WhenCard meeting={meeting} note={note} live={live} />
          {plan.attendance ? <AttendanceCard {...plan.attendance} /> : null}
          {plan.attendance ? <PreApprovedAnswers meetingId={meeting.id} /> : null}
          {plan.brief ? <BriefSection brief={plan.brief} nameOf={plan.nameOf} goals={plan.goals} /> : null}
        </div>
        <div className="md-col">
          <PlanCards plan={plan} side="main" />
          <PlanCards plan={plan} side="aside" />
          {hasTranscript ? (
            <Link href={`/meetings/${meeting.id}/transcript`} className="mx-card md-linkcard tap">
              <span className="md-plan-ico" aria-hidden="true">
                <Article size={18} />
              </span>
              <span className="md-linkcard-text">
                <strong>Transcript so far</strong>
                <span>Searchable, with speakers, updated as the call runs</span>
              </span>
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          ) : null}
          <AgentCard />
        </div>
      </div>
      <div className="md-col md-rail">
        <PeopleCard list={list} title="Invited" />
      </div>
    </div>
  );
}

/** Share of words per person, named from the workspace (each line's speaker is a user id). */
function talkTime(chunks: TranscriptChunk[], names: Map<string, string>): { id: string; name: string; share: number }[] {
  const words = new Map<string, number>();
  let all = 0;
  for (const c of chunks) {
    const n = wordCount(c.text);
    words.set(c.speaker_id, (words.get(c.speaker_id) ?? 0) + n);
    all += n;
  }
  if (all === 0) return [];
  return Array.from(words.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, name: names.get(id) ?? "Someone", share: Math.round((n / all) * 100) }));
}

function EndedDetail({
  meeting,
  list,
  chunks,
  names,
  plan,
}: {
  meeting: CallMeeting;
  list: Person[];
  chunks: TranscriptChunk[];
  names: Map<string, string>;
  plan: Plan;
}) {
  const talk = talkTime(chunks, names);
  const spokenMs = chunks.length > 0 ? Math.max(...chunks.map((c) => c.end_ms)) - Math.min(...chunks.map((c) => c.start_ms)) : 0;
  const spokenMin = Math.max(1, Math.round(spokenMs / 60000));
  const words = chunks.reduce((n, c) => n + wordCount(c.text), 0);

  if (meeting.missed || chunks.length === 0) {
    return (
      <div className="md-cols">
        <div className="md-pair">
          <div className="md-col">
            <WhenCard
              meeting={meeting}
              note={meeting.missed ? "Nobody joined before it ended" : "No transcript was captured for this call"}
            />
            <EmptyState
              title={meeting.missed ? "This meeting did not happen" : "No transcript for this meeting"}
              description={
                meeting.missed
                  ? "Its time came and went with nobody joining, so there is nothing to recap. Start a new meeting when you are ready."
                  : "The call ran without transcription, so there are no notes, decisions or tasks from it here."
              }
            />
            {plan.health ? <HealthCard meetingId={meeting.id} health={plan.health} nameOf={plan.nameOf} /> : null}
          </div>
          <div className="md-col">
            {!meeting.missed ? <CatchUpLink meetingId={meeting.id} sentAgent={plan.sentAgent} /> : null}
            {plan.sentAgent ? <WhatMyAgentSaid meetingId={meeting.id} /> : null}
            {plan.agenda.items.length > 0 ? <PlanCards plan={plan} side="main" /> : null}
            <PlanCards plan={plan} side="aside" />
          </div>
        </div>
        <div className="md-col md-rail">
          <PeopleCard list={list} title="Invited" />
        </div>
      </div>
    );
  }

  /* What was said, joined to what was kept. */
  const thread = [
    {
      icon: Article,
      title: "Transcript",
      desc: `${plural(chunks.length, "line", "lines")}, searchable, with speakers`,
      href: `/meetings/${meeting.id}/transcript`,
    },
    { icon: Scales, title: "Decisions", desc: "Decisions you have confirmed", href: "/decisions" },
    { icon: CheckSquare, title: "Tasks", desc: "Action items, wherever they were captured", href: "/tasks" },
    {
      icon: Sparkle,
      title: "Catch-up",
      desc: "The one-minute version: what you own, what was decided",
      href: `/meetings/${meeting.id}/catch-up`,
    },
    {
      icon: Robot,
      title: "Agent collaboration",
      desc: "When agents asked each other for context, and what policy allowed",
      href: `/meetings/${meeting.id}/collaborations`,
    },
  ];

  return (
    <div className="md-cols">
      <div className="md-pair">
        <div className="md-col">
          <section className="mx-card mx-card-pad" aria-labelledby="md-recap-h">
            <div className="mx-card-head">
              <h2 className="mx-card-title" id="md-recap-h">
                Recap
              </h2>
              <span className="mx-card-note">From the transcript</span>
            </div>
            <dl className="md-stats">
              <div>
                <dt>Talked for</dt>
                <dd>
                  {spokenMin} <small>{spokenMin === 1 ? "min" : "mins"}</small>
                </dd>
              </div>
              <div>
                <dt>Speakers</dt>
                <dd>{talk.length}</dd>
              </div>
              <div>
                <dt>Words</dt>
                <dd>{words.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt>Lines</dt>
                <dd>{chunks.length.toLocaleString("en-US")}</dd>
              </div>
            </dl>
            {talk.length > 0 && (
              <div className="md-talk">
                <h3 className="md-sub">Talk time</h3>
                {talk.map((t) => (
                  <div className="md-talk-row" key={t.id}>
                    <span className="md-talk-name" title={t.name}>
                      {t.name}
                    </span>
                    <span className="md-bar" role="img" aria-label={`${t.name} spoke ${t.share} percent of the words`}>
                      <i style={{ width: `${t.share}%` }}></i>
                    </span>
                    <span className="md-talk-pct">{t.share}%</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          {plan.health ? <HealthCard meetingId={meeting.id} health={plan.health} nameOf={plan.nameOf} /> : null}
        </div>
        <div className="md-col">
          {plan.sentAgent ? <CatchUpLink meetingId={meeting.id} sentAgent /> : null}
          {plan.sentAgent ? <WhatMyAgentSaid meetingId={meeting.id} /> : null}
          <PlanCards plan={plan} side="main" />
          <section className="mx-card mx-card-pad" aria-labelledby="md-thread-h">
            <div className="mx-card-head">
              <h2 className="mx-card-title" id="md-thread-h">
                From this meeting
              </h2>
            </div>
            <p className="mx-help">What was said, and what was kept from it. Nothing reaches decisions or tasks until someone confirms it.</p>
            <ol className="md-thread">
              {thread.map((t) => (
                <li key={t.title}>
                  <Link href={t.href} className="md-thread-row tap">
                    <span className="md-thread-bead" aria-hidden="true" />
                    <span className="md-plan-ico" aria-hidden="true">
                      <t.icon size={17} />
                    </span>
                    <span className="md-linkcard-text">
                      <strong>{t.title}</strong>
                      <span>{t.desc}</span>
                    </span>
                    <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="md-col md-rail">
        <PlanCards plan={plan} side="aside" />
        <PeopleCard list={list} title="Took part" />
      </div>
    </div>
  );
}

export default async function MeetingDetailPage({ params }: { params: { meetingId: string } }) {
  const meeting = await resolveCallMeeting(params.meetingId);
  // A transcript that cannot be reached is shown as no transcript; the meeting itself still loads.
  const ended = meeting.status === "past";
  // ADR-0039: the brief before and during it, the health card after (not for one that never
  // happened); goals name and pick an agenda item's goal. Each failing costs only its own card.
  const [transcript, members, carried, brief, health, goals] = await Promise.all([
    fetchTranscriptSurface(meeting.id).catch(() => null),
    listMembers(),
    meeting.previousMeetingId ? fetchCarryForward(meeting.id) : Promise.resolve(null),
    ended ? Promise.resolve(null) : fetchMeetingBrief(meeting.id),
    ended && !meeting.missed ? fetchMeetingHealth(meeting.id) : Promise.resolve(null),
    fetchActiveGoals(),
  ]);
  // Older transcripts saved silence as empty lines.
  const chunks = (transcript?.chunks ?? []).filter((c) => c.text.trim().length > 0);
  const names = new Map((members ?? []).map((m) => [m.id, m.name]));
  const list = people(meeting, members);
  const invitable: PickableMember[] | null =
    members
      ?.filter((m) => !m.isYou && !meeting.participantIds.includes(m.id))
      .map(({ id, name, email }) => ({ id, name, email })) ?? null;
  const live = meeting.status === "live";
  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.durationMinutes * 60000);
  const shown = list.slice(0, 4);
  const host = list.find((p) => p.host) ?? null;
  const you = members?.find((m) => m.isYou) ?? null;
  const canEdit = !!you && (you.id === meeting.hostUserId || you.id === meeting.createdBy);
  const nameOf = (id: string) => names.get(id) ?? "Former member";
  const previous = meeting.previousMeetingId
    ? {
        id: meeting.previousMeetingId,
        title:
          meeting.previousMeeting?.title ??
          (carried?.ok ? carried.data.previous_meeting?.title : null) ??
          "The earlier meeting",
      }
    : null;
  const mine = you ? meeting.participants.find((p) => p.id === you.id) ?? null : null;
  const plan: Plan = {
    agenda: {
      meetingId: meeting.id,
      items: meeting.agenda,
      people: list.map((p) => ({ id: p.id, name: p.isYou ? `${p.name} (you)` : p.name })),
      canEdit,
      ended,
      meetingMinutes: meeting.durationMinutes,
    },
    carry: previous ? { previous, data: carried?.ok ? carried.data : null } : null,
    nameOf,
    attendance:
      you && mine && !ended
        ? {
            meetingId: meeting.id,
            saved: { attendance: mine.attendance, proxyUpdate: mine.proxyUpdate, proxyQuestions: mine.proxyQuestions },
            editable: meeting.status === "upcoming",
            agent: agentFace(you.id, you.name, you.agentName, you.agentSeed),
            hostName: host && !host.isYou ? host.name : null,
          }
        : null,
    brief: mine ? brief : null,
    health,
    goals,
    sentAgent: mine?.attendance === "agent",
  };

  return (
    <div className="mx-page md" id="page-meeting-detail">
      <Link href="/meetings" className="mx-back">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        All meetings
      </Link>

      <header className="mx-head">
        <div className="mx-head-main">
          <div className="md-chips">
            {ended ? (
              meeting.missed ? (
                <Chip>Did not happen</Chip>
              ) : (
                <Chip tone="ok">Ended</Chip>
              )
            ) : live ? (
              <Chip tone="high">
                <span className="mx-live-dot" aria-hidden="true" />
                Live now
              </Chip>
            ) : (
              <Chip tone="low">Scheduled</Chip>
            )}
            {host ? (
              <Chip title={host.isYou ? "You host this meeting" : `${host.name} hosts this meeting`}>
                <UserCircle size={14} aria-hidden="true" />
                {host.isYou ? "You host" : `Hosted by ${host.name}`}
              </Chip>
            ) : null}
            {ended && chunks.length > 0 ? (
              <Chip>
                <Article size={14} aria-hidden="true" />
                Transcript ready
              </Chip>
            ) : null}
            {meeting.confidential ? (
              <Chip title="Kept out of topic watch, and never shown in other meetings to people who weren't in this one">
                <LockSimple size={14} aria-hidden="true" />
                Confidential
              </Chip>
            ) : null}
            {plan.sentAgent && !ended ? (
              <Chip tone="low">
                <Robot size={14} aria-hidden="true" />
                Your agent attends for you
              </Chip>
            ) : null}
          </div>
          <h1 className="mx-title">{meeting.title}</h1>
          <div className="md-meta">
            <span>
              <CalendarBlank size={18} aria-hidden="true" />
              {dayFormatter.format(start)}
            </span>
            <span>
              <Clock size={18} aria-hidden="true" />
              {timeFormatter.format(start)} to {timeFormatter.format(end)}, {meeting.durationMinutes} min
            </span>
            <span>
              {shown.length > 0 ? (
                <span className="mx-avs">
                  {shown.map((p) => (
                    <Face person={p} size="sm" key={p.id} />
                  ))}
                </span>
              ) : (
                <UsersThree size={18} aria-hidden="true" />
              )}
              {plural(meeting.invited, "person", "people")}
            </span>
            {previous ? (
              <span>
                <ArrowBendUpLeft size={18} aria-hidden="true" />
                <span>
                  Follow-up to{" "}
                  <Link href={`/meetings/${previous.id}`} className="md-follow">
                    {previous.title}
                  </Link>
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <div className="mx-actions">
          {ended ? (
            chunks.length > 0 ? (
              <LinkButton href={`/meetings/${meeting.id}/transcript`}>
                <Article size={18} weight="bold" aria-hidden="true" />
                Open transcript
              </LinkButton>
            ) : null
          ) : (
            <>
              <InviteToMeeting meetingId={meeting.id} members={invitable} />
              <LinkButton href={`/meetings/${meeting.id}/join`}>
                <VideoCamera size={18} weight="bold" aria-hidden="true" />
                {live ? "Join the call" : "Join meeting"}
              </LinkButton>
            </>
          )}
        </div>
      </header>

      {ended ? (
        <EndedDetail meeting={meeting} list={list} chunks={chunks} names={names} plan={plan} />
      ) : (
        <UpcomingDetail meeting={meeting} list={list} hasTranscript={chunks.length > 0} plan={plan} />
      )}
    </div>
  );
}
