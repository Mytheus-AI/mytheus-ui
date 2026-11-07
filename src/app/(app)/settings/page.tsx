import type { Metadata } from "next";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { WorkspacePanel } from "@/components/settings/WorkspacePanel";

export const metadata: Metadata = { title: "Settings | Mytheus" };

export default function SettingsPage() {
  return (
    <SettingsShell title="Workspace" description="Your organization, how you are notified, and how your data is handled.">
      <WorkspacePanel />
    </SettingsShell>
  );
}
