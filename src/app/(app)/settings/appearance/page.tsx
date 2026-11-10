import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { AppearancePanel } from "@/components/settings/AppearancePanel";

export const metadata: Metadata = { title: "Appearance | Mytheus" };

/* Settings > Appearance: the theme, single-key shortcuts and the sidebar, all kept in this browser. */
export default function AppearanceSettingsPage() {
  return (
    <>
      <SectionBar title="Appearance" context="How Mytheus looks and responds in this browser." />
      <AppearancePanel />
    </>
  );
}
