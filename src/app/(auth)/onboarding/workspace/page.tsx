import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SetupFlow } from "@/components/org-brain/SetupFlow";
import { fetchGlossary, fetchGoals, fetchMemberOptions, fetchOrgProfile, fetchTopicOwners } from "@/lib/api/org-brain";
import { EMPTY_PROFILE, currentQuarter } from "@/lib/api/org-brain-types";
import { resolveOrgContext } from "@/lib/api/org-context";

export const metadata: Metadata = { title: "Set up the company brain | Mytheus" };

/**
 * The company brain's first-run setup (ADR-0039 Part E). `/onboarding(.*)` is public in the
 * middleware, so this page checks the session itself, like the other onboarding steps. Owners and
 * admins only; anyone else goes to the dashboard (the API refuses their writes anyway). The agent
 * step sends an admin here when the org profile is empty; the brain's overview links here too, so
 * it opens on whatever is already saved rather than assuming a blank brain.
 */
export default async function Page() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding/organization");

  const ctx = await resolveOrgContext();
  if (ctx?.user.role !== "admin") redirect("/dashboard");

  const [profile, glossary, owners, goals, members] = await Promise.all([
    fetchOrgProfile(),
    fetchGlossary(),
    fetchTopicOwners(),
    fetchGoals(),
    fetchMemberOptions(),
  ]);

  return (
    <SetupFlow
      orgName={ctx.org.name || "your workspace"}
      email={ctx.user.email}
      initialProfile={profile.ok ? profile.data : EMPTY_PROFILE}
      initialTerms={glossary.ok ? glossary.data : []}
      initialOwners={owners.ok ? owners.data : []}
      initialGoals={goals.ok ? goals.data : []}
      members={members ?? []}
      defaultPeriod={currentQuarter(new Date())}
    />
  );
}
