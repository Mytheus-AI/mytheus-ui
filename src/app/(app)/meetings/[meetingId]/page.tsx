import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Article, Clock, Sparkle, UsersThree } from "@phosphor-icons/react/ssr";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { InviteToMeeting } from "@/components/meetings/InviteToMeeting";
import type { PickableMember } from "@/components/meetings/MemberPicker";
import { Tag } from "@/components/meetings/Tag";
import { wordCount } from "@/components/meetings/transcript-utils";
import type { CallMeeting } from "@/lib/api/meetings";
import { listMembers, type WorkspaceMemberView } from "@/lib/api/members";
import { fetchTranscriptSurface, type TranscriptChunk } from "@/lib/api/transcript";
import "@/styles/meeting-hub.css";

export const metadata: Metadata = { title: "Meeting | Mytheus" };

/* A meeting's page, read from core-api. Three states, each laid out for what you need then:

   - Before or during the call: when it is, who is in it (by name), and one action card to join,
     invite or open the transcript; the agent card underneath.
   - After it: talk time and who took part, by name, and where its transcript and outcomes live.
     No Join: a call that has ended stays ended (meeting-service closes an empty room after
     five minutes and refuses new tokens for an ended meeting).
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

function PeoplePanel({ list, title, delay }: { list: Person[]; title: string; delay: string }) {
  return (
    <div className="panel reveal" style={{ animationDelay: delay }}>
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="head-when">{plural(list.length, "person", "people")}</span>
      </div>
      <ul className="mh-people">
        {list.map((p) => (
          <li key={p.id}>
            <span className="mh-person-av" aria-hidden="true">
              {p.imageUrl ? (
                // Clerk's CDN; a plain <img> keeps it out of next/image's domain list.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                initials(p.name)
              )}
            </span>
            <span className="mh-person-who">
              <strong>
                {p.name}
                {p.isYou && <small> (you)</small>}
              </strong>
              {p.email && <span>{p.email}</span>}
            </span>
            {p.host && <Tag variant="neutral">Host</Tag>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhenPanel({ meeting, note }: { meeting: CallMeeting; note: string }) {
  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.durationMinutes * 60000);
  return (
    <div className="panel reveal" style={{ animationDelay: ".08s" }}>
      <div className="panel-head">
        <h2>When</h2>
      </div>
      <div className="panel-body mh-when">
        <span className="mh-date" aria-hidden="true">
          <small>{monthFormatter.format(start)}</small>
          <b>{start.getDate()}</b>
        </span>
        <span className="mh-when-text">
          <strong>
            {dayFormatter.format(start)}, {timeFormatter.format(start)} to {timeFormatter.format(end)}
          </strong>
          <span>{note}</span>
        </span>
      </div>
    </div>
  );
}

function UpcomingDetail({
  meeting,
  list,
  hasTranscript,
  invitable,
}: {
  meeting: CallMeeting;
  list: Person[];
  hasTranscript: boolean;
  invitable: PickableMember[] | null;
}) {
  const live = meeting.status === "live";
  const start = new Date(meeting.startTime);
  const now = new Date();
  const note = live
    ? `Started ${relative(now, start)}`
    : start > now
      ? `Starts ${relative(now, start)}`
      : `Was due ${relative(now, start)}, still open to join`;

  return (
    <div className="canvas cols-2 mh-detail">
      <div className="rail-stack">
        <WhenPanel meeting={meeting} note={note} />
        <PeoplePanel list={list} title="Invited" delay=".12s" />
      </div>

      <div className="rail-stack">
        <div className="panel reveal mh-action" style={{ animationDelay: ".1s" }}>
          <div className="mh-action-state">
            {live ? (
              <span className="live-chip">
                <span className="live-dot" aria-hidden="true"></span>
                Live now
              </span>
            ) : (
              <span className="mh-action-when">
                <Clock size={14} aria-hidden="true" />
                {start > now ? `Starts ${relative(now, start)}` : "Open to join"}
              </span>
            )}
          </div>
          <Link href={`/meetings/${meeting.id}/join`} className="join-btn mh-join tap">
            {live ? "Join the call" : "Join meeting"}
          </Link>
          <div className="mh-action-more">
            <InviteToMeeting meetingId={meeting.id} members={invitable} />
            {hasTranscript && (
              <Link href={`/meetings/${meeting.id}/transcript`} className="btn-ghost-sm tap">
                <Article size={14} aria-hidden="true" />
                Transcript
              </Link>
            )}
          </div>
        </div>

        <div className="panel reveal" style={{ animationDelay: ".14s" }}>
          <div className="panel-head">
            <h2>Your agent</h2>
            <Sparkle size={12} aria-hidden="true" />
          </div>
          <div className="panel-body">
            <p className="rail-note" style={{ marginTop: 0 }}>
              Takes notes for you once the call starts. They show in your sidebar during the call
              and are yours only.
            </p>
          </div>
        </div>
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
      <div className="canvas cols-2 mh-detail">
        <div className="rail-stack">
          <WhenPanel
            meeting={meeting}
            note={meeting.missed ? "Nobody joined before it ended" : "No transcript was captured for this call"}
          />
        </div>
        <div className="rail-stack">
          <PeoplePanel list={list} title="Invited" delay=".12s" />
        </div>
      </div>
    );
  }

  return (
    <div className="canvas cols-2 mh-detail">
      <div className="rail-stack">
        <div className="panel reveal" style={{ animationDelay: ".08s" }}>
          <div className="panel-head">
            <h2>Recap</h2>
          </div>
          <div className="mh-facts">
            <span>
              <small>Talked for</small>
              <b>{plural(spokenMin, "minute", "minutes")}</b>
            </span>
            <span>
              <small>Speakers</small>
              <b>{talk.length}</b>
            </span>
            <span>
              <small>Words</small>
              <b>{words.toLocaleString("en-US")}</b>
            </span>
          </div>
          {talk.length > 0 && (
            <div className="panel-body">
              <div className="detail-section" style={{ marginTop: 0 }}>
                Talk time
              </div>
              {talk.map((s) => (
                <div className="speaker-row" key={s.id}>
                  <span className="speaker-name" title={s.name}>
                    {s.name}
                  </span>
                  <span className="meter" role="img" aria-label={`${s.name} spoke ${s.share} percent of the words`}>
                    <i style={{ width: `${s.share}%` }}></i>
                  </span>
                  <span className="speaker-share">{s.share}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <PeoplePanel list={list} title="Took part" delay=".12s" />
      </div>

      <div className="rail-stack">
        <div className="panel reveal" style={{ animationDelay: ".1s" }}>
          <div className="panel-head">
            <h2>From this meeting</h2>
          </div>
          {[
            {
              kicker: "Transcript",
              desc: `${plural(chunks.length, "line", "lines")}, searchable, with speakers`,
              href: `/meetings/${meeting.id}/transcript`,
              tone: "is-brown",
            },
            { kicker: "Decisions", desc: "Decisions you have confirmed", href: "/decisions", tone: "is-green" },
            { kicker: "Tasks", desc: "Action items, wherever they were captured", href: "/tasks", tone: "is-orange" },
          ].map((a) => (
            <Link href={a.href} className="panel-row related-row tap" key={a.kicker} style={{ margin: 0 }}>
              <span className="row-body">
                <span className={`row-kicker ${a.tone}`}>{a.kicker}</span>
                <span className="related-label">{a.desc}</span>
              </span>
              <ArrowRight size={14} weight="bold" aria-hidden="true" style={{ color: "var(--mutedIcon)" }} />
            </Link>
          ))}
        </div>
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
  const invitable =
    members
      ?.filter((m) => !m.isYou && !meeting.participantIds.includes(m.id))
      .map(({ id, name, email }) => ({ id, name, email })) ?? null;
  const ended = meeting.status === "past";
  const start = new Date(meeting.startTime);

  return (
    <div className="page-inner mh-page" style={{ maxWidth: 1160 }} id="page-meeting-detail">
      <div className="screen-head reveal mh-detail-head">
        <div className="head-text">
          <Link href="/meetings" className="foot-link mh-back tap">
            <ArrowLeft size={12} weight="bold" aria-hidden="true" />
            All meetings
          </Link>
          <div className="mh-title-row">
            <h1>{meeting.title}</h1>
            {ended ? (
              <Tag variant="neutral">{meeting.missed ? "Didn't happen" : "Ended"}</Tag>
            ) : (
              <Tag variant="green" dot>
                {meeting.status === "live" ? "Live now" : "Scheduled"}
              </Tag>
            )}
          </div>
          <p className="mh-meta">
            <span>
              {dayFormatter.format(start)}, {timeFormatter.format(start)}
            </span>
            <span>{meeting.durationMinutes} min</span>
            <span>
              <UsersThree size={13} aria-hidden="true" />
              {plural(meeting.invited, "person", "people")}
            </span>
          </p>
        </div>
      </div>

      {ended ? (
        <EndedDetail meeting={meeting} list={list} chunks={chunks} names={names} />
      ) : (
        <UpcomingDetail meeting={meeting} list={list} hasTranscript={chunks.length > 0} invitable={invitable} />
      )}
    </div>
  );
}
