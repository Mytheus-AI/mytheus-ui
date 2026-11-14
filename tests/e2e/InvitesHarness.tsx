import "../../src/styles/meeting.css";
import "../../src/styles/meeting-hub.css";
import "../../src/styles/meeting-brain.css";
import "../../src/styles/meeting-invites.css";
import { OrgProvider } from "../../src/lib/org-context";
import { InviteShareCard } from "../../src/components/meetings/InviteShareCard";
import { INVITES } from "./invites-fixture";
import { PEOPLE } from "./NewMeetingHarness";

/* "Invite and share" as the meeting page's people rail draws it: the `.mx-app.mx-meet` root with
   the theme, a rail-width column. `state` picks a fixture (invites-fixture.ts). */

export function InvitesHarness({ state = "host", theme = "light" }: { state?: keyof typeof INVITES; theme?: "light" | "dark" }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "admin" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg p-4 sm:p-6" data-theme={theme}>
        <div className="md-col md-rail" style={{ maxWidth: 360 }}>
          <InviteShareCard meetingId="m-1" initial={INVITES[state]} members={PEOPLE} />
        </div>
      </div>
    </OrgProvider>
  );
}
