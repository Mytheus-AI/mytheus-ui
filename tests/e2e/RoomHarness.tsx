import { OrgProvider } from "../../src/lib/org-context";
import { MeetingRoom } from "../../src/components/meeting/MeetingRoom";
import type { CallMeeting } from "../../src/components/call/resolve-meeting";
import { MEETING_ID } from "./fixtures";

/* The room as the (call) layout renders it: the org context, the scoped `.mx-app.mx-meet` root
   with the theme, and the room. Fixed data: Maya hosts; Raj is invited and present over the socket;
   Sarah sent her agent; Priya was invited and has not joined. */


const meeting: CallMeeting = {
  id: MEETING_ID,
  title: "Q4 launch review",
  startTime: "2026-11-11T10:00:00Z",
  durationMinutes: 45,
  status: "live",
  invited: 4,
  participantIds: ["u-maya", "u-raj", "u-sarah", "u-priya"],
  participants: [
    { id: "u-maya", role: "host", attendance: "live", proxyUpdate: null, proxyQuestions: [] },
    { id: "u-raj", role: null, attendance: "live", proxyUpdate: null, proxyQuestions: [] },
    { id: "u-sarah", role: null, attendance: "agent", proxyUpdate: "QA signed off on the beta.", proxyQuestions: [] },
    { id: "u-priya", role: null, attendance: "live", proxyUpdate: null, proxyQuestions: [] },
  ],
  confidential: false,
  templateId: null,
  missed: false,
  hostUserId: "u-maya",
  createdBy: "u-maya",
  previousMeetingId: null,
  previousMeeting: null,
  agenda: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      title: "Beta readiness",
      owner_user_id: "u-raj",
      duration_minutes: 10,
      status: "in_progress",
      status_source: "agent",
      agent_note: null,
    } as never,
  ],
};

const names = {
  "u-maya": { name: "Maya Chen", imageUrl: null },
  "u-raj": { name: "Raj Patel", imageUrl: null },
  "u-sarah": { name: "Sarah Okafor", imageUrl: null },
  "u-priya": { name: "Priya Nair", imageUrl: null },
};

export function RoomHarness({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "member" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg" data-theme={theme}>
        <MeetingRoom
          meeting={meeting}
          names={names}
          me={{ id: "u-maya", name: "Maya Chen", agentName: "Juniper", agentSeed: null, personality: null, steers: true }}
          session={{ consentRequired: false, consentedAt: "2026-11-11T09:59:00Z", recording: false, startedAt: "2026-11-11T10:00:00Z" }}
        />
      </div>
    </OrgProvider>
  );
}
