import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { fetchMyProfile } from "@/lib/api/profile";
import { LocationCard } from "@/components/settings/LocationCard";
import { locationState } from "@/app/actions/location";

export const metadata: Metadata = { title: "Profile | Mytheus" };

/* Settings > Profile: your account, your doodle, and what your Myte knows about you. How alerts
   reach you moved to Settings > Notifications. The workspace logo is managed in the Workspace
   console only. */
export default async function ProfileSettingsPage() {
  const [profile, location] = await Promise.all([fetchMyProfile(), locationState(null)]);
  return (
    <>
      <SectionBar title="Profile" context="How you appear to teammates, and what your Myte knows about you." />
      <div className="grid gap-5">
        <ProfilePanel profile={profile} />
        {location ? <LocationCard countries={location.countries} country={location.country} subdivision={location.subdivision} /> : null}
      </div>
    </>
  );
}
