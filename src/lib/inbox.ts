/**
 * The Inbox: one list of everything waiting on you, merged from three reads.
 *
 *   - notifications   your agent's alerts and reminders (notification-service), read and unread
 *   - updates         status requests you owe ("how is it going?", core-api, pending)
 *   - review          what your agents detected in your meetings that nobody has confirmed or
 *                     dismissed yet (`/bff/dashboard` `needs_review`)
 *
 * Pure, so the merge, the order, the filters and the counts are tested under `node --test` and
 * shared by the server page, the client list and the sidebar count.
 *
 * Order: open items first (an unread notification, a pending update, any review item), then by
 * the frozen priority (1 acts now, 2 needs attention, 3 informs), then newest first. A status
 * request whose meeting starts within two hours acts now; any other is attention. A proposed
 * decision needs attention; a proposed task informs.
 */

import type { FeedItem } from "@/components/notifications/alert-copy";
import type { StatusRequestView } from "@/lib/api/personal-types";

/** Fired on window by the Inbox with the new open count, so the sidebar follows triage at once. */
export const INBOX_COUNT_EVENT = "mx-inbox-count";

export type InboxKind = "notification" | "update" | "review";
export type InboxFilter = "all" | "review" | "updates" | "notifications";

export type ReviewInput = {
  id: string;
  kind: "decision" | "action";
  content: string;
  meeting_id: string;
  meeting_title: string | null;
  created_at: string;
};

type Base = {
  /** unique across kinds: `${kind}:${id}` */
  key: string;
  id: string;
  priority: 1 | 2 | 3;
  /** still waiting on you */
  open: boolean;
  /** what the list sorts by, newest first */
  at: string;
};

export type InboxItem =
  | (Base & { kind: "notification"; notification: FeedItem })
  | (Base & { kind: "update"; update: StatusRequestView })
  | (Base & { kind: "review"; review: ReviewInput });

const SOON_MS = 2 * 60 * 60 * 1000;

function updatePriority(u: StatusRequestView, nowMs: number): 1 | 2 {
  if (!u.meetingStart) return 2;
  const t = Date.parse(u.meetingStart);
  return Number.isFinite(t) && t - nowMs <= SOON_MS ? 1 : 2;
}

export function toInboxItems(
  {
    notifications = [],
    updates = [],
    reviews = [],
  }: { notifications?: FeedItem[]; updates?: StatusRequestView[]; reviews?: ReviewInput[] },
  nowMs: number,
): InboxItem[] {
  const out: InboxItem[] = [];
  for (const n of notifications)
    out.push({ kind: "notification", key: `notification:${n.id}`, id: n.id, priority: n.priority, open: n.unread, at: n.createdAt, notification: n });
  for (const u of updates)
    out.push({
      kind: "update",
      key: `update:${u.id}`,
      id: u.id,
      priority: updatePriority(u, nowMs),
      open: u.state === "pending",
      at: u.requested_at,
      update: u,
    });
  for (const r of reviews)
    out.push({ kind: "review", key: `review:${r.id}`, id: r.id, priority: r.kind === "decision" ? 2 : 3, open: true, at: r.created_at, review: r });
  return sortInbox(out);
}

function time(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function compareInbox(a: InboxItem, b: InboxItem): number {
  if (a.open !== b.open) return a.open ? -1 : 1;
  if (a.open && a.priority !== b.priority) return a.priority - b.priority;
  const d = time(b.at) - time(a.at);
  if (d !== 0) return d;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/** Sorted copy; never mutates its input. */
export function sortInbox(items: readonly InboxItem[]): InboxItem[] {
  return [...items].sort(compareInbox);
}

const FILTER_KIND: Record<Exclude<InboxFilter, "all">, InboxKind> = {
  review: "review",
  updates: "update",
  notifications: "notification",
};

export function filterInbox(items: readonly InboxItem[], filter: InboxFilter): InboxItem[] {
  if (filter === "all") return [...items];
  return items.filter((i) => i.kind === FILTER_KIND[filter]);
}

export type InboxCounts = Record<InboxFilter, number>;

/** Open items per filter; `all` is the sidebar's number. */
export function inboxCounts(items: readonly InboxItem[]): InboxCounts {
  const open = items.filter((i) => i.open);
  return {
    all: open.length,
    review: open.filter((i) => i.kind === "review").length,
    updates: open.filter((i) => i.kind === "update").length,
    notifications: open.filter((i) => i.kind === "notification").length,
  };
}

/** The sidebar badge text: nothing at zero, "99+" past 99. */
export function countLabel(n: number | null | undefined): string | null {
  if (!n || n < 1) return null;
  return n > 99 ? "99+" : String(n);
}

/** j/k movement that stops at the ends rather than wrapping. */
export function stepIndex(current: number, delta: 1 | -1, length: number): number {
  if (length === 0) return -1;
  if (current < 0) return delta > 0 ? 0 : length - 1;
  return Math.min(length - 1, Math.max(0, current + delta));
}
