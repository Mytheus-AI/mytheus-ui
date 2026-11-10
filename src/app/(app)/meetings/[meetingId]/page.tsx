import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Article,
  CalendarBlank,
  CheckSquare,
  Clock,
  NotePencil,
  Question,
  Robot,
  Scales,
  ShieldCheck,
  UsersThree,
  VideoCamera,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/meetings/Chip";
import { InviteToMeeting } from "@/components/meetings/InviteToMeeting";
import type { PickableMember } from "@/components/meetings/MemberPicker";
import { wordCount } from "@/components/meetings/transcript-utils";
import { initials, toneOf } from "@/components/room/tone";
import type { CallMeeting } from "@/lib/api/meetings";
import { listMembers, type WorkspaceMemberView } from "@/lib/api/members";
import { fetchTranscriptSurface, type TranscriptChunk } from "@/lib/api/transcript";
import "@/styles/meeting-hub.css";

export const metadata: Metadata = { title: "Meeting | Mytheus" };

/* A meeting's page, read from core-api. A title row (status, the serif title, when and who, the
   one primary action), then two columns laid out for what you need at that moment:

   - Before or during the call: when it is, what your agent will do, and who is invited (by name).
   - After it: the recap with talk time, and "From this meeting": what was said (the transcript)
     joined by the coral line to what was kept (decisions, tasks, agent collaboration). No Join: a
     call that has ended stays ended (meeting-service closes an empty room after five minutes and
     refuses new tokens for an ended meeting).
   - Missed: its time passed and nobody joined. Said plainly, with who was invited.

   Every person is an internal user id; names come from the workspace's members. */

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

type Person = { id: string; name: string; email: string; imageUrl: string | null; isYou: boolean; host: boolean };

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
        host: p.role === "host",
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

function UpcomingDetail({ meeting, list, hasTranscript }: { meeting: CallMeeting; list: Person[]; hasTranscript: boolean }) {
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
      <div className="md-col">
        <WhenCard meeting={meeting} note={note} live={live} />
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
      <div className="md-col">
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
}: {
  meeting: CallMeeting;
  list: Person[];
  chunks: TranscriptChunk[];
  names: Map<string, string>;
}) {
  const talk = talkTime(chunks, names);
  const spokenMs = chunks.length > 0 ? Math.max(...chunks.map((c) => c.end_ms)) - Math.min(...chunks.map((c) => c.start_ms)) : 0;
  const spokenMin = Math.max(1, Math.round(spokenMs / 60000));
  const words = chunks.reduce((n, c) => n + wordCount(c.text), 0);

  if (meeting.missed || chunks.length === 0) {
    return (
      <div className="md-cols">
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
        </div>
        <div className="md-col">
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
      icon: Robot,
      title: "Agent collaboration",
      desc: "When agents asked each other for context, and what policy allowed",
      href: `/meetings/${meeting.id}/collaborations`,
    },
  ];

  return (
    <div className="md-cols">
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

      <div className="md-col">
        <PeopleCard list={list} title="Took part" />
      </div>
    </div>
  );
}

export default async function MeetingDetailPage({ params }: { params: { meetingId: string } }) {
  const meeting = await resolveCallMeeting(params.meetingId);
  // A transcript that cannot be reached is shown as no transcript; the meeting itself still loads.
  const [transcript, members] = await Promise.all([
    fetchTranscriptSurface(meeting.id).catch(() => null),
    listMembers(),
  ]);
  // Older transcripts saved silence as empty lines.
  const chunks = (transcript?.chunks ?? []).filter((c) => c.text.trim().length > 0);
  const names = new Map((members ?? []).map((m) => [m.id, m.name]));
  const list = people(meeting, members);
  const invitable: PickableMember[] | null =
    members
      ?.filter((m) => !m.isYou && !meeting.participantIds.includes(m.id))
      .map(({ id, name, email }) => ({ id, name, email })) ?? null;
  const ended = meeting.status === "past";
  const live = meeting.status === "live";
  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.durationMinutes * 60000);
  const shown = list.slice(0, 4);

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
            {ended && chunks.length > 0 ? (
              <Chip>
                <Article size={14} aria-hidden="true" />
                Transcript ready
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
        <EndedDetail meeting={meeting} list={list} chunks={chunks} names={names} />
      ) : (
        <UpcomingDetail meeting={meeting} list={list} hasTranscript={chunks.length > 0} />
      )}
    </div>
  );
}
