import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkle } from "@phosphor-icons/react/ssr";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { Tag } from "@/components/meetings/Tag";
import { resolveSpeaker, wordCount } from "@/components/meetings/transcript-utils";
import type { CallMeeting } from "@/lib/api/meetings";
import { fetchTranscriptSurface, type MeetingSpeaker, type TranscriptChunk } from "@/lib/api/transcript";
import "@/styles/meeting-hub.css";

export const metadata: Metadata = { title: "Meeting | Mytheus" };

/* Meeting detail in the meeting design (non/mytheus-web meetings/[id] page), read from core-api:
   the meeting itself and, when it has one, its transcript. An upcoming or live meeting shows the
   meeting card, what the agent will do and the Join button; an ended one shows the summary,
   artifacts, talk time and people.

   The server has no agenda, recap, decision or action read model yet, and participants come as
   user ids without names, so those parts say plainly that nothing is there rather than showing
   sample content. */

export const dynamic = "force-dynamic";

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function whenLine(meeting: CallMeeting): string {
  const start = new Date(meeting.startTime);
  return `${dayFormatter.format(start)} ${timeFormatter.format(start)} · ${meeting.durationMinutes} min · ${plural(
    meeting.invited,
    "person",
    "people",
  )}`;
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

/** "in 2 hours", "3 hours ago": how far the start is from now, in the largest whole unit. */
function relative(from: Date, to: Date): string {
  const mins = Math.round((to.getTime() - from.getTime()) / 60000);
  const abs = Math.abs(mins);
  const [n, unit] =
    abs < 60 ? [abs, "minute"] : abs < 60 * 24 ? [Math.round(abs / 60), "hour"] : [Math.round(abs / 1440), "day"];
  const span = `${n} ${unit}${n === 1 ? "" : "s"}`;
  return mins >= 0 ? `in ${span}` : `${span} ago`;
}

function UpcomingDetail({ meeting, hasTranscript }: { meeting: CallMeeting; hasTranscript: boolean }) {
  const live = meeting.status === "live";
  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.durationMinutes * 60000);
  const now = new Date();
  const others = Math.max(0, meeting.invited - 1);
  const timing = live
    ? `Started ${relative(now, start)}`
    : start > now
      ? `Starts ${relative(now, start)}`
      : `Was due to start ${relative(now, start)}`;

  return (
    <div className="canvas cols-2">
      <div className="rail-stack">
        <div className="panel reveal" style={{ animationDelay: ".08s" }}>
          <div className="panel-head">
            <h2>When</h2>
            {live && (
              <span className="live-chip" style={{ marginLeft: "auto" }}>
                <span className="live-dot" aria-hidden="true"></span>
                Live now
              </span>
            )}
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
              <span>{timing}</span>
            </span>
          </div>
          <div className="mh-facts">
            <span>
              <small>Length</small>
              <b>{meeting.durationMinutes} min</b>
            </span>
            <span>
              <small>Invited</small>
              <b>{others === 0 ? "Only you" : `You and ${plural(others, "other", "others")}`}</b>
            </span>
            <span>
              <small>Transcript</small>
              <b>{hasTranscript ? "Ready" : "After the call"}</b>
            </span>
          </div>
        </div>

        <div className="panel reveal" style={{ animationDelay: ".12s" }}>
          <div className="panel-head">
            <h2>Agenda</h2>
          </div>
          <div className="board-empty">The agenda lands here when the organizer shares it.</div>
        </div>
      </div>

      <div className="rail-stack">
        <div className="panel reveal" style={{ animationDelay: ".1s" }}>
          <div className="panel-head">
            <h2>Your agent is ready</h2>
            <Sparkle size={12} aria-hidden="true" />
          </div>
          <div className="panel-row is-top">
            <span className="moment-dot is-note" style={{ marginTop: 5 }} aria-hidden="true"></span>
            <span className="row-body">
              <p className="row-sum" style={{ marginTop: 0 }}>
                Your agent starts taking notes when the call begins.
              </p>
            </span>
          </div>
          <div className="panel-foot agent-foot">
            <Sparkle size={13} aria-hidden="true" />
            Notes your agent takes are yours only. Nothing is saved without your confirm.
          </div>
        </div>

        <Link href={`/meetings/${meeting.id}/join`} className="join-btn mh-join tap reveal" style={{ animationDelay: ".14s" }}>
          Join meeting
        </Link>
        {hasTranscript && (
          <Link href={`/meetings/${meeting.id}/transcript`} className="foot-link tap" style={{ alignSelf: "center" }}>
            View transcript
          </Link>
        )}
      </div>
    </div>
  );
}

