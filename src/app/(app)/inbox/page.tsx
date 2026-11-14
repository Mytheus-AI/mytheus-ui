import type { Metadata } from "next";
import { Suspense } from "react";
import { InboxView } from "@/components/inbox/InboxView";
import { PeerQuestionsSection } from "@/components/inbox/PeerQuestions";
import { loadInbox } from "@/lib/inbox-server";
import { readPeerInbox } from "@/lib/ask-myte/server";
import InboxLoading from "./loading";

export const metadata: Metadata = { title: "Inbox | Mytheus" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* The Inbox (November 2026 IA): notifications, the updates you owe and your Mytes' detections to
   review, in one list. Each arm is read on its own and a failed arm only empties its part
   (`loadInbox`). Replaces /notifications, which redirects here.

   Questions teammates asked your Myte (ADR-0049 F1) sit in their own section above the list;
   `?peer_question=<id>` (the link in that notification) opens one for review. */
export default async function InboxPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const [{ items, failed }, peer] = await Promise.all([loadInbox(), readPeerInbox()]);
  const raw = searchParams?.peer_question;
  const openId = typeof raw === "string" && UUID.test(raw) ? raw : null;
  const nowIso = new Date().toISOString();
  return (
    <Suspense fallback={<InboxLoading />}>
      <InboxView initial={items} failed={failed} nowIso={nowIso} before={<PeerQuestionsSection initial={peer} openId={openId} nowIso={nowIso} />} />
    </Suspense>
  );
}
