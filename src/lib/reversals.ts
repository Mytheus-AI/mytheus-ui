/**
 * Decision reversal and the other only-Mytheus notifications, as pure helpers (tested under
 * `node --test`, shared by the Inbox, the tasks banner and the server action).
 *
 * A notification says which job made it through `payload.source_event_id`:
 *   - `decision-reversal:{reversal_id}`                 a decision changed under one of your tasks
 *   - `promise-drift:{action_id}:{due}:owner|host`      a promise is past due with its Jira ticket open
 *   - `weekly-digest:{digest_id}`                       your weekly digest is ready
 */

import type { DecisionReversal, ReversalResolution, ReversalResolveBody, ReversalStatus } from "./api/only-mytheus-types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SourceEvent =
  | { kind: "decision-reversal"; reversalId: string }
  | { kind: "promise-drift"; actionId: string; due: string; audience: "owner" | "host" }
  | { kind: "weekly-digest"; digestId: string };

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/** What job made a notification, from its `source_event_id`; null for anything else. */
export function parseSourceEvent(value: unknown): SourceEvent | null {
  if (typeof value !== "string") return null;
  const parts = value.trim().split(":");
  if (parts[0] === "decision-reversal" && parts.length === 2 && isUuid(parts[1])) {
    return { kind: "decision-reversal", reversalId: parts[1].toLowerCase() };
  }
  if (parts[0] === "promise-drift" && parts.length === 4 && isUuid(parts[1]) && DATE.test(parts[2])) {
    const audience = parts[3];
    if (audience === "owner" || audience === "host") {
      return { kind: "promise-drift", actionId: parts[1].toLowerCase(), due: parts[2], audience };
    }
  }
  if (parts[0] === "weekly-digest" && parts.length === 2 && isUuid(parts[1])) {
    return { kind: "weekly-digest", digestId: parts[1].toLowerCase() };
  }
  return null;
}

/** The reversal a notification is about, or null. */
export function reversalIdOf(sourceEventId: unknown): string | null {
  const e = parseSourceEvent(sourceEventId);
  return e?.kind === "decision-reversal" ? e.reversalId : null;
}

export const RESOLVED_AS: Record<ReversalResolution, Exclude<ReversalStatus, "pending">> = {
  keep: "kept",
  rescope: "rescoped",
  close: "closed",
};

/** The button, the toast that answers it (same verb), and the line the row shows after. */
export const RESOLUTION_COPY: Record<ReversalResolution, { button: string; toast: string; outcome: string }> = {
  keep: { button: "Keep task", toast: "Task kept", outcome: "You kept this task as it was." },
  rescope: { button: "Re-scope", toast: "Task re-scoped", outcome: "You re-scoped this task for the new decision." },
  close: { button: "Close task", toast: "Task closed", outcome: "You closed this task. It no longer counts as open." },
};

export const STATUS_LABEL: Record<ReversalStatus, string> = {
  pending: "Waiting on you",
  kept: "Kept",
  rescoped: "Re-scoped",
  closed: "Closed",
};

export function resolutionOf(status: ReversalStatus): ReversalResolution | null {
  return status === "kept" ? "keep" : status === "rescoped" ? "rescope" : status === "closed" ? "close" : null;
}

export const RESCOPE_LIMITS = { contentMax: 2000 } as const;

export type RescopeDraft = { content: string; dueDate: string };
export type RescopeCheck = { ok: true; body: ReversalResolveBody } | { ok: false; field: "content" | "due_date" | "form"; message: string };

/**
 * A re-scope sends only what changed: the task's wording, its due date (empty clears it), or
 * both. Changing nothing is not a re-scope, and says so.
 */
export function checkRescope(draft: RescopeDraft, original: { content: string; due_date: string | null }): RescopeCheck {
  const content = draft.content.replace(/\s+/g, " ").trim();
  const due = draft.dueDate.trim();
  if (!content) return { ok: false, field: "content", message: "Say what the task is now." };
  if (content.length > RESCOPE_LIMITS.contentMax) {
    return { ok: false, field: "content", message: `Keep the task to ${RESCOPE_LIMITS.contentMax} characters.` };
  }
  if (due && !DATE.test(due)) return { ok: false, field: "due_date", message: "Pick a due date, or leave it empty." };
  const body: ReversalResolveBody = { resolution: "rescope" };
  if (content !== original.content.replace(/\s+/g, " ").trim()) body.content = content;
  if ((due || null) !== (original.due_date || null)) body.due_date = due || null;
  if (body.content === undefined && body.due_date === undefined) {
    return { ok: false, field: "form", message: "Change the task or its due date, or choose Keep task instead." };
  }
  return { ok: true, body };
}

/** The decision page for a decision. */
export function decisionHref(d: { id: string; meeting_id: string }): string {
  return `/meetings/${d.meeting_id}/decisions/${d.id}`;
}

/** Pending first, then newest first; the one in focus (`?reversal=`) is kept wherever it falls. */
export function orderReversals(items: readonly DecisionReversal[]): DecisionReversal[] {
  return [...items].sort((a, b) => {
    if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}
