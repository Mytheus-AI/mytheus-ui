import { MeetingsHub, type HubPerson } from "@/components/meetings/MeetingsHub";
import { NewMeeting, type FollowUpOption } from "@/components/meetings/NewMeeting";
import { listMeetings, toCallMeeting } from "@/lib/api/meetings";
import { fetchActiveGoals, fetchMeetingTemplates } from "@/lib/api/meeting-brain";
import { listMembers } from "@/lib/api/members";
import "@/styles/meeting-hub.css";
import "@/styles/meeting-agenda.css";
import "@/styles/meeting-brain.css";

/* The meetings hub. A Server Component that reads the caller's meetings and the workspace's
   members from core-api and hands plain data to one client island for the tabs, search, the
   calendar and the week. A list that cannot be loaded says so rather than claiming there are
   none. Members only name people (hosts, avatars, search by person); a member list that cannot
   be loaded costs names, never the list. */

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  // Meeting types and goals feed the New meeting dialog (ADR-0039); either failing costs only
  // that part of the dialog, never the hub.
  const [real, members, templates, goals] = await Promise.all([
    listMeetings(),
    listMembers(),
    fetchMeetingTemplates(),
    fetchActiveGoals(),
  ]);
  const invitable = members?.filter((m) => !m.isYou).map(({ id, name, email }) => ({ id, name, email })) ?? null;
  const people: Record<string, HubPerson> = Object.fromEntries(
    (members ?? []).map((m) => [m.id, { name: m.name, imageUrl: m.imageUrl ?? null, isYou: m.isYou }]),
  );
  const meetings = (real ?? []).map(toCallMeeting);
  const you = members?.find((m) => m.isYou);
  const me = you ? { id: you.id, name: you.name } : null;
  // "Follow-up to" offers the meetings that have already started, newest first (ADR-0038 D11).
  // One that never happened has nothing to carry forward, so it is left out.
  const now = Date.now();
  const recent: FollowUpOption[] = meetings
    .filter((m) => !m.missed && Date.parse(m.startTime) <= now)
    .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime))
    .slice(0, 20)
    .map((m) => ({ id: m.id, title: m.title, startTime: m.startTime }));

  return (
    <div className="mx-page">
      <header className="mx-head">
        <div className="mx-head-main">
          <h1 className="mx-title">Meetings</h1>
          <p className="mx-sub">Every call on your calendar, what your agent captured, and where to pick it up.</p>
        </div>
        <NewMeeting members={invitable} openFromLink recent={recent} me={me} templates={templates} goals={goals} />
      </header>
      <MeetingsHub
        meetings={meetings}
        people={people}
        invitable={invitable}
        me={me}
        unavailable={real === null}
        templates={templates}
        goals={goals}
      />
    </div>
  );
}
