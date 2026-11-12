import type { ReactNode } from "react";
import { Shell, type Theme } from "./Shell";
import { NOW } from "./fixtures";
import InboxLoading from "../../../src/app/(app)/inbox/loading";
import { InboxView } from "../../../src/components/inbox/InboxView";
import { toInboxItems } from "../../../src/lib/inbox";
import type { FeedItem } from "../../../src/components/notifications/alert-copy";

/* Skeleton and page pairs, Inbox group. Each entry renders a route's loading.tsx (`skeleton`) or
   the page as it looks loaded (`page`): the page's real view component with sample data. */

const note = (id: string, title: string, over: Partial<FeedItem> = {}): FeedItem => ({
  id,
  kind: "alert" as FeedItem["kind"],
  priority: 2,
  title,
  body: "Raj asked for the pricing numbers before Thursday's review.",
  quote: null,
  href: "/meetings/m-1",
  linkLabel: "Open the meeting",
  unread: true,
  createdAt: "2026-11-11T08:10:00.000Z",
  ...over,
});

const ITEMS = toInboxItems(
  {
    notifications: [note("n-1", "Your Myte flagged a clash with the launch date"), note("n-2", "Priya shared the onboarding notes", { unread: false, priority: 3 })],
    reviews: [
      { id: "r-1", kind: "decision", content: "Ship the beta on 2 December", meeting_id: "m-1", meeting_title: "Weekly sync", created_at: "2026-11-10T16:00:00.000Z" },
      { id: "r-2", kind: "action", content: "Diego drafts the pricing page", meeting_id: "m-1", meeting_title: "Weekly sync", created_at: "2026-11-10T16:02:00.000Z" },
    ],
  },
  Date.parse(NOW),
);

type Entry = { skeleton: () => ReactNode; page: () => ReactNode; meet?: boolean; bare?: boolean };

const ENTRIES: Record<string, Entry> = {
  inbox: { skeleton: () => <InboxLoading />, page: () => <InboxView initial={ITEMS} failed={[]} nowIso={NOW} /> },
};

export function InboxPair({ id, mode, theme = "light" }: { id: string; mode: "skeleton" | "page"; theme?: Theme }) {
  const e = ENTRIES[id];
  return (
    <Shell theme={theme} meet={e.meet} bare={e.bare}>
      {mode === "skeleton" ? e.skeleton() : e.page()}
    </Shell>
  );
}
