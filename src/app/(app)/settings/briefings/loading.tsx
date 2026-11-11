import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* The Briefings panel while it loads: BriefingSettingsPanel's three cards (when, length and
   language, voice). */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading your briefing settings"
      bar={{ title: "w-28", context: ["w-[580px]", "w-[120px]"] }}
      wrapClass="flex flex-col gap-5"
      cards={[
        { title: "w-48", description: ["w-[90%]", "w-[50%]"], rows: ["inline", "inline"] },
        { title: "w-40", rows: ["field", "field"] },
        { title: "w-16", description: ["w-[70%]"], rows: ["choices"] },
      ]}
    />
  );
}
