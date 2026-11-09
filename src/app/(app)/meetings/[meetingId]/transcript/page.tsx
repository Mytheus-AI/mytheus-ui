import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { Article, User } from "@phosphor-icons/react/ssr";
import { TranscriptView } from "@/components/meeting/TranscriptView";
import { listMembers } from "@/lib/api/members";
import { SpeakerMapping } from "@/components/meeting/SpeakerMapping";
import { TalkTimePanel } from "@/components/transcript/TalkTimePanel";
import { TranscriptHead } from "@/components/transcript/TranscriptHead";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { fetchTranscriptSurface } from "@/lib/api/transcript";
import "@/styles/meeting-transcript.css";

export const metadata: Metadata = { title: "Transcript | Mytheus" };

/* Transcript view (plan 3-4 §3.8 steps 2 and 3, doc 20 §7): the durable record of the meeting,
   with speaker-resolved labels, in-page search, virtualized rows and jump-to-moment timestamps,
   plus the speaker-mapping surface. RSC page, client islands for the two interactive parts.

   Reads the meeting and `core-api`'s `GET /meetings/:id/transcript` and `GET .../speakers`. An
   unreachable transcript service is shown as no transcript; a 404 is a real not-found. */

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});

export default async function TranscriptPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = await resolveCallMeeting(params.meetingId);
  const [live, members] = await Promise.all([
    fetchTranscriptSurface(meeting.id).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      return null;
    }),
    listMembers(),
  ]);
  // Silence used to be saved as lines with no text; older transcripts still hold them.
  const chunks = (live?.chunks ?? []).filter((c) => c.text.trim().length > 0);
  const speakers = live?.speakers ?? [];
  // Each person's audio is transcribed on its own stream, so a line's speaker id is that
  // person's user id: name it straight from the workspace's members.
  const memberNames = new Map((members ?? []).map((m) => [m.id, m.name]));
  const speakerLabels: Record<string, string> = {};
  for (const c of chunks) {
    const name = memberNames.get(c.speaker_id);
    if (name) speakerLabels[c.speaker_id] = name;
  }

  const lineCounts: Record<string, number> = {};
  for (const c of chunks) lineCounts[c.speaker_id] = (lineCounts[c.speaker_id] ?? 0) + 1;

  const unassigned = speakers.filter((s) => !s.user_id && !speakerLabels[s.speaker_id]);
  const distinctSpeakers = new Set(chunks.map((c) => c.speaker_id)).size;
  const when = dateFormatter.format(new Date(meeting.startTime));

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

  const rail = (
    <>
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
