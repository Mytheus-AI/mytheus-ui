import type { Metadata } from "next";
import { apiSafe } from "@/lib/api/client";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";
import type { DashboardResponse } from "@/lib/api/types";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";
import { ListeningCard } from "@/components/agent/ListeningCard";
import { KeptNotes } from "@/components/agent/KeptNotes";
import { TopicWatchCard } from "@/components/watch/TopicWatchCard";
import { Page, PageHead } from "@/components/ui/Page";
import { ErrorState } from "@/components/ui/ErrorState";

export const metadata: Metadata = { title: "Your agent | Mytheus" };

/**
 * Your agent's own page (ADR-0038 D2, D11): who it is (a live portrait that follows the form),
 * what it listens for, what it kept for you lately, and the form that changes its name, face and
 * voice. Reads `GET /users/me` (shared with the app layout through `fetchMyProfile`'s
 * per-request cache) and the `worklogs` arm of `GET /bff/dashboard`. Each panel degrades on its
 * own: a failed read never blanks the page.
 */
export default async function AgentPage() {
  const [orgContext, profile, dashboard] = await Promise.all([
    resolveOrgContext(),
    fetchMyProfile(),
    apiSafe<DashboardResponse>("/bff/dashboard"),
  ]);

  const personName = orgContext?.user.name ?? "";
  const worklogs = dashboard.ok ? dashboard.data.worklogs : null;
  const notes = worklogs && worklogs.status !== "degraded" ? worklogs.items.slice(0, 5) : null;

  const aside = (
    <>
      <ListeningCard profile={profile} />
      <TopicWatchCard />
      <KeptNotes notes={notes} />
    </>
  );

  return (
    <Page className="pt-2">
      {profile ? (
        <AgentWorkspace profile={profile} personName={personName} aside={aside} />
      ) : (
        <div className="space-y-5">
          <PageHead title="Your agent" />
          <ErrorState title="Your agent's details could not be loaded" text="Its notes and settings are safe. Try again in a moment." />
          <div className="grid items-start gap-5 lg:grid-cols-2">{aside}</div>
        </div>
      )}
    </Page>
  );
}
