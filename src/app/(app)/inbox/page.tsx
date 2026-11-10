import type { Metadata } from "next";
import { Suspense } from "react";
import { InboxView } from "@/components/inbox/InboxView";
import { loadInbox } from "@/lib/inbox-server";
import { PageSkeleton } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Inbox | Mytheus" };
export const dynamic = "force-dynamic";

/* The Inbox (November 2026 IA): notifications, the updates you owe and your agents' detections to
   review, in one list. Each arm is read on its own and a failed arm only empties its part
   (`loadInbox`). Replaces /notifications, which redirects here. */
export default async function InboxPage() {
  const { items, failed } = await loadInbox();
  return (
    <Suspense fallback={<PageSkeleton label="Loading your inbox" layout="list" action />}>
      <InboxView initial={items} failed={failed} nowIso={new Date().toISOString()} />
    </Suspense>
  );
}
