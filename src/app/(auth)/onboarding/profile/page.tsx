import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AboutYouStep } from "@/components/onboarding/AboutYouStep";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";
import { defaultDoodleSeed } from "@/lib/doodle";
import { orgProfileNeedsSetup } from "@/lib/api/org-brain";

export const metadata: Metadata = { title: "About you | Mytheus" };

/**
 * Onboarding step 1 of 2 (ADR-0038 D11), after the workspace is chosen. `/onboarding(.*)` is
 * public in the middleware (the workspace step must be reachable while a session is pending), so
 * this page checks the session itself. `?from=workspace` is set by the workspace step: someone
 * who already told their Myte their role (a returning member picking a workspace again) goes
 * straight on to the app instead of being asked twice. The dashboard prompt links here without
 * it, so the form always opens from there.
 */
export default async function Page({ searchParams }: { searchParams: { from?: string } }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding/organization");

  const [ctx, profile] = await Promise.all([resolveOrgContext(), fetchMyProfile()]);
  if (searchParams.from === "workspace" && profile?.role)
    redirect(ctx?.user.role === "admin" && (await orgProfileNeedsSetup()) ? "/onboarding/workspace" : "/dashboard");

  return (
    <AboutYouStep
      initial={profile}
      email={ctx?.user.email ?? ""}
      youSeed={ctx?.user.avatarSeed ?? defaultDoodleSeed(ctx?.user.email || userId)}
    />
  );
}
