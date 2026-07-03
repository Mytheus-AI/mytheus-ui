import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TranscriptView } from "@/components/meeting/TranscriptView";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockMeetings, mockTranscriptChunks } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Transcript — Mytheus" };

/* Transcript view (doc 20 §7): the durable record of the meeting, with
   speaker-colored labels, in-page search, and jump-to-moment timestamps.
   RSC page + a client TranscriptView island. */

export function generateStaticParams() {
  return mockMeetings.map((m) => ({ meetingId: m.id }));
}

export default function TranscriptPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);
  if (!meeting) notFound();

  const chunks = mockTranscriptChunks.filter((c) => c.meetingId === meeting.id);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="kicker text-signal">Transcript</p>
      <h1 className="display mt-2 text-[clamp(1.8rem,4vw,2.4rem)]">{meeting.title}</h1>
      <p className="mt-2 text-[14px] text-ink-3">
        The final transcript is the durable record — interim captions are never
        stored.
      </p>

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
          <TranscriptView chunks={chunks} />
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
