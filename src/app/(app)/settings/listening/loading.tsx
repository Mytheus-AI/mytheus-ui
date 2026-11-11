import { SettingsCardSkeleton, SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* The Listening panel while it loads: the interruptions and evening digest form (one stack), then
   your lines, as ListeningSettings and PositionsEditor draw them. */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading your listening settings"
      bar={{ title: "w-28", context: ["w-[520px]"], action: "Choose which meetings" }}
    >
      <div className="grid gap-5">
        <div className="grid gap-5">
          <SettingsCardSkeleton card={{ title: "w-28", description: ["w-[85%]"], rows: ["text", "inline", "field", "inline", "inline", "field"] }} />
          <SettingsCardSkeleton card={{ title: "w-32", description: ["w-[70%]"], rows: ["inline", "field"] }} />
        </div>
        <SettingsCardSkeleton card={{ title: "w-24", description: ["w-[85%]"], rows: ["text", "text"] }} />
      </div>
    </SettingsPanelSkeleton>
  );
}
