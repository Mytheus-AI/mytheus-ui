import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkle } from "@phosphor-icons/react/ssr";
import { Tag, firstName, initials } from "@/components/meetings/Tag";
import { wordCount } from "@/components/meetings/transcript-utils";
import {
  mockMeetings,
  mockMeetingDetails,
  mockDecisions,
  mockActions,
  mockTranscriptChunks,
  mockCollaborations,
  type Meeting,
  type Decision,
  type ActionItem,
  type TranscriptChunk,
} from "@/lib/mock/data";
import "@/styles/meeting-hub.css";

export const metadata: Metadata = { title: "Meeting | Mytheus" };

/* Meeting detail in the meeting design (non/mytheus-web meetings/[id] page). A Server Component
   on mock data: an upcoming or live meeting shows its agenda, the meeting card, what the agent
   has ready and the Join button; an ended one shows the recap, decisions, actions, artifacts,
   talk time and people.

   Left out on purpose, because the app has no data behind them yet: attachments, a recording,
   open questions, a pinned quote, who is in the lobby and per-role filtering of notes. */

export function generateStaticParams() {
  return mockMeetings.map((m) => ({ meetingId: m.id }));
}

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
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

function whenLine(meeting: Meeting): string {
  const start = new Date(meeting.startTime);
  return `${dayFormatter.format(start)} ${timeFormatter.format(start)} · ${meeting.durationMinutes} min · ${plural(
    meeting.participants.length,
    "person",
    "people",
  )}`;
}

function AgendaPanel({ agenda, delay }: { agenda: string[]; delay: string }) {
  return (
    <div className="panel reveal" style={{ animationDelay: delay }}>
      <div className="panel-head">
        <h2>Agenda</h2>
      </div>
      {agenda.map((item, i) => (
        <div className="panel-row is-top" key={item}>
          <span className="moment-dot" style={{ marginTop: 5 }} aria-hidden="true"></span>
          <span className="row-body">
            <p className="row-sum" style={{ marginTop: 0 }}>
              {item}
            </p>
          </span>
          <span className="head-when">{String(i + 1).padStart(2, "0")}</span>
        </div>
      ))}
      {agenda.length === 0 && (
        <div className="board-empty">The agenda lands here when the organizer shares it.</div>
      )}
    </div>
  );
}

function UpcomingDetail({
  meeting,
  agenda,
  actions,
  hasTranscript,
}: {
  meeting: Meeting;
  agenda: string[];
  actions: ActionItem[];
  hasTranscript: boolean;
}) {
  const live = meeting.status === "live";
  const shown = meeting.participants.slice(0, 3);
  const extra = meeting.participants.length - shown.length;

  /* What the agent has ready, from what the app actually holds for this meeting. */
  const prep: { kind: string; text: string }[] = [];
  if (agenda.length > 0) {
    prep.push({
      kind: "note",
      text: `The agenda's ${plural(agenda.length, "item is", "items are")} loaded for reference.`,
    });
  }
  for (const a of actions.filter((x) => x.status === "open")) {
    prep.push({
      kind: "action",
      text: `${a.title}. ${a.assignee} owns it, due ${shortDateFormatter.format(parseDueDate(a.dueDate))}.`,
    });
  }
  if (prep.length === 0) {
    prep.push({ kind: "note", text: "Your agent starts taking notes when the call begins." });
  }

  return (
    <div className="canvas cols-2">
      <div className="rail-stack">
        <AgendaPanel agenda={agenda} delay=".08s" />
      </div>

      <div className="rail-stack">
        <div className="panel reveal" style={{ animationDelay: ".1s" }}>
          <div className="panel-head">
            <h2>Meeting</h2>
            {live && (
              <span className="live-chip" style={{ marginLeft: "auto" }}>
                <span className="live-dot" aria-hidden="true"></span>
                Live now
              </span>
            )}
          </div>
          <div className="panel-body">
            <h3 className="detail-title" style={{ fontSize: 19 }}>
              {meeting.title}
            </h3>
            <p className="detail-by">{whenLine(meeting)}</p>
            <div className="pv-lobby">
              <span className="av-stack" aria-hidden="true">
                {shown.map((name) => (
                  <i className="is-initials" key={name}>
                    {initials(name)}
                  </i>
                ))}
                {extra > 0 && <span className="av-more">+{extra}</span>}
              </span>
              <span className="pv-lobby-note">
                {shown.map(firstName).join(", ")}
                {extra > 0 ? ` and ${extra} more` : ""} invited
              </span>
            </div>
          </div>
        </div>

        <div className="panel reveal" style={{ animationDelay: ".14s" }}>
          <div className="panel-head">
            <h2>Your agent is ready</h2>
            <Sparkle size={12} aria-hidden="true" />
          </div>
          {prep.map((p) => (
            <div className="panel-row is-top" key={p.text}>
              <span className={`moment-dot is-${p.kind}`} style={{ marginTop: 5 }} aria-hidden="true"></span>
              <span className="row-body">
                <p className="row-sum" style={{ marginTop: 0 }}>
                  {p.text}
                </p>
              </span>
            </div>
          ))}
          <div className="panel-foot agent-foot">
            <Sparkle size={13} aria-hidden="true" />
            Notes your agent takes are yours only. Nothing is saved without your confirm.
          </div>
        </div>

        <Link href={`/meetings/${meeting.id}/join`} className="join-btn mh-join tap reveal">
          Join meeting
        </Link>
        {hasTranscript && (
          <Link
            href={`/meetings/${meeting.id}/transcript`}
            className="foot-link tap"
            style={{ alignSelf: "center" }}
          >
            View transcript
          </Link>
        )}
      </div>
    </div>
  );
}

