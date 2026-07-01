import { LinkButton } from "@/components/ui/Button";
import { mockMeetings } from "@/lib/mock/data";

/* Placeholder only — real-time video (LiveKit), live captions, and the agent
   sidebar (Socket.io: agent-stream / agent-results) are a later phase. Do not
   build any of that here; this route exists so the meeting card link resolves
   to a real page instead of a 404. */

export default function MeetingRoomPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <p className="kicker text-signal">Meeting room</p>
        <h1 className="display mt-5 text-[clamp(2rem,5vw,3rem)]">Coming soon</h1>
        <p className="mx-auto mt-5 max-w-sm text-[14px] text-ink-3">
          {meeting
            ? `The room for "${meeting.title}" isn't built yet.`
            : "This meeting room isn't built yet."}{" "}
          Live video, captions, and the per-participant agent sidebar are landing in a
          later phase.
        </p>
        <div className="mt-8 flex justify-center">
          <LinkButton href="/meetings" variant="outline">
            Back to meetings
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
