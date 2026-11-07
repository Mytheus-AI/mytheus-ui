import type { Metadata } from "next";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";

export const metadata: Metadata = { title: "Integrations | Mytheus" };

export default function IntegrationsSettingsPage() {
  return (
    <SettingsShell
      title="Integrations"
      description="Calendar, Slack and one project tracker. Agents use them to prepare for meetings and route what you confirm."
    >
      <IntegrationsPanel />
    </SettingsShell>
  );
}
