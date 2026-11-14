import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { fetchMyProfile } from "@/lib/api/profile";
import { resolveOrgContext } from "@/lib/api/org-context";
import { OrgLogoCard } from "@/components/tenant/OrgLogoCard";
import { LocationCard } from "@/components/settings/LocationCard";
import { locationState } from "@/app/actions/location";

export const metadata: Metadata = { title: "Profile | Mytheus" };

/* Settings > Profile: your account, your doodle, and what your Myte knows about you. How alerts
   reach you moved to Settings > Notifications. Everyone also sees the workspace they are in, with
   its logo: an admin can upload, crop, replace or remove it here as in the Workspace console
   (the same card), and a member sees it read-only. */
export default async function ProfileSettingsPage() {
  const [profile, ctx, location] = await Promise.all([fetchMyProfile(), resolveOrgContext(), locationState(null)]);
  return (
    <>
      <SectionBar title="Profile" context="How you appear to teammates, and what your Myte knows about you." />
      <div className="grid gap-5">
        <ProfilePanel profile={profile} />
        {location ? <LocationCard countries={location.countries} country={location.country} subdivision={location.subdivision} /> : null}
        {ctx ? <OrgLogoCard canEdit={ctx.user.role === "admin"} /> : null}
      </div>
    </>
  );
}
