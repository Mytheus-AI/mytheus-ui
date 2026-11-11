import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { ErrorState } from "@/components/ui/ErrorState";
import { BriefingSettingsPanel } from "@/components/briefing/BriefingSettingsPanel";
import { fetchBriefingSettings } from "@/lib/api/briefings";
import { fetchMyProfile } from "@/lib/api/profile";
import { resolveOrgContext } from "@/lib/api/org-context";
import { agentDisplayName } from "@/lib/realtime/agent-persona";
import { agentSeed } from "@/lib/briefing";

export const metadata: Metadata = { title: "Briefings | Mytheus" };
export const dynamic = "force-dynamic";

/* Settings > Briefings: how your agent briefs you (core-api `/api/v1/briefings/preferences`, the
   caller's own). */
export default async function BriefingSettingsPage() {
  const [settings, profile, org] = await Promise.all([fetchBriefingSettings(), fetchMyProfile(), resolveOrgContext()]);
  const name = agentDisplayName(profile?.agent_name, org?.user.name);
  return (
    <>
      <SectionBar title="Briefings" context="When your agent briefs you, how long, in which language and in what voice. Only you hear your briefings." />
      {settings.kind === "live" ? (
        <BriefingSettingsPanel
          initial={settings.data}
          agentName={name}
          agentSeed={agentSeed(profile?.agent_avatar_seed, org?.user.id ?? "")}
          personality={profile?.agent_personality ?? "balanced"}
        />
      ) : (
        <ErrorState title="Your briefing settings could not be loaded" text="Nothing was lost. Your agent keeps your settings; this page returns when it can be read." />
      )}
    </>
  );
}
