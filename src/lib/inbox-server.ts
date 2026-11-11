/**
 * The Inbox's three reads, run together on the server. Each arm fails on its own: a failed arm
 * empties only its part of the list and is reported, so the page can say which part is missing
 * rather than replacing the whole inbox with an error.
 *
 * SERVER-ONLY (through `lib/api/client.ts`).
 */

import { apiSafe } from "@/lib/api/client";
import { fetchDecisionReversals } from "@/lib/api/decision-reversals";
import { fetchNotificationFeed } from "@/lib/api/notification-feed";
import { fetchMyStatusRequests } from "@/lib/api/status-requests";
import type { DashboardResponse } from "@/lib/api/types";
import { describeNotification, type FeedItem } from "@/components/notifications/alert-copy";
import { reversalIdOf } from "@/lib/reversals";
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
  const notes = notifications ? await withReversals(notifications) : null;
  const reviewArm = dashboard.ok ? dashboard.data.needs_review : null;
  const reviewFailed = !reviewArm || reviewArm.status === "degraded";
  const failed: InboxArm[] = [];
  if (notes === null) failed.push("notifications");
  if (updates === null) failed.push("updates");
  if (reviewFailed) failed.push("review");
  return {
    items: toInboxItems(
      { notifications: notes ?? [], updates: updates ?? [], reviews: reviewArm?.items ?? [] },
      nowMs,
    ),
    failed,
  };
}

/** A "decision changed" notification carries its reversal, so the row can be settled in place
 *  and shows the outcome when it was settled elsewhere. One read, and only when there is one. */
async function withReversals(items: FeedItem[]): Promise<FeedItem[]> {
  if (!items.some((n) => reversalIdOf(n.sourceEventId))) return items;
  const rows = await fetchDecisionReversals("all").catch(() => null);
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  return items.map((n) => {
    const id = reversalIdOf(n.sourceEventId);
    return id ? { ...n, reversal: byId.get(id) ?? null } : n;
  });
}
