import type { Metadata } from "next";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { NotificationPreferencesSection } from "@/components/settings/NotificationPreferencesSection";
import { fetchMyAgentProfile } from "@/lib/api/profile";

export const metadata: Metadata = { title: "Profile | Mytheus" };

export default async function ProfileSettingsPage() {
  const agent = await fetchMyAgentProfile();
  return (
    <SettingsShell title="Profile" description="How you appear to teammates, and what your agent knows about you.">
      <ProfilePanel agent={agent} />
      <NotificationPreferencesSection />
    </SettingsShell>
  );
}
