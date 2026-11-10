/**
 * The caller's agent profile: the domain role and focus areas (`users.role`, `users.skills`)
 * that `identity-tenant-service` serves through `get_user_context()` and that tune what their
 * PersonalListener captures. Read with `GET /context/{user_id}`, written with
 * `PATCH /users/{user_id}`.
 *
 * The caller's own `users.id` is found by matching their verified Clerk user id against
 * `GET /users`; nothing about the user or tenant comes from the browser. Only `role` and
 * `skills` leave this module: the context response also carries our `org_id`, which the client
 * never needs and never sees.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { auth } from "@clerk/nextjs/server";
import { apiSafe } from "@/lib/api/client";
import type { components as IdentitySchemas } from "@/lib/api/generated/identity-tenant-service";

type MemberList = IdentitySchemas["schemas"]["MemberList"];
type UserContext = IdentitySchemas["schemas"]["UserContext"];

export type AgentProfile = { role: string; skills: string[] };

/** The caller's `users.id`, or null when the gateway or the user row is unavailable. */
export async function myUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const res = await apiSafe<MemberList>("/users");
  if (!res.ok) return null;
  return res.data.items.find((m) => m.clerk_user_id === userId)?.id ?? null;
}

/** The caller's role and focus areas, or null when they cannot be loaded. */
export async function fetchMyAgentProfile(): Promise<AgentProfile | null> {
  const id = await myUserId();
  if (!id) return null;
  const res = await apiSafe<UserContext>(`/context/${id}`);
  if (!res.ok) return null;
  return { role: res.data.role ?? "", skills: res.data.skills };
}
