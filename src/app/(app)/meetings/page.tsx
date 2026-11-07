import { MeetingsHub } from "@/components/meetings/MeetingsHub";
import { listMeetings, toCallMeeting } from "@/lib/api/meetings";
import "@/styles/meeting-hub.css";

/* The meetings hub, in the meeting design (non/mytheus-web meetings page). A Server Component
   that reads the caller's meetings from core-api and hands plain data to one client island for
   search and filters. A list that cannot be loaded says so rather than claiming there are none. */

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const real = await listMeetings();
  const meetings = (real ?? []).map(toCallMeeting);

  return (
    <div className="page-inner mh-page" style={{ maxWidth: 1240 }}>
      <div className="screen-head reveal">
        <div className="head-text">
          <h1>Meetings</h1>
          <p>Every call, its prep and everything it produced</p>
        </div>
      </div>
      <MeetingsHub meetings={meetings} unavailable={real === null} />
    </div>
  );
}
