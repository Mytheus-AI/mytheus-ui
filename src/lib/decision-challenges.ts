/**
 * "Decisions that follow you" as pure helpers (tested under `node --test`, shared by the decision
 * page, the Inbox and the server actions).
 *
 * A notification says which job made it through `payload.source_event_id`:
 *   - `decision-challenge:{challenge_id}`         your decision was challenged somewhere people work
 *   - `decision-reopen:{request_id}`              someone asked you to reopen your decision
 *   - `decision-reopen-resolved:{request_id}`     the owner accepted or declined your request
 */

import type {
  ChallengeSource,
  ChallengeStatus,
  DecisionChallenge,
  ReopenAcceptBody,
  ReopenOutcome,
  ReopenRequest,
  ReopenStatus,
} from "./api/decision-challenges-types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

export type FollowEvent =
  | { kind: "decision-challenge"; challengeId: string }
  | { kind: "decision-reopen"; requestId: string }
  | { kind: "decision-reopen-resolved"; requestId: string };

/** Which "decisions that follow you" job made a notification; null for anything else. */
export function parseFollowEvent(value: unknown): FollowEvent | null {
  if (typeof value !== "string") return null;
  const parts = value.trim().split(":");
  if (parts.length !== 2 || !isUuid(parts[1])) return null;
  const id = parts[1].toLowerCase();
  if (parts[0] === "decision-challenge") return { kind: "decision-challenge", challengeId: id };
  if (parts[0] === "decision-reopen") return { kind: "decision-reopen", requestId: id };
  if (parts[0] === "decision-reopen-resolved") return { kind: "decision-reopen-resolved", requestId: id };
  return null;
}

/** The reopen request a notification is about (asked or resolved), or null. */
export function reopenIdOf(sourceEventId: unknown): string | null {
  const e = parseFollowEvent(sourceEventId);
  return e && e.kind !== "decision-challenge" ? e.requestId : null;
}

/* ---------------- copy ---------------- */

export const SOURCE_LABEL: Record<ChallengeSource, string> = {
  slack: "Slack",
  extension: "Browser",
  mcp: "AI assistant",
  app: "Mytheus",
};

/** Where it was said, in a few words: the place the server named, else the source. */
export function placeOf(c: { place_label: string | null; source: ChallengeSource }): string {
  const label = (c.place_label ?? "").replace(/\s+/g, " ").trim();
  return label ? clip(label, 60) : SOURCE_LABEL[c.source] ?? "Elsewhere";
}

export const CHALLENGE_STATUS_LABEL: Record<ChallengeStatus, string> = {
  open: "Open",
  dismissed: "Dismissed",
  reopened: "Reopen asked",
};

