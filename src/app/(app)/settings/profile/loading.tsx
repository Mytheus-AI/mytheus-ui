import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* The Profile panel while it loads, in ProfilePanel's shape: your account, your doodle, and what
   your agent knows about you (its fields and Save). */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading your profile"
      bar={{ title: "w-24", context: ["w-[440px]"] }}
      cards={[
        { title: "w-32", rows: ["inline"] },
        { title: "w-28", rows: ["choices"] },
        { title: "w-64", description: ["w-[85%]", "w-[40%]"], rows: ["field", "field", "field", "field"], save: "Save" },
      ]}
    />
  );
}
