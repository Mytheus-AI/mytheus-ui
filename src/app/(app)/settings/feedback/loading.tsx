import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* Report a bug while it loads: the send card, then what you have sent. */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading your reports"
      bar={{ title: "w-32", context: ["w-80"], narrow: [] }}
      cards={[
        { title: "w-16", description: ["w-[70%]"], rows: ["choices"] },
        { title: "w-24", rows: ["inline"] },
        { title: "w-20", rows: ["inline"] },
      ]}
    />
  );
}
