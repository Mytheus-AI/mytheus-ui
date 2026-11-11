import { OrgProvider } from "../../src/lib/org-context";
import { PreJoin } from "../../src/components/call/PreJoin";
import type { CallMeeting } from "../../src/components/call/resolve-meeting";
import { MEETING_ID } from "./fixtures";

/* The pre-join as the (call) layout renders it: the org context, the scoped `.mx-app.mx-meet`
   root with the theme, and the page. Fixed data: Maya joins a 30 minute review with three others
   invited, has not agreed to the notice yet (or, with `agreed`, did so earlier). */

const meeting: CallMeeting = {
  id: MEETING_ID,
  title: "Q4 launch review",
  startTime: "2026-11-11T10:00:00Z",
  durationMinutes: 30,
  status: "upcoming",
  invited: 4,
  participantIds: ["u-maya", "u-raj", "u-sarah", "u-priya"],
  participants: [],
  confidential: false,
  templateId: null,
  missed: false,
  hostUserId: "u-maya",
  createdBy: "u-maya",
  previousMeetingId: null,
  previousMeeting: null,
  agenda: [],
};

export function PreJoinHarness({
  theme = "light",
  agreed = false,
}: {
  theme?: "light" | "dark";
  agreed?: boolean;
}) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: {
          id: "u-maya",
          name: "Maya Chen",
          email: "maya@example.com",
          role: "member",
        },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg" data-theme={theme}>
        <PreJoin
          meeting={meeting}
          session={{
            consentRequired: true,
            consentedAt: agreed ? "2026-11-11T09:59:00Z" : null,
            recording: false,
            startedAt: null,
          }}
        />
      </div>
    </OrgProvider>
  );
}
