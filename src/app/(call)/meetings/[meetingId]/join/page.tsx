import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreJoin } from "@/components/call/PreJoin";
import { mockMeetings } from "@/lib/mock/data";
import "@/styles/meeting-call.css";

export const metadata: Metadata = { title: "Join meeting | Mytheus" };

/* The pre-join screen: camera and mic check, the meeting card, the agent's brief and the
   recording consent. Resolves the meeting exactly as the room does; Join goes to the room. */

export function generateStaticParams() {
  return mockMeetings.map((m) => ({ meetingId: m.id }));
}

export default function MeetingJoinPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);
  if (!meeting) notFound();

  return <PreJoin meeting={meeting} />;
}
