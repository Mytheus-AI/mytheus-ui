import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { mockMeetings } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Meeting room | Mytheus" };

/* The real meeting-room screen (4-July Part 4b): video-grid mock, live
   captions, chat, and the agent sidebar - all presentation on mock data.
   LiveKit media and the Socket.io agent-stream/agent-results wiring are the
   later phase; they plug into <MeetingRoom /> without changing this route. */

export function generateStaticParams() {
  return mockMeetings.map((m) => ({ meetingId: m.id }));
}

export default function MeetingRoomPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);
  if (!meeting) notFound();

  return <MeetingRoom meeting={meeting} />;
}
