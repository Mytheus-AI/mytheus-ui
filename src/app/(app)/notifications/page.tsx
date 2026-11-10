import type { Metadata } from "next";
import { NotificationFeed } from "@/components/notifications/NotificationFeed";
import { describeNotification } from "@/components/notifications/alert-copy";
import { fetchNotificationFeed } from "@/lib/api/notification-feed";

export const metadata: Metadata = { title: "Notifications | Mytheus" };

/* The in-app notification feed outside any meeting room: the caller's own unread and read rows
   from notification-service, including the ADR-0039 `topic_watch` and `already_decided` alerts and
   the B9 reminders (status requests, briefs, catch-ups). A failed read is thrown to `error.tsx`. */
export default async function NotificationsPage() {
  const rows = await fetchNotificationFeed();
  return <NotificationFeed initial={rows.map(describeNotification)} nowIso={new Date().toISOString()} />;
}
