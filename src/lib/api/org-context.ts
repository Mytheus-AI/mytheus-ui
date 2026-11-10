/**
 * Resolves `OrgContextValue` from the Clerk session, replacing `mockOrgContext`.
 *
 * This is the "swap the provider value for a real Clerk session lookup once auth lands;
 * nothing downstream should need to change" note in `src/lib/org-context.tsx`, honoured: the
 * shape is identical, so every consumer of `useOrgContext()` keeps working untouched.
 *
 * There is no plan in this value: the plan is the `subscriptions` row, which only
 * `GET /usage` (admin) reads, so screens that show it fetch it there instead of trusting a
 * session-wide default. One field is handled rather than faked:
 *
 * - `user.role` is a PERMISSION in this type, and permissions live in `rbac_grants`, which is
 *   only readable through the gateway. `"member"` is the safe default for the same reason:
 *   under-granting shows too little, over-granting shows another tenant's admin surface.
 *
 * `org.id` is deliberately NOT our `org_id`. It is Clerk's opaque organization id, used only
 * as a display key. The client never learns our tenant identifier and never needs to.
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { OrgContextValue } from "@/lib/types";
import { defaultDoodleSeed, isDoodleSeed } from "@/lib/doodle";

type Profile = { name: string; email: string; avatarSeed?: string; imageUrl?: string };

/** The cache tag for one user's profile, so a profile edit can drop it at once. */
export const profileTag = (userId: string) => `clerk-profile:${userId}`;

/**
 * The display name and email for one user, from Clerk's Backend API.
 *
 * Remembered per user for five minutes. Without it every page render made a network round trip
 * to Clerk just to show a name, which was a visible part of the delay when switching screens.
 * Keyed by the verified `userId`, so one user can never be served another's profile; a profile
 * edit shows up within five minutes.
 */
function profileFor(userId: string): Promise<Profile> {
  return unstable_cache(
    async (): Promise<Profile> => {
      const user = await (await clerkClient()).users.getUser(userId);
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      const seed = (user.unsafeMetadata as Record<string, unknown> | null)?.doodle;
      return {
        name: user.fullName?.trim() || email.split("@")[0] || "Member",
        email,
        // Everyone has a doodle. Until they choose one it is the default for their email, the
        // same face teammates see on their profile; DoodleImageSync then stores it for real.
        avatarSeed: isDoodleSeed(seed) ? seed : defaultDoodleSeed(email || userId),
        // Clerk always returns an imageUrl; without an uploaded image it is a generic default,
        // which a doodle beats.
        imageUrl: user.hasImage ? user.imageUrl : undefined,
      };
    },
    ["clerk-profile", userId],
    { revalidate: 300, tags: [profileTag(userId)] },
  )();
}

/** Once per request: the layout and a page that both ask share the one lookup. */
export const orgTag = (orgId: string) => `clerk-org:${orgId}`;

/**
 * The organization's display name. The session only carries its slug (e.g.
 * `salian-s-lovers-17941611...`, the name plus Clerk's numeric suffix), which is what the
 * sidebar used to show. Cached like the profile, keyed by the verified org id.
 */
function orgNameFor(orgId: string): Promise<string | null> {
  return unstable_cache(
    async () => {
      try {
        const org = await (await clerkClient()).organizations.getOrganization({ organizationId: orgId });
        return org.name || null;
      } catch {
        return null;
      }
    },
    ["clerk-org-name", orgId],
    { revalidate: 300, tags: [orgTag(orgId)] },
  )();
}

export const resolveOrgContext = cache(async (): Promise<OrgContextValue | null> => {
  const { orgId, orgSlug, orgRole, userId } = await auth();
  if (!userId) return null; // signed out; middleware should already have redirected

  const { name, email, avatarSeed, imageUrl } = await profileFor(userId);

  return {
    org: {
      // Clerk's opaque org id, for display only. A personal account has no organization; the
      // gateway rejects its token, so the shell shows a name rather than crashing first.
      id: orgId ?? "",
      name: (orgId ? await orgNameFor(orgId) : null) ?? orgSlug ?? "Your workspace",
    },
    user: {
      id: userId,
      name,
      email,
      avatarSeed,
      imageUrl,
      // Clerk's organization role, read from the verified session. It only decides what the
      // UI offers (the workspace-admin nav and console); the API enforces the RBAC tier itself.
      role: orgRole === "org:admin" ? "admin" : "member",
    },
  };
});
