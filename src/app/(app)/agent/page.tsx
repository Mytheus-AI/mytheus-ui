import type { Metadata } from "next";
import { apiSafe } from "@/lib/api/client";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";
import { agentDisplayName, agentSeed } from "@/lib/api/profile-types";
import type { DashboardResponse } from "@/lib/api/types";
import { AgentPortrait } from "@/components/agent/AgentPortrait";
import { ListeningCard } from "@/components/agent/ListeningCard";
import { KeptNotes } from "@/components/agent/KeptNotes";
import { AgentPanel } from "@/components/settings/AgentPanel";

export const metadata: Metadata = { title: "Your agent | Mytheus" };

/**
 * Your agent's own page (ADR-0038 D2, D11): who it is, what it listens for, what it kept for you
 * lately, and the form that changes its name, face and voice. Reads `GET /users/me` (shared with
 * the app layout through `fetchMyProfile`'s per-request cache) and the `worklogs` arm of
 * `GET /bff/dashboard`. Each panel degrades on its own: a failed read never blanks the page.
 */
export default async function AgentPage() {
  const [orgContext, profile, dashboard] = await Promise.all([
    resolveOrgContext(),
    fetchMyProfile(),
    apiSafe<DashboardResponse>("/bff/dashboard"),
  ]);

  const personName = orgContext?.user.name ?? "";
  const firstName = personName.trim().split(/\s+/)[0] || "you";
  const worklogs = dashboard.ok ? dashboard.data.worklogs : null;
  const notes = worklogs && worklogs.status !== "degraded" ? worklogs.items.slice(0, 5) : null;

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      {profile ? (
        <AgentPortrait
          name={agentDisplayName(profile.agent_name, personName)}
          seed={agentSeed(profile.agent_avatar_seed, profile.id)}
          personality={profile.agent_personality}
          ownerFirstName={firstName}
          instructions={profile.agent_instructions}
        />
      ) : (
        <section className="rounded-hero bg-bg-2 px-6 py-8">
          <p className="text-[13px] font-semibold text-signal-ink">Your agent</p>
          <h1 className="display mt-1 text-[clamp(2rem,4.5vw,2.8rem)] text-ink">Your agent</h1>
          <p className="mt-2 text-[15px] text-ink-3">Its details could not be loaded right now. Try again in a moment.</p>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ListeningCard profile={profile} />
        <KeptNotes notes={notes} />
      </div>

      <section aria-labelledby="make-h" className="pt-2">
        <h2 id="make-h" className="display text-[clamp(1.6rem,3vw,2rem)] text-ink">
          Make it yours
        </h2>
        <p className="mt-1 max-w-[60ch] text-[15px] text-ink-3">
          Its name, its face and how it words your notes. What it captures and who sees it never change. Only you can edit these.
        </p>
        <div className="mt-5">
          <AgentPanel profile={profile} />
        </div>
      </section>
    </div>
  );
}
