import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { fetchMyProfile } from "@/lib/api/profile";

export const metadata: Metadata = { title: "Profile | Mytheus" };

/* Settings > Profile: your account, your doodle, and what your Myte knows about you. How alerts
   reach you moved to Settings > Notifications. */
export default async function ProfileSettingsPage() {
  const profile = await fetchMyProfile();
  return (
    <>
      <SectionBar title="Profile" context="How you appear to teammates, and what your Myte knows about you." />
      <div className="grid gap-5">
        <ProfilePanel profile={profile} />
      </div>
    </>
  );
}
