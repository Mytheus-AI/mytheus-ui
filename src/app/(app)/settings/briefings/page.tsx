import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { ErrorState } from "@/components/ui/ErrorState";
import { BriefingSettingsPanel } from "@/components/briefing/BriefingSettingsPanel";
import { fetchBriefingSettings } from "@/lib/api/briefings";

export const metadata: Metadata = { title: "Briefings | Mytheus" };
export const dynamic = "force-dynamic";

/* Settings > Briefings: how your Myte briefs you (core-api `/api/v1/briefings/preferences`, the
   caller's own). */
export default async function BriefingSettingsPage() {
  const settings = await fetchBriefingSettings();
  return (
    <>
      <SectionBar title="Briefings" context="When your Myte briefs you, how long, in which language and how fast. Its voice is set on Your Myte. Only you hear your briefings." />
      {settings.kind === "live" ? (
        <BriefingSettingsPanel initial={settings.data} />
      ) : (
        <ErrorState title="Your briefing settings could not be loaded" text="Nothing was lost. Your Myte keeps your settings; this page returns when it can be read." />
      )}
    </>
  );
}
