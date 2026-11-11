import { OrgProvider } from "../../src/lib/org-context";
import { MeetingRoom } from "../../src/components/meeting/MeetingRoom";
import type { CallMeeting } from "../../src/components/call/resolve-meeting";
import { MEETING_ID } from "./fixtures";

/* The room as the (call) layout renders it: the org context, the scoped `.mx-app.mx-meet` root
   with the theme, and the room. Fixed data: Maya hosts; Raj is invited and present over the socket;
   Sarah sent her agent; Priya was invited and has not joined. */


// The call opened 25 minutes ago, whatever the clock says, so the room is joined late (the
// catch-up line shows) and the first item, started then, is over its 10 minute plan.
const OPENED = new Date(Date.now() - 25 * 60_000).toISOString();

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
    {
      id: "u-sarah",
      role: null,
      attendance: "agent",
      proxyUpdate: "QA signed off on the beta.",
      proxyQuestions: ["Can we move the launch a week?"],
    },
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
      started_at: OPENED,
    } as never,
    {
      id: "44444444-4444-4444-8444-444444444444",
      position: 1,
      title: "Launch date",
      owner_user_id: "u-sarah",
      duration_minutes: 15,
      status: "pending",
      status_source: null,
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

export function RoomHarness({
  theme = "light",
  asHost = true,
  emptyAgenda = false,
}: {
  theme?: "light" | "dark";
  asHost?: boolean;
  /** A meeting with no agenda at all: the calm empty state. */
  emptyAgenda?: boolean;
}) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "member" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg" data-theme={theme}>
        <MeetingRoom
          meeting={emptyAgenda ? { ...meeting, agenda: [] } : meeting}
          names={names}
          me={{ id: "u-maya", name: "Maya Chen", agentName: "Juniper", agentSeed: null, personality: null, steers: asHost }}
          session={{ consentRequired: false, consentedAt: "2026-11-11T09:59:00Z", recording: false, startedAt: OPENED }}
        />
      </div>
    </OrgProvider>
  );
}
