import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { TextLink } from "@/components/ui/TextLink";
import { ListeningSettings } from "@/components/listening/ListeningSettings";
import { PositionsEditor } from "@/components/listening/PositionsEditor";
import { fetchListeningPreferences, fetchPositions } from "@/lib/api/listening";
import type { ListeningPreferencesView } from "@/lib/api/listening-types";

export const metadata: Metadata = { title: "Listening | Settings | Mytheus" };
export const dynamic = "force-dynamic";

/* Settings > Listening (In every meeting at once): when your Myte may interrupt you about a
   meeting it listens to for you, your evening digest, and the lines it may hold for you. Which
   meetings it listens to is decided on Meetings > Listening. Both reads fail on their own: the
   form opens on the defaults and says so. */

const DEFAULTS: ListeningPreferencesView = {
  interruptions_enabled: true,
  max_per_hour: 3,
  quiet_start: null,
  quiet_end: null,
  focus_blocks: [],
  never_during_focus: true,
  digest_enabled: true,
  digest_hour: 18,
  time_zone: "UTC",
  interruptible_now: true,
  quiet_reason: null,
  quiet_until: null,
};

export default async function ListeningSettingsPage() {
  const [prefs, positions] = await Promise.all([fetchListeningPreferences(), fetchPositions()]);
  return (
    <>
      <SectionBar
        title="Listening"
        context="When your Myte may pull you out of what you are doing, and what it may say for you."
        action={<TextLink href="/meetings/listening">Choose which meetings</TextLink>}
      />
      <div className="grid gap-5">
        <ListeningSettings initial={prefs.ok ? prefs.data : DEFAULTS} loaded={prefs.ok} />
        <PositionsEditor initial={positions.ok ? positions.data.items : []} loaded={positions.ok} />
      </div>
    </>
  );
}
