import type { Metadata } from "next";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";
import { agentDisplayName } from "@/lib/api/profile-types";
import { agentSeedFor } from "@/lib/realtime/agent-persona";
import { loadStarters, readThread, readThreads } from "@/lib/ask-myte/server";
import type { AskScope, Thread } from "@/lib/ask-myte/types";
import { LIMITS } from "@/lib/ask-myte/types";
import { AskMytePage } from "@/components/ask-myte/AskMytePage";

export const metadata: Metadata = { title: "Ask Myte | Mytheus" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/**
 * Ask Myte (mytheus-docs ADR-0047 D1): one place to ask your own Myte anything about your work.
 *
 * - `?t=<id>` opens one of your threads (deep-linkable; someone else's id is a 404 from core-api
 *   and reads as "no longer in your history").
 * - `?q=<question>` asks it at once (Your Myte's ask box, the command palette, Home).
 * - `?meeting=<id>&title=<meeting title>` scopes the first question to a meeting (the meeting
 *   room's "Continue in Ask Myte").
 *
 * Everything here degrades on its own: no threads list still asks, no starters falls back to
 * plain questions, no profile still answers as "{first name}'s Myte".
 */
export default async function AskPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  // `?thread=` is the link core-api puts in a peer answer notification (ADR-0049 F1).
  const t = one(searchParams?.t) ?? one(searchParams?.thread);
  const q = one(searchParams?.q)?.trim().slice(0, LIMITS.question) || null;
  const meeting = one(searchParams?.meeting);
  const meetingTitle = one(searchParams?.title)?.slice(0, 200) ?? null;

  const [orgContext, profile, threads, thread, starters] = await Promise.all([
    resolveOrgContext(),
    fetchMyProfile(),
    readThreads(),
    t ? readThread(t) : Promise.resolve(null),
    loadStarters().catch(() => []),
  ]);

  const user = orgContext?.user;
  const personName = profile?.display_name || user?.name || "";
  const persona = {
    name: agentDisplayName(profile?.agent_name ?? null, personName),
    seed: agentSeedFor(profile?.agent_avatar_seed ?? null, profile?.id ?? user?.id ?? ""),
    personality: profile?.agent_personality ?? "balanced",
  };
  const initialThread: Thread | null = thread && thread.ok ? thread.thread : null;
  const initialScope: AskScope | null =
    meeting && UUID.test(meeting) ? { kind: "meeting", meeting_id: meeting, person_id: null, as_of: null, label: meetingTitle } : null;

  return (
    <AskMytePage
      persona={persona}
      viewer={{ name: user?.name ?? "You", email: user?.email ?? "", seed: user?.avatarSeed ?? null, image: user?.imageUrl ?? null }}
      firstName={(personName.split(/\s+/)[0] ?? "").trim()}
      isAdmin={user?.role === "admin"}
      initialThread={initialThread}
      initialThreads={threads}
      starters={starters}
      autoSend={initialThread ? null : q}
      initialScope={initialScope}
      goneThread={!!t && !initialThread}
    />
  );
}
