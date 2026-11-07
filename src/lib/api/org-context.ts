/**
 * Resolves `OrgContextValue` from the Clerk session, replacing `mockOrgContext`.
 *
 * This is the "swap the provider value for a real Clerk session lookup once auth lands;
 * nothing downstream should need to change" note in `src/lib/org-context.tsx`, honoured: the
 * shape is identical, so every consumer of `useOrgContext()` keeps working untouched.
 *
 * Two fields cannot be filled honestly yet, and are handled rather than faked:
 *
 * - `org.plan` needs `subscriptions`, which is the billing band. It reports `"starter"`, the
 *   least-privileged value, so a UI that gates a feature on plan hides it rather than
 *   offering something the tenant has not paid for.
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
import type { OrgContextValue } from "@/lib/mock/data";

/**
 * The display name and email for one user, from Clerk's Backend API.
 *
 * Remembered per user for five minutes. Without it every page render made a network round trip
 * to Clerk just to show a name, which was a visible part of the delay when switching screens.
 * Keyed by the verified `userId`, so one user can never be served another's profile; a profile
 * edit shows up within five minutes.
 */
function profileFor(userId: string): Promise<{ name: string; email: string }> {
  return unstable_cache(
    async () => {
      const user = await (await clerkClient()).users.getUser(userId);
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      return { name: user.fullName?.trim() || email.split("@")[0] || "Member", email };
    },
    ["clerk-profile", userId],
    { revalidate: 300 },
  )();
}

/** Once per request: the layout and a page that both ask share the one lookup. */
export const resolveOrgContext = cache(async (): Promise<OrgContextValue | null> => {
  const { orgId, orgSlug, userId } = await auth();
  if (!userId) return null; // signed out; middleware should already have redirected

  const { name, email } = await profileFor(userId);

  return {
    org: {
      // Clerk's opaque org id, for display only. A personal account has no organization; the
      // gateway rejects its token, so the shell shows a name rather than crashing first.
      id: orgId ?? "",
      name: orgSlug ?? "Your workspace",
      plan: "starter",
    },
    user: {
      id: userId,
      name,
      email,
      role: "member",
    },
  };
});
