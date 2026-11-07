import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Article, User } from "@phosphor-icons/react/ssr";
import { TranscriptView } from "@/components/meeting/TranscriptView";
import { SpeakerMapping } from "@/components/meeting/SpeakerMapping";
import { TalkTimePanel } from "@/components/transcript/TalkTimePanel";
import { TranscriptHead } from "@/components/transcript/TranscriptHead";
import { fetchTranscriptSurface, type TranscriptChunk } from "@/lib/api/transcript";
import { mockMeetingDetails, mockMeetings, mockTranscriptChunks } from "@/lib/mock/data";
import "@/styles/meeting-transcript.css";

export const metadata: Metadata = { title: "Transcript | Mytheus" };

/* Transcript view (plan 3-4 §3.8 steps 2 and 3, doc 20 §7): the durable record of the meeting,
   with speaker-resolved labels, in-page search, virtualized rows and jump-to-moment timestamps,
   plus the speaker-mapping surface. RSC page, client islands for the two interactive parts.

   Reads through `core-api`'s `GET /meetings/:id/transcript` and `GET .../speakers`, both of
   which landed in mytheus-backend f6c9466 - before that neither existed, which is why this
   screen was on mock data. When no gateway is configured (every environment today) the read
   returns null and the mock transcript renders, so the screen keeps working; a configured
   gateway answering 404 is a real not-found and is NOT papered over with fabricated content. */

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});

/** The mock fixtures predate the real contract, so they carry a display name and an "mm:ss"
 *  string where the API carries a diarized `speaker_id` and `start_ms`. Adapting here rather
 *  than teaching the component two shapes keeps the component honest about what the server
 *  actually returns. */
function mockAsChunks(meetingId: string): TranscriptChunk[] {
  return mockTranscriptChunks
    .filter((c) => c.meetingId === meetingId)
    .map((c): TranscriptChunk => {
      const [m, s] = c.at.split(":").map(Number);
      const startMs = ((m || 0) * 60 + (s || 0)) * 1000;
      return {
        id: c.id,
        meeting_id: c.meetingId,
        // The fixture's display name stands in for a diarized label. The view renders an
        // unmapped speaker as "Speaker {id}", so a mock name reads as "Speaker Yash Maurya" -
        // slightly odd, and correct: it is exactly what an unmapped label looks like.
        speaker_id: c.speaker,
        start_ms: startMs,
        end_ms: startMs + 4000,
        text: c.text,
        is_final: true,
        confidence: 0.95,
        redacted: false,
      };
    });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TranscriptPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);
  if (!meeting) notFound();

  // Fixture ids ("mtg_1") are not UUIDs, so a real gateway answers them 422. They have no real
  // transcript to fetch; only a real meeting id goes to the gateway.
  const live = UUID.test(params.meetingId) ? await fetchTranscriptSurface(params.meetingId) : null;
  const chunks = live?.chunks ?? mockAsChunks(meeting.id);
  const speakers = live?.speakers ?? [];

  // The mock fixtures already carry display names in `speaker_id`; the real contract does not,
  // so labels are only overridden when the mock fallback is what is on screen.
  const speakerLabels: Record<string, string> = live
    ? {}
    : Object.fromEntries(chunks.map((c) => [c.speaker_id, c.speaker_id]));

  const lineCounts: Record<string, number> = {};
  for (const c of chunks) lineCounts[c.speaker_id] = (lineCounts[c.speaker_id] ?? 0) + 1;

  const unassigned = speakers.filter((s) => !s.user_id);
  const distinctSpeakers = new Set(chunks.map((c) => c.speaker_id)).size;
  const when = dateFormatter.format(new Date(meeting.startTime));

  const recap = mockMeetingDetails.find((d) => d.meetingId === meeting.id)?.recap;
  const meta = [
    "Transcript",
    when,
    `${meeting.durationMinutes} min`,
    distinctSpeakers > 0 ? `${distinctSpeakers} ${distinctSpeakers === 1 ? "speaker" : "speakers"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const backHref = `/meetings/${meeting.id}`;

  /* The design's "Who is Speaker 2?" banner. The assignment itself happens in the Speakers panel
     (one field per voice), so the banner points there rather than duplicating the control. */
  const firstOpen = unassigned[0];
  const openLines = firstOpen ? (lineCounts[firstOpen.speaker_id] ?? 0) : 0;
  const notice = firstOpen ? (
    <div className="assign-banner tx-banner">
      <User size={14} aria-hidden />
      <span>
        {unassigned.length === 1
          ? `Who is Speaker ${firstOpen.speaker_id}? ${openLines} ${openLines === 1 ? "line is" : "lines are"} not yet matched to a teammate.`
          : `${unassigned.length} speakers are not yet matched to a teammate.`}
      </span>
      <a href={`#sp-${firstOpen.speaker_id}`} className="assign-btn tap">
        Assign
      </a>
    </div>
  ) : null;

  if (chunks.length === 0) {
    return (
      <section className="page" id="page-transcript">
        <div className="page-inner tx-inner">
          <TranscriptHead title={meeting.title} meta={meta} backHref={backHref} />
          <div className="panel reveal tx-empty-page" style={{ animationDelay: ".09s" }}>
            <div className="tx-empty">
              <span className="tx-empty-icon" aria-hidden>
                <Article size={28} />
              </span>
              <h3>No transcript yet</h3>
              <p>
                {meeting.status === "past"
                  ? "This meeting ran before transcription was enabled."
                  : "The transcript appears here once the meeting has run."}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const hasOverview = Boolean(recap) || meeting.decisionCount > 0 || meeting.actionCount > 0;

  const rail = (
    <>
      {hasOverview && (
        <div className="panel reveal" style={{ animationDelay: ".09s" }}>
          <div className="panel-head">
            <h2>Overview</h2>
          </div>
          <div className="panel-body">
            {recap && (
              <p className="row-sum" style={{ marginTop: 0 }}>
                {recap}
              </p>
            )}
            {(meeting.decisionCount > 0 || meeting.actionCount > 0) && (
              <div className="row-chips" style={recap ? undefined : { marginTop: 0 }}>
                {meeting.decisionCount > 0 && (
                  <span className="tag tag-green">
                    <span className="tag-dot" />
                    {meeting.decisionCount} {meeting.decisionCount === 1 ? "decision" : "decisions"}
                  </span>
                )}
                {meeting.actionCount > 0 && (
                  <span className="tag tag-brown">
                    <span className="tag-dot" />
                    {meeting.actionCount} {meeting.actionCount === 1 ? "action item" : "action items"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {speakers.length > 0 && (
        <SpeakerMapping meetingId={meeting.id} speakers={speakers} lineCounts={lineCounts} />
      )}
      <TalkTimePanel chunks={chunks} speakers={speakers} speakerLabels={speakerLabels} />
    </>
  );

  return (
    <TranscriptView
      chunks={chunks}
      speakers={speakers}
      speakerLabels={speakerLabels}
      notice={notice}
      title={meeting.title}
      meta={meta}
      backHref={backHref}
      rail={rail}
    />
  );
}