/** Share of words per speaker, labelled the same way the transcript labels them. */
function talkTime(chunks: TranscriptChunk[], speakers: MeetingSpeaker[]): { name: string; share: number }[] {
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
    .map(([id, n]) => ({ name: resolveSpeaker(id, speakers, {}, {}).label, share: Math.round((n / all) * 100) }));
}

function EndedDetail({
  meeting,
  chunks,
  speakers,
}: {
  meeting: CallMeeting;
  chunks: TranscriptChunk[];
  speakers: MeetingSpeaker[];
}) {
  const talk = talkTime(chunks, speakers);
  const artifacts = [
    ...(chunks.length > 0
      ? [
          {
            kicker: "Transcript",
            desc: `Searchable, ${plural(chunks.length, "line", "lines")} with speakers`,
            href: `/meetings/${meeting.id}/transcript`,
            tone: "is-brown",
          },
        ]
      : []),
    { kicker: "Decisions", desc: "Every decision you have confirmed", href: "/decisions", tone: "is-green" },
    { kicker: "Tasks", desc: "Every action item, wherever it was captured", href: "/tasks", tone: "is-orange" },
  ];

  return (
    <div className="canvas cols-2">
      <div className="panel reveal" style={{ animationDelay: ".08s" }}>
        <div className="panel-head">
          <h2>Your summary</h2>
        </div>
        <div className="panel-body">
          <p className="rail-note" style={{ marginTop: 0 }}>
            No recap was written for this meeting.
          </p>
          <div className="detail-section">Decisions confirmed</div>
          <p className="rail-note">No decisions were confirmed in this meeting.</p>
          <div className="detail-section">Action items</div>
          <p className="rail-note">No action items were captured in this meeting.</p>
        </div>
      </div>

      <div className="rail-stack">
        <div className="panel reveal" style={{ animationDelay: ".1s" }}>
          <div className="panel-head">
            <h2>Artifacts</h2>
          </div>
          {artifacts.map((a) => (
            <Link href={a.href} className="panel-row related-row tap" key={a.kicker} style={{ margin: 0 }}>
              <span className="row-body">
                <span className={`row-kicker ${a.tone}`}>{a.kicker}</span>
                <span className="related-label">{a.desc}</span>
              </span>
              <ArrowRight size={14} weight="bold" aria-hidden="true" style={{ color: "var(--mutedIcon)" }} />
            </Link>
          ))}
        </div>

        {talk.length > 0 && (
          <div className="panel reveal" style={{ animationDelay: ".14s" }}>
            <div className="panel-head">
              <h2>Talk time</h2>
              <span className="head-when">share of words spoken</span>
            </div>
            <div className="panel-body">
              {talk.map((s) => (
                <div className="speaker-row" key={s.name}>
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
          </div>
        )}

        <div className="panel reveal" style={{ animationDelay: ".18s" }}>
          <div className="panel-head">
            <h2>People</h2>
            <span className="head-when">{plural(meeting.invited, "participant", "participants")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function MeetingDetailPage({ params }: { params: { meetingId: string } }) {
  const meeting = await resolveCallMeeting(params.meetingId);
  // A transcript that cannot be reached is shown as no transcript; the meeting itself still loads.
  const transcript = await fetchTranscriptSurface(meeting.id).catch(() => null);
  const chunks = transcript?.chunks ?? [];
  const ended = meeting.status === "past";

  return (
    <div className="page-inner mh-page" style={{ maxWidth: 1240 }} id="page-meeting-detail">
      <div className="screen-head reveal">
        <div className="head-text">
          <Link href="/meetings" className="foot-link mh-back tap">
            <ArrowLeft size={12} weight="bold" aria-hidden="true" />
            All meetings
          </Link>
          <h1>{meeting.title}</h1>
          <p>{whenLine(meeting)}</p>
        </div>
        <div className="head-actions">
          {ended ? (
            <Tag variant="neutral">Ended</Tag>
          ) : (
            <Tag variant="green" dot>
              {meeting.status === "live" ? "Live now" : "Scheduled"}
            </Tag>
          )}
        </div>
      </div>

      {ended ? (
        <EndedDetail meeting={meeting} chunks={chunks} speakers={transcript?.speakers ?? []} />
      ) : (
        <UpcomingDetail meeting={meeting} hasTranscript={chunks.length > 0} />
      )}
    </div>
  );
}
