import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* The Appearance panel while it loads: theme, keyboard and sidebar, as AppearancePanel draws them. */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading appearance"
      bar={{ title: "w-32", context: ["w-80"], narrow: [] }}
      cards={[
        { title: "w-16", description: ["w-[70%]"], rows: ["choices"] },
        { title: "w-24", rows: ["inline"] },
        { title: "w-20", rows: ["inline"] },
      ]}
    />
  );
}
