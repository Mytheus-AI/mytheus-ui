import { auth, clerkClient } from "@clerk/nextjs/server";
import { apiSafe } from "./client";
import type { AgentPersonality, MemberAgentFields } from "./meeting-agenda-types";

/* Workspace members for the members list and the invite pickers. SERVER-ONLY (it uses the
   session and Clerk's backend client).

   The tenant's member list comes from identity-tenant-service (`GET /users`): internal user ids,
   the only ids a meeting invite accepts, plus each person's access tier. Names live in Clerk,
   not in our `users` table, so they are joined on `clerk_user_id` here; a person Clerk cannot
   name falls back to their email. */

export type MemberTier = "owner" | "admin" | "member";

export type WorkspaceMemberView = {
  /** Internal user id (`users.id`): what `participant_ids` / `user_ids` take. */
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  tier: MemberTier | null;
  /** The signed-in user. */
  isYou: boolean;
  /** Their agent's chosen name, or null for "{first name}'s agent" (ADR-0038 D2, D3). */
  agentName: string | null;
  /** Their agent's doodle seed, or null for the default derived from `id`. */
  agentSeed: string | null;
};

type ApiMember = {
  id: string;
  clerk_user_id: string | null;
  email: string;
  avatar_url: string | null;
  role: string | null;
  tier: string | null;
} & MemberAgentFields;

function asTier(t: string | null): MemberTier | null {
  return t === "owner" || t === "admin" || t === "member" ? t : null;
}

/** Everyone in the caller's workspace, the caller first. `null` when it cannot be loaded. */
export async function listMembers(): Promise<WorkspaceMemberView[] | null> {
  const res = await apiSafe<{ items: ApiMember[] }>("/users");
  if (!res.ok) return null;
  const { userId } = await auth();

  const clerkIds = res.data.items.map((m) => m.clerk_user_id).filter((id): id is string => !!id);
  const names = new Map<string, { name: string; imageUrl: string | null }>();
  if (clerkIds.length > 0) {
    try {
      const { data } = await (await clerkClient()).users.getUserList({
        userId: clerkIds,
        limit: Math.min(clerkIds.length, 500),
      });
      for (const u of data) {
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
        names.set(u.id, { name, imageUrl: u.imageUrl ?? null });
      }
    } catch {
      // Names are cosmetic. Without Clerk the list still works, labelled by email.
    }
  }

  const members = res.data.items.map((m) => {
    const fromClerk = m.clerk_user_id ? names.get(m.clerk_user_id) : undefined;
    return {
      id: m.id,
      name: fromClerk?.name || m.email.split("@")[0] || m.email,
      email: m.email,
      imageUrl: fromClerk?.imageUrl ?? m.avatar_url,
      tier: asTier(m.tier),
      isYou: !!userId && m.clerk_user_id === userId,
      agentName: m.agent_name?.trim() || null,
      agentSeed: m.agent_avatar_seed || null,
    };
  });
  return members.sort((a, b) => Number(b.isYou) - Number(a.isYou) || a.name.localeCompare(b.name));
}

/**
 * The caller's own agent personality preset (ADR-0038 D2, `GET /users/me`), for the room's
 * sidebar head. Null when it cannot be read: the room then shows the name and face only.
 * The member list carries the agent's name and face but not the preset (D3).
 */
export async function fetchMyAgentPersonality(): Promise<AgentPersonality | null> {
  const res = await apiSafe<{ agent_personality?: string | null }>("/users/me");
  if (!res.ok) return null;
  const p = res.data.agent_personality;
  return p === "balanced" || p === "concise" || p === "detailed" || p === "direct" || p === "friendly" ? p : null;
}
