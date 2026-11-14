import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgProvider } from "@/lib/org-context";
import { checkOpsGate } from "@/lib/api/admin-ops";
import { myClerkFullName, resolveOrgContext } from "@/lib/api/org-context";
import { AppShell } from "@/components/app/AppShell";
import { LiveInterruptions } from "@/components/listening/LiveInterruptions";
import { TimeZoneSync } from "@/components/app/TimeZoneSync";
import { SupportSessionBanner } from "@/components/app/SupportSessionBanner";
import { TimeZonePrompt } from "@/components/app/TimeZonePrompt";
import type { SidebarAgent } from "@/components/app/Sidebar";
import { fetchMyProfile, syncDisplayName } from "@/lib/api/profile";
import { agentDisplayName, agentSeed } from "@/lib/api/profile-types";
import "@/styles/app-theme.css";

export const metadata: Metadata = {
  title: "Mytheus | App",
};

/**
 * The authenticated shell, and the ONLY place org context is resolved.
 *
 * Auth is now wired: `src/middleware.ts` gates every route under `(app)` and `(admin)`, and
 * the context comes from the verified Clerk session rather than `mockOrgContext`. This closes
 * the `TODO(auth)` that stood here.
 *
 * The `redirect` is belt and braces with the middleware, not a duplicate of it. A layout that
 * assumed a session and dereferenced a null context would render a broken shell if the
 * matcher ever stopped covering a path; this turns that into a redirect.
 *
 * `org_id` is not resolved here and never reaches the browser. `api-gateway` derives it from
 * the JWT on every request; the client's job is to send the token and nothing else.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The agent rides along with the org context: one more gateway read, on the docker network.
  // A failed read leaves the sidebar's Myte tab generic rather than failing the shell.
  const [orgContext, profile] = await Promise.all([resolveOrgContext(), fetchMyProfile()]);
  if (!orgContext) {
    // A superadmin has no workspace and sees only the ops console (ADR-0046 D1).
    if ((await checkOpsGate()) === "staff") redirect("/ops");
    redirect("/sign-in");
  }

  // Backfill the name Mytheus stores (briefings, "{first name}'s Myte") from Clerk when the two
  // differ. Not awaited and never throws: the shell renders without waiting on it.
  void myClerkFullName()
    .then((fullName) => syncDisplayName(profile, fullName))
    .catch(() => {});

  const agent: SidebarAgent | null = profile
    ? {
        name: agentDisplayName(profile.agent_name, orgContext.user.name),
        seed: agentSeed(profile.agent_avatar_seed, profile.id),
        personality: profile.agent_personality,
      }
    : null;

  return (
    <OrgProvider value={orgContext}>
      <AppShell agent={agent}>
        {/* A staff support session says so on every page (ADR-0046). */}
        <SupportSessionBanner />
        {/* In every meeting at once: your Myte's live interruptions, on every app page. */}
        <LiveInterruptions />
        <TimeZoneSync />
        {/* Until a member saves a time zone, a dismissible nudge to do it (each sign-in). */}
        <TimeZonePrompt />
        {children}
      </AppShell>
    </OrgProvider>
  );
}
