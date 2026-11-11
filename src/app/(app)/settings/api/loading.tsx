import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* API access while it loads: personal access tokens, connected apps and "Use Mytheus from other
   tools", as ApiTokensPanel, ConnectedAppsPanel and ConnectToolsPanel draw them. */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading API access"
      bar={{ title: "w-28", context: ["w-[580px]", "w-[200px]"], narrow: ["w-[40%]"] }}
      cards={[
        { title: "w-48", description: ["w-[80%]"], rows: ["text"] },
        { title: "w-36", description: ["w-[70%]"], rows: ["text"] },
        { title: "w-56", description: ["w-[80%]"], rows: ["field", "field"] },
      ]}
    />
  );
}
