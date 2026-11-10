import { Suspense } from "react";
import { LinkButton } from "@/components/ui/Button";
import { Doodle } from "@/components/ui/Doodle";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";
import { agentDisplayName, agentSeed } from "@/lib/api/profile-types";
import { cardClass } from "./parts";

/* "Tell your agent what you do" (ADR-0038 D11). PersonalListener skips anyone with no role, so a
   person who never finished "About you" gets no notes. This quiet card says so and opens that
   step. It streams in on its own (Suspense, no fallback) so the profile read never holds up the
   dashboard, and it stays away when the profile cannot be read: unknown is not the same as
   missing, and a nag on a gateway hiccup would be wrong. */

export function AgentProfilePrompt() {
  return (
    <Suspense fallback={null}>
      <Prompt />
    </Suspense>
  );
}

async function Prompt() {
  const [profile, ctx] = await Promise.all([fetchMyProfile(), resolveOrgContext()]);
  if (!profile || profile.role) return null;
  const name = agentDisplayName(profile.agent_name, ctx?.user.name ?? "");

  return (
    <section
      aria-labelledby="agent-profile-prompt"
      className={`${cardClass} mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 px-[18px] py-4 sm:px-[22px]`}
    >
      <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-full ring-[3px] ring-surface" aria-hidden="true">
        <Doodle seed={agentSeed(profile.agent_avatar_seed, profile.id)} className="block h-full w-full" />
      </span>
      <div className="min-w-0 flex-[1_1_16rem]">
        <h2 id="agent-profile-prompt" className="text-[16px] font-semibold leading-snug text-ink">
          Tell your agent what you do
        </h2>
        <p className="mt-0.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-3">
          {name} takes no notes for you until it knows your role. It takes about a minute.
        </p>
      </div>
      <LinkButton href="/onboarding/profile" variant="outline" className="w-full shrink-0 sm:w-auto">
        Add your role
      </LinkButton>
    </section>
  );
}
