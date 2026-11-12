import { OrgProvider } from "../../src/lib/org-context";
import { AgentWorkspace } from "../../src/components/agent/AgentWorkspace";
import { AgentPanel } from "../../src/components/settings/AgentPanel";
import type { UserProfile } from "../../src/lib/api/profile-types";

/* The agent page (portrait, then the form with the face picker) and Settings > Agent (the form
   with its live preview card beside it), as the app renders them. The save action is
   stubs/actions.ts. */

const NOW = "2026-11-11T09:00:00.000Z";
export const AGENT_PROFILE: UserProfile = {
  id: "u-samar",
  email: "samar@example.com",
  avatar_url: null,
  role: "Product lead",
  skills: ["Pricing"],
  bio: null,
  listen_for: ["Launch plan"],
  ignore_topics: [],
  agent_name: "Juniper",
  agent_avatar_seed: "agentseedjuniper",
  agent_personality: "friendly",
  agent_instructions: "Always note numbers and dates.",
  created_at: NOW,
  updated_at: NOW,
};

export function AgentHarness({ theme = "light", view = "page" }: { theme?: "light" | "dark"; view?: "page" | "settings" }) {
  return (
    <OrgProvider value={{ org: { id: "org-1", name: "Acme" }, user: { id: "u-samar", name: "Samar Rihan", email: "samar@example.com", role: "member" } }}>
      <div className="mx-app min-h-dvh bg-bg p-4 text-ink sm:p-8" data-theme={theme}>
        <main className="mx-auto max-w-[1100px]">
          {view === "page" ? (
            <AgentWorkspace profile={AGENT_PROFILE} personName="Samar Rihan" aside={<div className="rounded-card border border-line bg-surface p-5 text-ink-2">What it listens for</div>} />
          ) : (
            <AgentPanel profile={AGENT_PROFILE} />
          )}
        </main>
      </div>
    </OrgProvider>
  );
}
