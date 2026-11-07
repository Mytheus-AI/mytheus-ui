import type { Metadata } from "next";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { PreJoin } from "@/components/call/PreJoin";
import { mockMeetings } from "@/lib/mock/data";
import "@/styles/meeting-call.css";

export const metadata: Metadata = { title: "Join meeting | Mytheus" };

/* The pre-join screen: camera and mic check, the meeting card, the agent's brief and the
   recording consent. Resolves the meeting exactly as the room does; Join goes to the room. */

export function generateStaticParams() {
  return mockMeetings.map((m) => ({ meetingId: m.id }));
}

export default async function MeetingJoinPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = await resolveCallMeeting(params.meetingId);

  return <PreJoin meeting={meeting} />;
}
