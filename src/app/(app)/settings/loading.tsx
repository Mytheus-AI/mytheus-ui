import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* Inside the Settings layout (its title and section list stay put): a panel's skeleton, for a
   Settings route without one of its own. Each panel has its own loading.tsx in its own shape. */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading settings"
      bar={{}}
      cards={[
        { rows: ["inline", "inline"] },
        { rows: ["field", "field"] },
      ]}
    />
  );
}
