/**
 * The caller's own profile on `identity-tenant-service` (ADR-0038 D3): their working profile
 * (`role`, `skills` shown as focus areas, `bio` shown as "what you work on", `listen_for`,
 * `ignore_topics`) and their Myte's persona (`agent_name`, `agent_avatar_seed`,
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
import { api, apiSafe } from "@/lib/api/client";
import type { components as IdentitySchemas } from "@/lib/api/generated/identity-tenant-service";
import { fullNameFrom, needsNameSync, normalizeProfile, type UserProfile } from "@/lib/api/profile-types";

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
/** Once per request: the app layout (the sidebar's Myte tab) and a page can both ask. */
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

/* Names already sent by this server process, so a sync that keeps failing (an older backend
   that refuses the field, say) is tried once per name, not on every render. Bounded so a
   long-running process cannot grow it without limit. */
const nameSyncsTried = new Set<string>();

/**
 * Backfill `users.display_name` from Clerk: when the person's Clerk name differs from the one
 * Mytheus stores, PATCH it, once. This is how everyone who signed up before the backend stored
 * names (or whose webhook was missed) gets greeted by name.
 *
 * Fire and forget, on purpose: it returns at once and never throws, so the app layout calls it
 * without awaiting and the page never waits on it. The self-hosted Node server keeps running the
 * request after the response is sent, and `api()` captured the session token before its first
 * network await. No revalidation here: revalidating during a render is not allowed, and the next
 * render reads the stored name anyway.
 */
export function syncDisplayName(profile: UserProfile | null, clerkFullName: string): void {
  try {
    if (!profile || !needsNameSync(clerkFullName, profile.display_name)) return;
    const name = fullNameFrom(clerkFullName, null);
    const key = `${profile.id}:${name}`;
    if (nameSyncsTried.has(key)) return;
    if (nameSyncsTried.size > 5000) nameSyncsTried.clear();
    nameSyncsTried.add(key);
    void api(`/users/${profile.id}`, { method: "PATCH", body: { display_name: name } }).catch(() => {
      // Cosmetic and retried by the next process; the stored name stays as it was.
    });
  } catch {
    // Never let a name sync reach the shell.
  }
}
