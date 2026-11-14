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
import { AskBox } from "@/components/ask-myte/AskBox";
import { agentDisplayName, agentSeed } from "@/lib/api/profile-types";
import { readMemories, readRoutines } from "@/lib/ask-myte/server";
import { MyteMemoryCard } from "@/components/agent/MyteMemoryCard";
import { MyteRoutinesCard } from "@/components/agent/MyteRoutinesCard";

export const metadata: Metadata = { title: "Your Myte | Mytheus" };

/**
 * Your agent's own page (ADR-0038 D2, D11): who it is (a live portrait that follows the form),
 * what it listens for, what it kept for you lately, and the form that changes its name, face and
 * voice. Reads `GET /users/me` (shared with the app layout through `fetchMyProfile`'s
 * per-request cache) and the `worklogs` arm of `GET /bff/dashboard`. Each panel degrades on its
 * own: a failed read never blanks the page.
 */
export default async function AgentPage() {
  const [orgContext, profile, dashboard, memories, routines] = await Promise.all([
    resolveOrgContext(),
    fetchMyProfile(),
    apiSafe<DashboardResponse>("/bff/dashboard"),
    readMemories(),
    readRoutines(),
  ]);

  const personName = orgContext?.user.name ?? "";
  const worklogs = dashboard.ok ? dashboard.data.worklogs : null;
  const notes = worklogs && worklogs.status !== "degraded" ? worklogs.items.slice(0, 5) : null;

  const askName = agentDisplayName(profile?.agent_name ?? null, personName);
  // ADR-0049 F4 and F5: what it remembers and the questions it asks on a schedule.
  const aside = (
    <>
      <MyteMemoryCard initial={memories} name={askName} />
      <MyteRoutinesCard initial={routines} name={askName} />
      <ListeningCard profile={profile} />
      <TopicWatchCard />
      <KeptNotes notes={notes} />
    </>
  );

  // Ask Myte (ADR-0047 D1): a large ask box at the top; sending opens /ask with it already asked.
  const ask = (
    <section aria-label={`Ask ${askName}`} className="mb-6">
      <AskBox
        size="lg"
        name={askName}
        seed={profile ? agentSeed(profile.agent_avatar_seed, profile.id) : null}
        placeholder="Ask me anything about your work..."
        openButton
      />
    </section>
  );

  return (
    <Page className="pt-2">
      {ask}
      {profile ? (
        <AgentWorkspace profile={profile} personName={personName} aside={aside} />
      ) : (
        <div className="space-y-5">
          <PageHead title="Your Myte" />
          <ErrorState title="Your Myte's details could not be loaded" text="Its notes and settings are safe. Try again in a moment." />
          <div className="grid items-start gap-5 lg:grid-cols-2">{aside}</div>
        </div>
      )}
    </Page>
  );
}
