import type { Metadata } from "next";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { PreJoin } from "@/components/call/PreJoin";
import "@/styles/meeting-call.css";

export const metadata: Metadata = { title: "Join meeting | Mytheus" };

/* The pre-join screen: camera and mic check, the meeting card, the agent's brief and the
   recording consent. Resolves the meeting exactly as the room does; Join goes to the room. */

export const dynamic = "force-dynamic";

export default async function MeetingJoinPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const meeting = await resolveCallMeeting(params.meetingId);

  return <PreJoin meeting={meeting} />;
}
