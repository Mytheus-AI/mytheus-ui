import type { Metadata } from "next";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { listMembers } from "@/lib/api/members";
import type { RoomNames } from "@/lib/realtime/room-names";
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
  const [meeting, members] = await Promise.all([resolveCallMeeting(params.meetingId), listMembers()]);
  // Internal user id -> display name, for the tiles, participants, chat and captions. Every
  // identity in the room is an internal user id; a member list that cannot be loaded only
  // costs names, never the call.
  const names: RoomNames = Object.fromEntries(
    (members ?? []).map((m) => [m.id, { name: m.name, imageUrl: m.imageUrl }]),
  );

  return <MeetingRoom meeting={meeting} names={names} />;
}
