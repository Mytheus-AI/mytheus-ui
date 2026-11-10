import type { Metadata } from "next";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { fetchMyAgentPersonality, listMembers } from "@/lib/api/members";
import type { RoomNames } from "@/lib/realtime/room-names";
import { readRoomSession } from "../session";
import "@/styles/meeting-call.css";
import "@/styles/meeting-agenda.css";
import "@/styles/meeting-brain.css";
import "@/components/room/room-polish.css";
import "@/components/room/room-stage.css";

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
  const [meeting, members, personality, session] = await Promise.all([
    resolveCallMeeting(params.meetingId),
    listMembers(),
    fetchMyAgentPersonality(),
    readRoomSession(params.meetingId),
  ]);
  // Internal user id -> display name, for the tiles, participants, chat and captions. Every
  // identity in the room is an internal user id; a member list that cannot be loaded only
  // costs names, never the call.
  const names: RoomNames = Object.fromEntries(
    (members ?? []).map((m) => [
      m.id,
      { name: m.name, imageUrl: m.imageUrl, agentName: m.agentName, agentSeed: m.agentSeed },
    ]),
  );
  // You, by internal user id: your agent heads the sidebar, and the host's agenda controls and
  // nudges are yours when you host or created the meeting (ADR-0038 D6, D11).
  const you = members?.find((m) => m.isYou);
  const me = you
    ? {
        id: you.id,
        name: you.name,
        agentName: you.agentName,
        agentSeed: you.agentSeed,
        personality,
        steers: you.id === meeting.hostUserId || you.id === meeting.createdBy,
      }
    : null;

  return <MeetingRoom meeting={meeting} names={names} me={me} session={session} />;
}
