/**
 * The Inbox's three reads, run together on the server. Each arm fails on its own: a failed arm
 * empties only its part of the list and is reported, so the page can say which part is missing
 * rather than replacing the whole inbox with an error.
 *
 * SERVER-ONLY (through `lib/api/client.ts`).
 */

import { apiSafe } from "@/lib/api/client";
import { fetchNotificationFeed } from "@/lib/api/notification-feed";
import { fetchMyStatusRequests } from "@/lib/api/status-requests";
import type { DashboardResponse } from "@/lib/api/types";
import { describeNotification } from "@/components/notifications/alert-copy";
import { toInboxItems, type InboxItem } from "@/lib/inbox";

export type InboxArm = "notifications" | "updates" | "review";

export type InboxRead = { items: InboxItem[]; failed: InboxArm[] };

export async function loadInbox(nowMs = Date.now()): Promise<InboxRead> {
  const [notifications, updates, dashboard] = await Promise.all([
    fetchNotificationFeed().then(
      (rows) => rows.map(describeNotification),
      () => null,
    ),
    fetchMyStatusRequests("pending").catch(() => null),
    apiSafe<DashboardResponse>("/bff/dashboard"),
  ]);
  const reviewArm = dashboard.ok ? dashboard.data.needs_review : null;
  const reviewFailed = !reviewArm || reviewArm.status === "degraded";
  const failed: InboxArm[] = [];
  if (notifications === null) failed.push("notifications");
  if (updates === null) failed.push("updates");
  if (reviewFailed) failed.push("review");
  return {
    items: toInboxItems(
      { notifications: notifications ?? [], updates: updates ?? [], reviews: reviewArm?.items ?? [] },
      nowMs,
    ),
    failed,
  };
}
