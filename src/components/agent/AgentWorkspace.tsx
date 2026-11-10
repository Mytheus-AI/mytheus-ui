"use client";

import { useState, type ReactNode } from "react";
import { AgentPortrait } from "@/components/agent/AgentPortrait";
import { AgentPanel, type Persona } from "@/components/settings/AgentPanel";
import { agentDisplayName, agentSeed, type UserProfile } from "@/lib/api/profile-types";

/* The agent page's working area. One agent on screen: the portrait at the top IS the preview,
   redrawn as the form below it changes (name, face, voice, instructions), so the form's own
   preview card is hidden here. Wide screens get two columns: portrait and form on the left,
   what it listens for and what it kept in a sticky column on the right (`aside`, server-rendered
   by the page). Narrower screens stack them: portrait, the two cards, then the form. */

export function AgentWorkspace({
  profile,
  personName,
  aside,
}: {
  profile: UserProfile;
  personName: string;
  aside: ReactNode;
}) {
  const [persona, setPersona] = useState<Persona>({
    name: profile.agent_name ?? "",
    seed: agentSeed(profile.agent_avatar_seed, profile.id),
    personality: profile.agent_personality,
    instructions: profile.agent_instructions ?? "",
  });
  const firstName = personName.trim().split(/\s+/)[0] || "you";

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <AgentPortrait
          name={agentDisplayName(persona.name, personName)}
          seed={persona.seed}
          personality={persona.personality}
          ownerFirstName={firstName}
          instructions={persona.instructions.trim() || null}
        />
        <div className="space-y-5 xl:hidden">{aside}</div>
        <section aria-labelledby="make-h">
          <h2 id="make-h" className="display text-[22px] text-ink">
            Make it yours
          </h2>
          <p className="mt-1 max-w-[68ch] text-[15px] text-ink-3">
            Its name, its face and how it words your notes; the portrait above changes as you edit. What it captures and who sees it never change.
          </p>
          <div className="mt-4">
            <AgentPanel profile={profile} hidePreview onChange={setPersona} />
          </div>
        </section>
      </div>
      <aside aria-label="What your agent knows and kept" className="hidden space-y-5 xl:sticky xl:top-2 xl:block">
        {aside}
      </aside>
    </div>
  );
}
