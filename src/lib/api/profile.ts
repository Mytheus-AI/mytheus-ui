/**
 * The caller's own profile on `identity-tenant-service` (ADR-0038 D3): their working profile
 * (`role`, `skills` shown as focus areas, `bio` shown as "what you work on", `listen_for`,
 * `ignore_topics`) and their agent's persona (`agent_name`, `agent_avatar_seed`,
 * `agent_personality`, `agent_instructions`). Read with `GET /users/me`, written with
 * `PATCH /users/{user_id}` by the server actions in `app/actions/profile.ts`.
 *
 * The caller is the verified session; nothing about the user or tenant comes from the browser.
 * Until every gateway serves `GET /users/me`, a 404 or 405 there falls back to finding the
 * caller in `GET /users` by their Clerk user id.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { apiSafe } from "@/lib/api/client";
import type { components as IdentitySchemas } from "@/lib/api/generated/identity-tenant-service";
import { normalizeProfile, type UserProfile } from "@/lib/api/profile-types";

type MemberList = IdentitySchemas["schemas"]["MemberList"];
type UserContext = IdentitySchemas["schemas"]["UserContext"];

/** The caller's `users.id` from `GET /users`, or null when the gateway or the row is unavailable. */
export async function myUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const res = await apiSafe<MemberList>("/users");
  if (!res.ok) return null;
  return res.data.items.find((m) => m.clerk_user_id === userId)?.id ?? null;
}

/**
 * The caller's full profile, or null when it cannot be loaded (gateway down, or the user row not
 * created yet right after sign-up).
 */
/** Once per request: the app layout (the sidebar's agent tab) and a page can both ask. */
export const fetchMyProfile = cache(async function fetchMyProfile(): Promise<UserProfile | null> {
  const me = await apiSafe<Partial<UserProfile> & { id: string }>("/users/me");
  if (me.ok) return normalizeProfile(me.data);
  if (me.error.status !== 404 && me.error.status !== 405) return null;

  // Older gateway: no `/users/me` yet. Role and focus areas are still readable from the context.
  const id = await myUserId();
  if (!id) return null;
  const ctx = await apiSafe<UserContext>(`/context/${id}`);
  if (!ctx.ok) return null;
  return normalizeProfile({ id, role: ctx.data.role, skills: ctx.data.skills });
});
