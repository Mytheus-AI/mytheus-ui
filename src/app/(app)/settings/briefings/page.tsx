import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { ErrorState } from "@/components/ui/ErrorState";
import { BriefingSettingsPanel } from "@/components/briefing/BriefingSettingsPanel";
import { fetchBriefingSettings } from "@/lib/api/briefings";
import { fetchMyProfile } from "@/lib/api/profile";
import { resolveOrgContext } from "@/lib/api/org-context";
import { agentDisplayName } from "@/lib/realtime/agent-persona";
import { loadVoices } from "@/app/actions/voice";
import { agentSeed } from "@/lib/briefing";

export const metadata: Metadata = { title: "Briefings | Mytheus" };
export const dynamic = "force-dynamic";

/* Settings > Briefings: how your Myte briefs you (core-api `/api/v1/briefings/preferences`, the
   caller's own). */
export default async function BriefingSettingsPage() {
  const [settings, profile, org, voices] = await Promise.all([fetchBriefingSettings(), fetchMyProfile(), resolveOrgContext(), loadVoices()]);
  const name = agentDisplayName(profile?.agent_name, org?.user.name);
  return (
    <>
      <SectionBar title="Briefings" context="When your Myte briefs you, how long, in which language and in what voice. Only you hear your briefings." />
      {settings.kind === "live" ? (
        <BriefingSettingsPanel
          initial={settings.data}
          agentName={name}
          voices={voices.ok ? voices.catalog : null}
          agentSeed={agentSeed(profile?.agent_avatar_seed, org?.user.id ?? "")}
        />
      ) : (
        <ErrorState title="Your briefing settings could not be loaded" text="Nothing was lost. Your Myte keeps your settings; this page returns when it can be read." />
      )}
    </>
  );
}
