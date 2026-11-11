/**
 * The Inbox's three reads, run together on the server. Each arm fails on its own: a failed arm
 * empties only its part of the list and is reported, so the page can say which part is missing
 * rather than replacing the whole inbox with an error.
 *
 * SERVER-ONLY (through `lib/api/client.ts`).
 */

import { apiSafe } from "@/lib/api/client";
import { fetchDecisionReversals } from "@/lib/api/decision-reversals";
import { fetchReopenRequests } from "@/lib/api/decision-challenges";
import { reopenIdOf } from "@/lib/decision-challenges";
import { fetchNotificationFeed } from "@/lib/api/notification-feed";
import { fetchMyStatusRequests } from "@/lib/api/status-requests";
import { fetchMyAgreementChecks, fetchMyLastWord } from "@/lib/api/room-signals";
import { parseSignalEvent } from "@/lib/room-signals";
import type { DashboardResponse } from "@/lib/api/types";
import { describeNotification, type FeedItem } from "@/components/notifications/alert-copy";
import { reversalIdOf } from "@/lib/reversals";
import { toInboxItems, type InboxItem } from "@/lib/inbox";
import { fetchInterruptions } from "@/lib/api/listening";
import { interruptionIdOf } from "@/lib/listening";

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
  const notes = notifications
    ? await withInterruptions(await withRoomSignals(await withReopens(await withReversals(notifications))))
    : null;
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

/** A "reopen your decision" notification (or its answer) carries the request, so the owner can
 *  accept or decline it in place and a request answered elsewhere shows its outcome. One read,
 *  and only when there is one. */
async function withReopens(items: FeedItem[]): Promise<FeedItem[]> {
  if (!items.some((n) => reopenIdOf(n.sourceEventId))) return items;
  const rows = await fetchReopenRequests("all", "all").catch(() => null);
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  return items.map((n) => {
    const id = reopenIdOf(n.sourceEventId);
    return id ? { ...n, reopen: byId.get(id) ?? null } : n;
  });
}

/** A last-word nudge or an agreement check carries its own row (a3 room signals), so the Inbox can
 *  settle it in place and shows where it stands when it was settled elsewhere. One read per kind,
 *  and only when there is one; a failed read leaves the row with null (it still works). */
async function withRoomSignals(items: FeedItem[]): Promise<FeedItem[]> {
  const kinds = new Set(items.map((n) => parseSignalEvent(n.sourceEventId)?.kind));
  const [nudges, checks] = await Promise.all([
    kinds.has("lastword") ? fetchMyLastWord("all").catch(() => null) : Promise.resolve(null),
    kinds.has("agreement") ? fetchMyAgreementChecks("all").catch(() => null) : Promise.resolve(null),
  ]);
  const nudgeById = new Map((nudges ?? []).map((r) => [r.id, r]));
  const checkById = new Map((checks ?? []).map((r) => [r.id, r]));
  return items.map((n) => {
    const e = parseSignalEvent(n.sourceEventId);
    if (e?.kind === "lastword") {
      const nudge = nudgeById.get(e.nudgeId) ?? null;
      return { ...n, lastWord: nudge, meetingId: nudge?.meeting_id ?? n.meetingId ?? null };
    }
    if (e?.kind === "agreement") {
      const check = checkById.get(e.checkId) ?? null;
      return {
        ...n,
        agreementCheck: check,
        meetingId: check?.meeting_id ?? n.meetingId ?? null,
        href: check ? `/meetings/${check.meeting_id}/decisions/${check.decision_id}` : n.href,
      };
    }
    return n;
  });
}

/** An `interrupt:{id}` notification carries its interruption (In every meeting at once), so the
 *  row offers Join now, Send a view and Hold the line while the meeting is live, and shows what
 *  happened after. One read, and only when there is one. */
async function withInterruptions(items: FeedItem[]): Promise<FeedItem[]> {
  if (!items.some((n) => interruptionIdOf(n.sourceEventId))) return items;
  const res = await fetchInterruptions(100);
  const byId = new Map((res.ok ? res.data.items : []).map((i) => [i.id, i]));
  return items.map((n) => {
    const id = interruptionIdOf(n.sourceEventId);
    return id ? { ...n, interruption: byId.get(id) ?? null } : n;
  });
}
