import type { Metadata } from "next";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import "@/styles/meeting-call.css";

export const metadata: Metadata = { title: "Meeting room | Mytheus" };

/* The live meeting room, full screen in the (call) layout: the stage (LiveKit video once the room
   is connected, your own tile until then), live captions, and the side panel with the agent, the
   participants and chat. See <MeetingRoom /> for the data flow. */

export const dynamic = "force-dynamic";

export default async function MeetingRoomPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = await resolveCallMeeting(params.meetingId);

  return <MeetingRoom meeting={meeting} />;
}
