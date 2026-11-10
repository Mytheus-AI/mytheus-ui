import { Crumb } from "@/components/app/Crumb";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";

/* Every page about one meeting (the meeting itself, its transcript, catch-up, agent collaboration
   and decisions) names the meeting in the topbar breadcrumb, so the trail reads Meetings, Weekly
   sync, Transcript instead of a generic "Meeting". The pages read the meeting themselves (Next
   memoizes the identical read within a request), and they decide what a missing or unreachable
   meeting means: here a failed read only costs the crumb its title, so it never changes which
   page or error a visitor sees. */

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export default async function MeetingLayout({ params, children }: { params: { meetingId: string }; children: React.ReactNode }) {
  const meeting = await resolveCallMeeting(params.meetingId).catch(() => null);
  return (
    <>
      {meeting ? (
        <Crumb
          level="parent"
          label={meeting.title}
          href={`/meetings/${meeting.id}`}
          hint={dayFormatter.format(new Date(meeting.startTime))}
          icon="meeting"
        />
      ) : null}
      {children}
    </>
  );
}
