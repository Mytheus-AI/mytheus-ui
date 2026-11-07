import type { Metadata } from "next";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { ProfilePanel } from "@/components/settings/ProfilePanel";

export const metadata: Metadata = { title: "Profile | Mytheus" };

export default function ProfileSettingsPage() {
  return (
    <SettingsShell title="Profile" description="How you appear to teammates, and what your agent knows about you.">
      <ProfilePanel />
    </SettingsShell>
  );
}
