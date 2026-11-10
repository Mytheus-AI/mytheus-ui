/**
 * The caller's whole notification feed, for the in-app notifications page: `GET /notifications`
 * on notification-service without a meeting filter (the room reads its own meeting's rows through
 * `/api/meeting-alerts`). Rows are the caller's own; dismissed ones are left out by asking for
 * `unread` and `read` separately.
 *
 * Kept apart from `notifications.ts` so the new ADR-0039 alert types (`topic_watch`,
 * `already_decided`) can be read here without widening that module's union, which the room uses.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type { FeedRowInput } from "@/components/notifications/alert-copy";

interface FeedPage {
  items: FeedRowInput[];
  next_cursor: string | null;
}

/** Newest first, unread and read together, at most `limit` of each. */
export async function fetchNotificationFeed(limit = 50): Promise<FeedRowInput[]> {
  const [unread, read] = await Promise.all(
    (["unread", "read"] as const).map((status) => api<FeedPage>("/notifications", { query: { status, limit } })),
  );
  const rows = [...(unread?.items ?? []), ...(read?.items ?? [])];
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}
