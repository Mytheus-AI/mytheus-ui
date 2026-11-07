import { MeetingsHub } from "@/components/meetings/MeetingsHub";
import type { HubMeeting } from "@/components/meetings/types";
import { mockMeetingDetails, mockMeetings, mockTranscriptChunks } from "@/lib/mock/data";

/* The meetings hub. A Server Component that reads the same mock sources as before (meetings,
   their agendas, and which of them have transcript lines) and hands plain data to one client
   island for tabs, search, filters and the calendar. */

export default function MeetingsPage() {
  const meetings: HubMeeting[] = mockMeetings.map((m) => ({
    id: m.id,
    title: m.title,
    startTime: m.startTime,
    durationMinutes: m.durationMinutes,
    status: m.status,
    participants: m.participants,
    decisionCount: m.decisionCount,
    actionCount: m.actionCount,
    agendaCount: mockMeetingDetails.find((d) => d.meetingId === m.id)?.agenda.length ?? 0,
    hasTranscript: mockTranscriptChunks.some((c) => c.meetingId === m.id),
  }));

  return (
    <div className="mx-auto max-w-6xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <header className="pb-6 pt-2">
        <h1 className="display text-[clamp(1.9rem,3.4vw,2.5rem)] text-ink-display">Meetings</h1>
        <p className="mt-1.5 max-w-[62ch] text-[15px] text-ink-3">
          Everything on your calendar, what your agent captured, and what still needs you.
        </p>
      </header>
      <MeetingsHub meetings={meetings} />
    </div>
  );
}
