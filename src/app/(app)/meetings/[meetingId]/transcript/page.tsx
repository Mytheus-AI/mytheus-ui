import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Article, UserFocus } from "@phosphor-icons/react/ssr";
import { TranscriptView } from "@/components/meeting/TranscriptView";
import { SpeakerMapping } from "@/components/meeting/SpeakerMapping";
import { PanelEmpty } from "@/components/meetings/PanelEmpty";
import { TalkTime } from "@/components/meetings/TalkTime";
import { fetchTranscriptSurface, type TranscriptChunk } from "@/lib/api/transcript";
import { mockMeetings, mockTranscriptChunks } from "@/lib/mock/data";

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

  const notice =
    unassigned.length > 0 ? (
      <div className="mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-pill bg-priority-medium-soft px-3.5 py-3 text-[13.5px] font-semibold text-ink min-[700px]:mx-4">
        <UserFocus size={18} weight="fill" className="shrink-0 text-priority-medium" aria-hidden />
        <span className="min-w-0 flex-1">
          {unassigned.length === 1
            ? `${lineCounts[unassigned[0].speaker_id] ?? 0} lines are from Speaker ${unassigned[0].speaker_id}, not yet matched to a teammate.`
            : `${unassigned.length} speakers are not yet matched to a teammate.`}
        </span>
        <a
          href="#speakers"
          className="inline-flex h-8 items-center rounded-pill bg-surface px-3.5 text-[13px] font-semibold text-ink transition-[background-color,transform] duration-150 hover:bg-bg active:scale-[0.97]"
        >
          Assign speakers
        </a>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-6xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 pt-2">
        <div className="min-w-0 flex-[1_1_420px]">
          <h1 className="display break-words text-[clamp(1.9rem,3.4vw,2.5rem)] text-ink-display">
            {meeting.title}
          </h1>
          <p className="mt-1.5 max-w-[62ch] text-[15px] text-ink-3">
            Transcript, {when}, {meeting.durationMinutes} min
            {distinctSpeakers > 0
              ? `, ${distinctSpeakers} ${distinctSpeakers === 1 ? "speaker" : "speakers"}`
              : ""}
            .
          </p>
        </div>
        <Link
          href={`/meetings/${meeting.id}`}
          className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-line-2 px-5 text-[14px] font-semibold text-ink transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.98] motion-reduce:active:scale-100"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to meeting
        </Link>
      </header>

      {chunks.length === 0 ? (
        <PanelEmpty
          className="max-w-[640px]"
          icon={<Article size={34} />}
          title="No transcript yet"
          description={
            meeting.status === "past"
              ? "This meeting ran before transcription was enabled."
              : "The transcript appears here once the meeting has run."
          }
        />
      ) : (
        <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
          <TranscriptView
            chunks={chunks}
            speakers={speakers}
            speakerLabels={speakerLabels}
            notice={notice}
          />
          <aside aria-label="Speakers and talk time" className="flex min-w-0 flex-col gap-5">
            {speakers.length > 0 && (
              <SpeakerMapping meetingId={meeting.id} speakers={speakers} lineCounts={lineCounts} />
            )}
            <TalkTime chunks={chunks} speakers={speakers} speakerLabels={speakerLabels} />
          </aside>
        </div>
      )}
    </div>
  );
}
