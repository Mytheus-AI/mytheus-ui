import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TranscriptView } from "@/components/meeting/TranscriptView";
import { SpeakerMapping } from "@/components/meeting/SpeakerMapping";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchTranscriptSurface, type TranscriptChunk } from "@/lib/api/transcript";
import { mockMeetings, mockTranscriptChunks } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Transcript — Mytheus" };

/* Transcript view (plan 3-4 §3.8 steps 2 and 3, doc 20 §7): the durable record of the meeting,
   with speaker-resolved labels, in-page search, virtualized rows and jump-to-moment timestamps,
   plus the speaker-mapping surface. RSC page, client islands for the two interactive parts.

   Reads through `core-api`'s `GET /meetings/:id/transcript` and `GET .../speakers`, both of
   which landed in mytheus-backend f6c9466 - before that neither existed, which is why this
   screen was on mock data. When no gateway is configured (every environment today) the read
   returns null and the mock transcript renders, so the screen keeps working; a configured
   gateway answering 404 is a real not-found and is NOT papered over with fabricated content. */

export const dynamic = "force-dynamic";

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

export default async function TranscriptPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);
  if (!meeting) notFound();

  const live = await fetchTranscriptSurface(params.meetingId);
  const chunks = live?.chunks ?? mockAsChunks(meeting.id);
  const speakers = live?.speakers ?? [];

  return (
    <div className="mx-auto max-w-4xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <p className="kicker text-signal">Transcript</p>
      <h1 className="display mt-2 break-words text-[clamp(1.8rem,4vw,2.4rem)]">{meeting.title}</h1>
      <p className="mt-2 text-[14px] text-ink-3">
        The final transcript is the durable record — interim captions are never stored.
      </p>

      {speakers.length > 0 && (
        <div className="mt-8">
          <SpeakerMapping meetingId={meeting.id} speakers={speakers} />
        </div>
      )}

      <div className="mt-8">
        {chunks.length === 0 ? (
          <EmptyState
            title="No transcript yet"
            description={
              meeting.status === "past"
                ? "This meeting ran before transcription was enabled."
                : "The transcript appears here once the meeting has run."
            }
          />
        ) : (
          <TranscriptView chunks={chunks} speakers={speakers} />
        )}
      </div>

      <div className="mt-10">
        <Link
          href={`/meetings/${meeting.id}`}
          className="link-underline text-[13px] font-medium text-ink-2"
        >
          ← Meeting details
        </Link>
      </div>
    </div>
  );
}
