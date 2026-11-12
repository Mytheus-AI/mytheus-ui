import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { MeetAgentStep } from "@/components/onboarding/MeetAgentStep";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";
import { agentSeed } from "@/lib/api/profile-types";
import { orgProfileNeedsSetup } from "@/lib/api/org-brain";

export const metadata: Metadata = { title: "Meet your Myte | Mytheus" };

/**
 * Onboarding step 2 of 2 (ADR-0038 D11). Checks the session itself, like step 1. When the
 * profile cannot be loaded the form still opens on the defaults (keyed by the Clerk user id
 * until the `users` row is readable); saving then reports the problem and offers the way on.
 *
 * After it, an owner or admin whose workspace has no company profile yet goes on to the company
 * brain's first-run setup (ADR-0039 Part E); everyone else goes to the dashboard. A profile that
 * cannot be read counts as "not empty", so a gateway hiccup never sends anyone into setup.
 */
export default async function Page() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding/organization");

  const [ctx, profile] = await Promise.all([resolveOrgContext(), fetchMyProfile()]);
  const next = ctx?.user.role === "admin" && (await orgProfileNeedsSetup()) ? "/onboarding/workspace" : "/dashboard";

  return (
    <MeetAgentStep
      initial={profile}
      defaultSeed={agentSeed(null, profile?.id ?? userId)}
      personName={ctx?.user.name ?? ""}
      email={ctx?.user.email ?? ""}
      nextHref={next}
    />
  );
}
