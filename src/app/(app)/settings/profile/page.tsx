import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { fetchMyProfile } from "@/lib/api/profile";
import { resolveOrgContext } from "@/lib/api/org-context";
import { OrgLogoCard } from "@/components/tenant/OrgLogoCard";

export const metadata: Metadata = { title: "Profile | Mytheus" };

/* Settings > Profile: your account, your doodle, and what your Myte knows about you. How alerts
   reach you moved to Settings > Notifications. A member also sees the workspace they are in, with
   its logo, read-only (admins change it in the Workspace console). */
export default async function ProfileSettingsPage() {
  const [profile, ctx] = await Promise.all([fetchMyProfile(), resolveOrgContext()]);
  return (
    <>
      <SectionBar title="Profile" context="How you appear to teammates, and what your Myte knows about you." />
      <div className="grid gap-5">
        <ProfilePanel profile={profile} />
        {ctx && ctx.user.role !== "admin" ? <OrgLogoCard canEdit={false} /> : null}
      </div>
    </>
  );
}
