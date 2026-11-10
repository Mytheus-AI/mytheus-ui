"use server";

import { loadInbox } from "@/lib/inbox-server";
import { inboxCounts } from "@/lib/inbox";

/** The sidebar's Inbox number: everything still waiting on you (unread notifications, updates you
    owe, detections to review). Null when nothing could be read, so the sidebar shows no number
    rather than a wrong zero. */
export async function inboxCount(): Promise<number | null> {
  const { items, failed } = await loadInbox();
  if (failed.length === 3) return null;
  return inboxCounts(items).all;
}
