import { MeetingsHub, type HubPerson } from "@/components/meetings/MeetingsHub";
import { NewMeeting } from "@/components/meetings/NewMeeting";
import { listMeetings, toCallMeeting } from "@/lib/api/meetings";
import { listMembers } from "@/lib/api/members";
import "@/styles/meeting-hub.css";

/* The meetings hub. A Server Component that reads the caller's meetings and the workspace's
   members from core-api and hands plain data to one client island for the tabs, search, the
   calendar and the week. A list that cannot be loaded says so rather than claiming there are
   none. Members only name people (hosts, avatars, search by person); a member list that cannot
   be loaded costs names, never the list. */

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const [real, members] = await Promise.all([listMeetings(), listMembers()]);
  const invitable = members?.filter((m) => !m.isYou).map(({ id, name, email }) => ({ id, name, email })) ?? null;
  const people: Record<string, HubPerson> = Object.fromEntries(
    (members ?? []).map((m) => [m.id, { name: m.name, imageUrl: m.imageUrl ?? null, isYou: m.isYou }]),
  );
  const meetings = (real ?? []).map(toCallMeeting);

  return (
    <div className="mx-page">
      <header className="mx-head">
        <div className="mx-head-main">
          <h1 className="mx-title">Meetings</h1>
          <p className="mx-sub">Every call on your calendar, what your agent captured, and where to pick it up.</p>
        </div>
        <NewMeeting members={invitable} openFromLink />
      </header>
      <MeetingsHub meetings={meetings} people={people} invitable={invitable} unavailable={real === null} />
    </div>
  );
}