export const REOPEN_STATUS_LABEL: Record<ReopenStatus, string> = {
  pending: "Waiting on the owner",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export const OUTCOME_COPY: Record<ReopenOutcome, { option: string; description: string; toast: string; outcome: string }> = {
  revisit: {
    option: "Schedule a revisit",
    description: "A short meeting with the person who asked, the decision on its agenda.",
    toast: "Revisit scheduled",
    outcome: "A revisit meeting is scheduled.",
  },
  follow_up: {
    option: "Create a follow-up task",
    description: "A task for you to look at the decision again by a date.",
    toast: "Follow-up task created",
    outcome: "A follow-up task was created for the owner.",
  },
};

/** The heading of the decision page's section: how far the decision has travelled. */
export function challengedHeading(places: number, open: number): string {
  if (places > 0) return `Challenged in ${places} ${places === 1 ? "place" : "places"}`;
  if (open > 0) return `Challenged ${open} ${open === 1 ? "time" : "times"}`;
  return "Challenges";
}

/** Only http(s) links leave the app; anything else is dropped rather than linked. */
export function externalLink(link: string | null | undefined): string | null {
  const raw = (link ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Open first, then asked to reopen, then dismissed; newest first inside each. Never mutates. */
export function orderChallenges(items: readonly DecisionChallenge[]): DecisionChallenge[] {
  const rank: Record<ChallengeStatus, number> = { open: 0, reopened: 1, dismissed: 2 };
  return [...items].sort((a, b) => {
    const r = rank[a.status] - rank[b.status];
    if (r !== 0) return r;
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}

/** Pending first, then newest first. Never mutates. */
export function orderReopenRequests(items: readonly ReopenRequest[]): ReopenRequest[] {
  return [...items].sort((a, b) => {
    if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}

/** Who may dismiss a challenge: the person who wrote it, or the decision's owner. */
export function canDismiss(c: DecisionChallenge, viewerId: string | null | undefined, viewerIsOwner: boolean): boolean {
  if (c.status !== "open") return false;
  if (typeof c.viewer_can_dismiss === "boolean") return c.viewer_can_dismiss;
  return viewerIsOwner || (!!viewerId && c.author?.id === viewerId);
}

/** The line a settled request shows. */
export function reopenOutcomeLine(r: Pick<ReopenRequest, "status" | "outcome">): string {
  if (r.status === "accepted") return r.outcome ? OUTCOME_COPY[r.outcome].outcome : "The owner reopened this decision.";
  if (r.status === "declined") return "The owner kept the decision as it is.";
  if (r.status === "withdrawn") return "The request was withdrawn.";
  return REOPEN_STATUS_LABEL.pending;
}

/* ---------------- dates and the accept form ---------------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` for a date in the viewer's own clock. */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `YYYY-MM-DDTHH:MM` for a `datetime-local` input, in the viewer's own clock. */
export function localDateTime(d: Date): string {
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The next weekday at 10:00 (never today). */
export function defaultRevisitStart(now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

/** A week from today. */
export function defaultFollowUpDue(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 7);
  return localDate(d);
}

export const REOPEN_LIMITS = { reasonMax: 1000, noteMax: 1000 } as const;

export type AcceptDraft = { outcome: ReopenOutcome; when: string; due: string; note: string };
export type AcceptCheck =
  | { ok: true; body: ReopenAcceptBody }
  | { ok: false; field: "when" | "due" | "note"; message: string };

/**
 * The owner's answer, checked before it is sent. A revisit needs a start in the future (the
 * `datetime-local` value is read in the viewer's clock and sent as UTC); a follow-up needs a due
 * date that is not in the past.
 */
export function checkAccept(draft: AcceptDraft, now: Date): AcceptCheck {
  const note = draft.note.replace(/\s+/g, " ").trim();
  if (note.length > REOPEN_LIMITS.noteMax) {
    return { ok: false, field: "note", message: `Keep the note to ${REOPEN_LIMITS.noteMax} characters.` };
  }
  const body: ReopenAcceptBody = { outcome: draft.outcome };
  if (note) body.note = note;
  if (draft.outcome === "revisit") {
    const at = new Date(draft.when);
    if (!draft.when || Number.isNaN(at.getTime())) return { ok: false, field: "when", message: "Pick when the revisit starts." };
    if (at.getTime() <= now.getTime()) return { ok: false, field: "when", message: "Pick a time in the future." };
    body.scheduled_start = at.toISOString();
    body.duration_minutes = 30;
  } else {
    if (!DATE.test(draft.due)) return { ok: false, field: "due", message: "Pick a due date." };
    if (draft.due < localDate(now)) return { ok: false, field: "due", message: "Pick today or a later date." };
    body.due_date = draft.due;
  }
  return { ok: true, body };
}

/** A reason is optional; when given it is one tidy line within the limit. */
export function checkReason(raw: string): { ok: true; reason: string | undefined } | { ok: false; message: string } {
  const reason = raw.replace(/\s+/g, " ").trim();
  if (reason.length > REOPEN_LIMITS.reasonMax) {
    return { ok: false, message: `Keep the reason to ${REOPEN_LIMITS.reasonMax} characters.` };
  }
  return { ok: true, reason: reason || undefined };
}
