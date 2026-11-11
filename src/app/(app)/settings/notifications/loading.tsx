import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* The Notifications panel while it loads: alerts from your agent, the weekly digest and promise
   nudges, as NotificationPreferencesForm, WeeklyDigestForm and PromiseNudgesCard draw them. */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading your notification settings"
      bar={{ title: "w-36", context: ["w-[560px]"] }}
      cards={[
        { title: "w-48", description: ["w-56"], rows: ["inline", "inline", "choices"] },
        { title: "w-32", rows: ["inline", "inline"] },
        { title: "w-36", description: ["w-[85%]"], rows: ["info", "inline"] },
      ]}
    />
  );
}
