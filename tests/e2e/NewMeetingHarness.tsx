import "../../src/styles/meeting.css";
import "../../src/styles/meeting-hub.css";
import "../../src/styles/meeting-agenda.css";
import "../../src/styles/meeting-brain.css";
import "../../src/styles/meeting-invites.css";
import { OrgProvider } from "../../src/lib/org-context";
import { NewMeeting } from "../../src/components/meetings/NewMeeting";
import type { PickableMember } from "../../src/components/meetings/MemberPicker";
import type { MeetingTemplate } from "../../src/lib/api/meeting-brain-types";

/* The New meeting window as the meetings hub renders it: the `.mx-app.mx-meet` root with the theme
   and the hub's stylesheets. Fixed data: Maya is signed in; five teammates; one meeting type; two
   earlier meetings to follow up. `members` / `templates` can be null (could not load) or empty. */

export const PEOPLE: PickableMember[] = [
  { id: "u-raj", name: "Raj Patel", email: "raj@example.com" },
  { id: "u-priya", name: "Priya Nair", email: "priya@example.com" },
  { id: "u-sarah", name: "Sarah Okafor", email: "sarah@example.com" },
  { id: "u-diego", name: "Diego Alvarez", email: "diego@example.com" },
  { id: "u-aiko", name: "Aiko Tanaka", email: "aiko@example.com" },
  { id: "u-tomas", name: "Tomas Ferreira", email: "tomas@example.com" },
  { id: "u-daniel", name: "Daniel Okafor", email: "daniel@example.com" },
];

const TEMPLATES = [
  {
    id: "t-weekly",
    name: "Weekly sync",
    description: "Thirty minutes, what moved and what is stuck.",
    default_duration_minutes: 30,
    confidential: false,
    agenda: [
      { title: "What moved", duration_minutes: 10 },
      { title: "What is stuck", duration_minutes: 15 },
    ],
  },
] as unknown as MeetingTemplate[];

export function NewMeetingHarness({
  theme = "light",
  members = PEOPLE,
  templates = TEMPLATES,
}: {
  theme?: "light" | "dark";
  members?: PickableMember[] | null;
  templates?: MeetingTemplate[] | null;
}) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "admin" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg p-6" data-theme={theme}>
        <NewMeeting
          members={members}
          templates={templates}
          me={{ id: "u-maya", name: "Maya Chen" }}
          recent={[
            { id: "m-1", title: "Q4 launch review", startTime: "2026-11-04T10:00:00Z" },
            { id: "m-2", title: "Pricing review", startTime: "2026-10-28T15:00:00Z" },
          ]}
          goals={[]}
        />
      </div>
    </OrgProvider>
  );
}
