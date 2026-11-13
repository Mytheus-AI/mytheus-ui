"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Headset } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

/* Shown for the whole of a staff support session (ADR-0046 D4). Clerk marks an impersonated
   session with an actor (the `act` claim), so this reads it from the session itself: whoever is
   at the screen can always see that this is Mytheus support acting as the member, never the
   member. The server separately refuses the session once it ends and tags every audit row it
   writes; this banner is the visible half of that. Signing out ends it in this window. */
export function SupportSessionBanner() {
  const { actor } = useAuth();
  const { signOut } = useClerk();
  if (!actor) return null;
  return (
    <div role="status" className="sticky top-0 z-40 border-b border-line bg-priority-medium-soft px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex min-w-0 items-center gap-2 text-[14px] text-ink">
          <Headset size={18} weight="fill" className="shrink-0 text-priority-medium" aria-hidden />
          <span>
            <span className="font-semibold">Mytheus support session.</span> A staff member is acting as this account. Everything done here is recorded
            in the workspace audit log.
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={() => void signOut({ redirectUrl: "/sign-in" })}>
          End session
        </Button>
      </div>
    </div>
  );
}
