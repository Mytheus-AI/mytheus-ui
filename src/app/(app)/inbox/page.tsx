import type { Metadata } from "next";
import { Suspense } from "react";
import { InboxView } from "@/components/inbox/InboxView";
import { loadInbox } from "@/lib/inbox-server";
import InboxLoading from "./loading";

export const metadata: Metadata = { title: "Inbox | Mytheus" };
export const dynamic = "force-dynamic";

/* The Inbox (November 2026 IA): notifications, the updates you owe and your Mytes' detections to
   review, in one list. Each arm is read on its own and a failed arm only empties its part
   (`loadInbox`). Replaces /notifications, which redirects here. */
export default async function InboxPage() {
  const { items, failed } = await loadInbox();
  return (
    <Suspense fallback={<InboxLoading />}>
      <InboxView initial={items} failed={failed} nowIso={new Date().toISOString()} />
    </Suspense>
  );
}