function talkTime(chunks: TranscriptChunk[]): { name: string; share: number }[] {
  const words = new Map<string, number>();
  let all = 0;
  for (const c of chunks) {
    const n = wordCount(c.text);
    words.set(c.speaker, (words.get(c.speaker) ?? 0) + n);
    all += n;
  }
  if (all === 0) return [];
  return Array.from(words.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, share: Math.round((n / all) * 100) }));
}

function EndedDetail({
  meeting,
  agenda,
  recap,
  decisions,
  actions,
  chunks,
}: {
  meeting: Meeting;
  agenda: string[];
  recap?: string;
  decisions: Decision[];
  actions: ActionItem[];
  chunks: TranscriptChunk[];
}) {
  const speakers = talkTime(chunks);
  const transcriptHref = `/meetings/${meeting.id}/transcript`;
  const artifacts = [
    ...(chunks.length > 0
      ? [
          {
            kicker: "Transcript",
            desc: `Searchable, ${plural(chunks.length, "line", "lines")} with speakers`,
            href: transcriptHref,
            tone: "is-brown",
          },
        ]
      : []),
    { kicker: "Decisions", desc: "Traceable back to this meeting", href: "/decisions", tone: "is-green" },
    ...(mockCollaborations.some((c) => c.meetingId === meeting.id)
      ? [
          {
            kicker: "Agent log",
            desc: "When one agent asked another for context",
            href: `/meetings/${meeting.id}/collaborations`,
            tone: "is-brown",
          },
        ]
      : []),
    { kicker: "Tasks", desc: "Every action item, wherever it was captured", href: "/tasks", tone: "is-orange" },
  ];

  return (
    <div className="canvas cols-2">
      <div className="panel reveal" style={{ animationDelay: ".08s" }}>
        <div className="panel-head">
          <h2>Your summary</h2>
          <span className="head-when">captured by your agent</span>
        </div>
        <div className="panel-body">
          {recap ? (
            <p className="rec-sum" style={{ maxWidth: "none", marginTop: 0 }}>
              {recap}
            </p>
          ) : (
            <p className="rail-note" style={{ marginTop: 0 }}>
              No recap was written for this meeting.
            </p>
          )}

          <div className="detail-section">Decisions confirmed</div>
          {decisions.length > 0 ? (
            decisions.map((d) => (
              <div className="mynote" key={d.id} style={{ padding: "5px 0" }}>
                <span className="moment-dot is-decision" style={{ marginTop: 5 }} aria-hidden="true"></span>
                <span className="mynote-body">
                  <p>
                    <Link href={`/meetings/${meeting.id}/decisions/${d.id}`} className="tap" style={{ color: "inherit" }}>
                      {d.title}
                    </Link>
                  </p>
                  <span className="cite-chip">Confirmed {shortDateFormatter.format(new Date(d.confirmedAt))}</span>
                </span>
              </div>
            ))
          ) : (
            <p className="rail-note">No decisions were confirmed in this meeting.</p>
          )}

          <div className="detail-section">Action items</div>
          {actions.length > 0 ? (
            actions.map((a) => (
              <div className="mynote" key={a.id} style={{ padding: "5px 0" }}>
                <span className="moment-dot is-action" style={{ marginTop: 5 }} aria-hidden="true"></span>
                <span className="mynote-body">
                  <p style={a.status === "done" ? { textDecoration: "line-through", color: "var(--mutedDeep)" } : undefined}>
                    {a.title}
                    <b> · {a.assignee}</b>
                  </p>
                  <span className="cite-chip">
                    {a.status === "done" ? "Done" : `Due ${shortDateFormatter.format(parseDueDate(a.dueDate))}`}
                  </span>
                </span>
              </div>
            ))
          ) : (
            <p className="rail-note">No action items were captured in this meeting.</p>
          )}

          {agenda.length > 0 && (
            <>
              <div className="detail-section">Agenda</div>
              {agenda.map((item) => (
                <div className="mynote" key={item} style={{ padding: "5px 0" }}>
                  <span className="moment-dot" style={{ marginTop: 5 }} aria-hidden="true"></span>
                  <span className="mynote-body">
                    <p>{item}</p>
                  </span>
                </div>
              ))}
            </>
          )}
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

        {speakers.length > 0 && (
          <div className="panel reveal" style={{ animationDelay: ".14s" }}>
            <div className="panel-head">
              <h2>Talk time</h2>
              <span className="head-when">share of words spoken</span>
            </div>
            <div className="panel-body">
              {speakers.map((s) => (
                <div className="speaker-row" key={s.name}>
                  <span className="speaker-name" title={s.name}>
                    {firstName(s.name)}
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
            <span className="head-when">{plural(meeting.participants.length, "participant", "participants")}</span>
          </div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {meeting.participants.map((name) => (
              <div className="member-row" key={name}>
                <span className="p-av is-initials" aria-hidden="true">
                  {initials(name)}
                </span>
                <span>
                  <strong>{name}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeetingDetailPage({ params }: { params: { meetingId: string } }) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);
  if (!meeting) notFound();

  const detail = mockMeetingDetails.find((d) => d.meetingId === meeting.id);
  const decisions = mockDecisions.filter((d) => d.meetingId === meeting.id);
  const actions = mockActions.filter((a) => a.meetingId === meeting.id);
  const chunks = mockTranscriptChunks.filter((c) => c.meetingId === meeting.id);
  const agenda = detail?.agenda ?? [];
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
        <EndedDetail
          meeting={meeting}
          agenda={agenda}
          recap={detail?.recap}
          decisions={decisions}
          actions={actions}
          chunks={chunks}
        />
      ) : (
        <UpcomingDetail meeting={meeting} agenda={agenda} actions={actions} hasTranscript={chunks.length > 0} />
      )}
    </div>
  );
}
