import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { MeetAgentStep } from "@/components/onboarding/MeetAgentStep";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";
import { agentSeed } from "@/lib/api/profile-types";

export const metadata: Metadata = { title: "Meet your agent | Mytheus" };

/**
 * Onboarding step 2 of 2 (ADR-0038 D11). Checks the session itself, like step 1. When the
 * profile cannot be loaded the form still opens on the defaults (keyed by the Clerk user id
 * until the `users` row is readable); saving then reports the problem and offers the way on.
 */
export default async function Page() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding/organization");

  const [ctx, profile] = await Promise.all([resolveOrgContext(), fetchMyProfile()]);

  return (
    <MeetAgentStep
      initial={profile}
      defaultSeed={agentSeed(null, profile?.id ?? userId)}
      personName={ctx?.user.name ?? ""}
      email={ctx?.user.email ?? ""}
    />
  );
}
