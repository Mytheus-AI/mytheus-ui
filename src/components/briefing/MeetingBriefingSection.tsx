import { fetchBriefingSettings, fetchMeetingBriefing } from "@/lib/api/briefings";
import { BriefingPlayer, BriefingUnavailable } from "./BriefingPlayer";

/* The after page: your Myte's briefing about this meeting (or Brief me, once it has ended).
   Nothing at all for someone who was not in it: the briefing is personal. */
export async function MeetingBriefingSection({ meetingId }: { meetingId: string }) {
  const [read, settings] = await Promise.all([fetchMeetingBriefing(meetingId), fetchBriefingSettings()]);
  if (read.kind === "missing") return null;
  if (read.kind !== "live") return <BriefingUnavailable />;
  if (!read.data.can_request && !read.data.briefing) return null;
  return (
    <div id="briefing" className="scroll-mt-4">
      <BriefingPlayer
        initial={read.data.briefing ?? null}
        meetingId={meetingId}
        canRequest={read.data.can_request}
        enabled={read.data.enabled}
        preferences={settings.kind === "live" ? settings.data : null}
        variant="full"
      />
    </div>
  );
}
