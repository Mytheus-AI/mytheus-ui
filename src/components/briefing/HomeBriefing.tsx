import { fetchBriefingSettings, fetchLatestBriefing } from "@/lib/api/briefings";
import { BriefingPlayer, BriefingUnavailable } from "./BriefingPlayer";

/* Home: the newest briefing from your Myte, in the compact player, with Brief me for "since my
   last briefing". Streams in under its own Suspense boundary so Home never waits on it. */
export async function HomeBriefing() {
  const [latest, settings] = await Promise.all([fetchLatestBriefing(), fetchBriefingSettings()]);
  if (latest.kind !== "live") return <BriefingUnavailable />;
  return (
    <BriefingPlayer
      initial={latest.data.briefing ?? null}
      meetingId={null}
      canRequest
      enabled={latest.data.enabled}
      preferences={settings.kind === "live" ? settings.data : null}
      variant="compact"
    />
  );
}
