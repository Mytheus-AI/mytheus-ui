"use client";

import { toast } from "sonner";
import { checkAcceptedAction } from "@/app/actions/promises";
import type { CapacityCheck } from "@/lib/promises/ledger";

/* The capacity check right after an action is accepted in the app (a task confirmed from the
   Inbox or the dashboard): when it is yours, has a date and makes that day tight, your agent says
   so in one toast whose one button offers the better day (it opens the ledger's renegotiate sheet
   with that date, where one more tap asks the person who assigned it). Silent otherwise, and never
   in the way of the confirm it follows. */

function viewerZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function offerLink(actionId: string, check: CapacityCheck): string {
  const date = check.suggested_date ? `&date=${encodeURIComponent(check.suggested_date)}` : "";
  return `/work/promises?offer=action:${encodeURIComponent(actionId)}${date}`;
}

/** Returns the check that was shown (null when there was nothing to say). */
export async function warnAfterAccept(
  actionId: string,
  navigate: (href: string) => void = (href) => window.location.assign(href),
): Promise<CapacityCheck | null> {
  const res = await checkAcceptedAction(actionId, viewerZone());
  if (!res.ok || !res.check) return null;
  const check = res.check;
  toast.warning(check.message, {
    description: "Only you see this. Your agent can ask for the new date for you.",
    action: check.suggested_date
      ? { label: `Offer ${check.suggested_label}`, onClick: () => navigate(offerLink(actionId, check)) }
      : undefined,
    duration: 10000,
  });
  return check;
}
