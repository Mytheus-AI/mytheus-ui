import { MeetingsHub } from "@/components/meetings/MeetingsHub";
import type { HubMeeting } from "@/components/meetings/types";
import { mockMeetingDetails, mockMeetings, mockTranscriptChunks } from "@/lib/mock/data";
import "@/styles/meeting-hub.css";

/* The meetings hub, in the meeting design (non/mytheus-web meetings page). A Server Component
   that reads the same mock sources as before (meetings, their agendas and recaps, and which of
   them have transcript lines) and hands plain data to one client island for search and filters. */

export default function MeetingsPage() {
  const meetings: HubMeeting[] = mockMeetings.map((m) => {
    const detail = mockMeetingDetails.find((d) => d.meetingId === m.id);
    return {
      id: m.id,
      title: m.title,
      startTime: m.startTime,
      durationMinutes: m.durationMinutes,
      status: m.status,
      participants: m.participants,
      decisionCount: m.decisionCount,
      actionCount: m.actionCount,
      agendaCount: detail?.agenda.length ?? 0,
      hasTranscript: mockTranscriptChunks.some((c) => c.meetingId === m.id),
      recap: detail?.recap,
    };
  });

  return (
    <div className="page-inner mh-page" style={{ maxWidth: 1240 }}>
      <div className="screen-head reveal">
        <div className="head-text">
          <h1>Meetings</h1>
          <p>Every call, its prep and everything it produced</p>
        </div>
      </div>
      <MeetingsHub meetings={meetings} />
    </div>
  );
}
