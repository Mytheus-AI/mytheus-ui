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

import { auth, currentUser } from "@clerk/nextjs/server";
import type { OrgContextValue } from "@/lib/mock/data";

export async function resolveOrgContext(): Promise<OrgContextValue | null> {
  const { orgId, orgSlug, userId } = await auth();
  if (!userId) return null; // signed out; middleware should already have redirected

  const user = await currentUser();
  const name =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Member";

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
      email: user?.primaryEmailAddress?.emailAddress ?? "",
      role: "member",
    },
  };
}
