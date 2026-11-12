/**
 * What a notification says outside the meeting room, and where it leads. Pure, so it is tested
 * under `node --test` and used by the server page and the client list alike.
 *
 * Two alert types are new in ADR-0039 C7 and carry their own payload:
 *   - `topic_watch`  {topic, meeting_id, meeting_title, snippet}: a topic you watch came up in a
 *     meeting you are not in (never a confidential one). Leads to that meeting.
 *   - `already_decided` {decision_id, decision_content, decided_at, meeting_id, meeting_title}:
 *     the room re-opened something the org already decided. Leads to the decision.
 * Every other row (the P11 alert types and plain reminders such as "Quick status on ...?") is
 * shown with the title, body and link notification-service stored.
 */

export type FeedKind =
  | "topic_watch"
  | "already_decided"
  | "alert"
  | "reminder"
  | "decision_changed"
  | "promise_drift"
  | "weekly_digest"
  | "decision_challenged"
  | "reopen_requested"
  | "reopen_resolved"
  | "last_word"
  | "agreement_check"
  | "late_contribution"
  | "interruption"
  | "evening_digest";

import type { DecisionReversal } from "../../lib/api/only-mytheus-types";
import { parseSourceEvent } from "../../lib/reversals.ts";
import type { ReopenRequest } from "../../lib/api/decision-challenges-types";
import { parseFollowEvent } from "../../lib/decision-challenges.ts";
import type { AgreementCheck, LastWordNudge } from "../../lib/api/room-signals-types";
import { parseSignalEvent } from "../../lib/room-signals.ts";
import { newNotificationLabel } from "../../lib/settlements.ts";
import { eveningDigestIdOf, interruptionIdOf } from "../../lib/listening.ts";
import type { Interruption } from "../../lib/api/listening-types";
import { parseBetSource } from "../../lib/bets.ts";

export interface FeedRowInput {
  id: string;
  meeting_id: string | null;
  source: string;
  alert_type: string | null;
  priority: number;
  title: string;
  body: string;
  link: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

export interface FeedItem {
  id: string;
  kind: FeedKind;
  /** Frozen colour language: 1 red acts now, 2 amber attention, 3 blue informs. */
  priority: 1 | 2 | 3;
  title: string;
  body: string;
  /** A short quote shown in the quiet serif voice (the snippet, or the original decision). */
  quote: string | null;
  href: string | null;
  linkLabel: string;
  unread: boolean;
  createdAt: string;
  /** `payload.source_event_id`: which job made it (only-Mytheus wave: `decision-reversal:`,
   *  `promise-drift:`, `weekly-digest:`). */
  sourceEventId?: string | null;
  /** A decision reversal's own row, joined on the server so the Inbox can settle it in place;
   *  null when it could not be read (the row still offers the three choices). */
  reversal?: DecisionReversal | null;
  /** A reopen request's own row (decisions that follow you), joined on the server so the owner can
   *  answer it in place; null when it could not be read. */
  reopen?: ReopenRequest | null;
  /** The meeting the notification is about (the row's own, or the payload's), when known. */
  meetingId?: string | null;
  /** A last-word nudge's own row (a3 room signals), joined on the server so the Inbox can settle it
   *  in place; null when it could not be read. */
  lastWord?: LastWordNudge | null;
  /** An agreement check's own row, joined the same way. */
  agreementCheck?: AgreementCheck | null;
  /** In every meeting at once: an `interrupt:{id}` row's interruption, joined on the server so
   *  the Inbox can offer Join now / Send a view / Hold the line in place; null when unread. */
  interruption?: Interruption | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Only same-site paths are followed; anything else is dropped rather than linked. */
export function safeLink(link: string | null | undefined): string | null {
  const l = (link ?? "").trim();
  return l.startsWith("/") && !l.startsWith("//") ? l : null;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayMonth(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function prio(p: number): 1 | 2 | 3 {
  return p === 1 || p === 2 ? p : 3;
}

export function describeNotification(row: FeedRowInput): FeedItem {
  const p = row.payload ?? {};
  const type = row.alert_type ?? str(p.alert_type);
  const meetingId = str(p.meeting_id) || row.meeting_id || "";
  const meetingTitle = str(p.meeting_title) || "a meeting";
  const meetingHref = UUID.test(meetingId) ? `/meetings/${meetingId}` : null;
  const base = {
    id: row.id,
    priority: prio(row.priority),
    unread: row.status === "unread",
    createdAt: row.created_at,
  };

  if (type === "topic_watch") {
    const topic = str(p.topic);
    const snippet = clip(str(p.snippet), 200);
    return {
      ...base,
      kind: "topic_watch",
      // ADR-0039 C7 (amended): a watched topic informs, blue.
      priority: 3,
      title: topic ? `${topic} came up in ${meetingTitle}` : row.title || `A topic you watch came up in ${meetingTitle}`,
      body: "You are not in this meeting. Your Myte noticed it because you watch this topic.",
      quote: snippet || null,
      href: safeLink(row.link) ?? meetingHref,
      linkLabel: "Open the meeting",
    };
  }

  if (type === "already_decided") {
    const content = clip(str(p.decision_content), 300);
    const decidedOn = dayMonth(str(p.decided_at));
    return {
      ...base,
      kind: "already_decided",
      // ADR-0039 C7 (amended): a re-opened decision needs attention, amber.
      priority: 2,
      title: `Already decided, raised again in ${meetingTitle}`,
      body: decidedOn ? `This was settled on ${decidedOn}.` : "This was settled in an earlier meeting.",
      quote: content || null,
      // The decision log; the alert payload does not say which meeting the decision came from, so
      // the lineage page (which is keyed by that meeting) is reachable only through a server link.
      href: safeLink(row.link) ?? "/decisions",
      linkLabel: "See the decision",
    };
  }

  // Decisions that follow you: your decision was challenged somewhere people work, someone asked
  // you to reopen it, or the owner answered your request. Title, body and link come from the
  // server; the decision page is the fallback link.
  const follow = parseFollowEvent(str(p.source_event_id));
  if (follow) {
    const own = { ...base, sourceEventId: str(p.source_event_id), body: row.body, linkLabel: "Open the decision" };
    const fallback = safeLink(row.link) ?? "/decisions";
    if (follow.kind === "decision-challenge") {
      const quote = clip(str(p.quote), 240);
      const place = str(p.place_label);
      return {
        ...own,
        kind: "decision_challenged",
        // Attention, amber: something went against a decision you own.
        priority: 2,
        title: row.title || (place ? `Your decision was challenged in ${place}` : "Your decision was challenged"),
        quote: quote || null,
        href: fallback,
      };
    }
    if (follow.kind === "decision-reopen") {
      return {
        ...own,
        kind: "reopen_requested",
        // A choice waits on you: amber.
        priority: 2,
        title: row.title || "Someone asked to reopen your decision",
        quote: null,
        href: fallback,
        linkLabel: "See the request",
      };
    }
    return {
      ...own,
      kind: "reopen_resolved",
      // Informs, blue.
      priority: 3,
      title: row.title || "Your request to reopen a decision was answered",
      quote: null,
      href: fallback,
    };
  }

  // The room-signals jobs (a3): the last word, the private agreement check, a late point the host
  // hears about. Title, body and link come from the server; the row settles the first two in place.
  const signal = parseSignalEvent(str(p.source_event_id));
  if (signal) {
    const own = {
      ...base,
      sourceEventId: str(p.source_event_id),
      meetingId: UUID.test(meetingId) ? meetingId : null,
      body: row.body,
      quote: null,
    };
    if (signal.kind === "lastword") {
      return {
        ...own,
        kind: "last_word",
        // An invitation, not a demand: it informs, blue.
        priority: 3,
        title: row.title || "You didn't get to finish your point. Want to add it?",
        href: safeLink(row.link) ?? (meetingHref ? `${meetingHref}#last-word` : null),
        linkLabel: "Open the meeting",
      };
    }
    if (signal.kind === "agreement") {
      return {
        ...own,
        kind: "agreement_check",
        // A question waiting on you: attention, amber.
        priority: 2,
        title: row.title || "Where do you stand on a decision?",
        // The server links to the Inbox (where it is answered); inside the Inbox the row links to
        // the decision instead, once the check is joined (`lib/inbox-server.ts`).
        href: safeLink(row.link) === "/inbox" ? null : safeLink(row.link),
        linkLabel: "Open the decision",
      };
    }
    return {
      ...own,
      kind: "late_contribution",
      priority: 3,
      title: row.title || "Someone added a late point to your meeting",
      href: safeLink(row.link) ?? (meetingHref ? `${meetingHref}#late` : null),
      linkLabel: "Read it",
    };
  }

  // The only-Mytheus jobs: a decision changed under your task, a promise past due with its Jira
  // ticket still open, the weekly digest. Their title, body and link come from the server.
  const sourceEventId = str(p.source_event_id) || null;
  const event = parseSourceEvent(sourceEventId);
  if (event) {
    const own = {
      ...base,
      sourceEventId,
      title: row.title,
      body: row.body,
      quote: null,
    };
    if (event.kind === "decision-reversal") {
      return {
        ...own,
        kind: "decision_changed",
        // A choice waits on you: attention, amber.
        priority: 2,
        title: row.title || "Decision changed: re-scope, keep or close this task?",
        href: safeLink(row.link) ?? `/work/tasks?reversal=${event.reversalId}`,
        linkLabel: "See it with your tasks",
      };
    }
    if (event.kind === "promise-drift") {
      return {
        ...own,
        kind: "promise_drift",
        title: row.title || "A promise is past due",
        href: safeLink(row.link) ?? (event.audience === "owner" ? `/work/tasks?focus=${event.actionId}` : meetingHref),
        linkLabel: event.audience === "owner" ? "Open the task" : "Open the meeting",
      };
    }
    return {
      ...own,
      kind: "weekly_digest",
      // Informs, blue.
      priority: 3,
      title: row.title || "What changed for you this week",
      href: safeLink(row.link) ?? "/digest",
      linkLabel: "Read your digest",
    };
  }

  // The promise ledger's notices (core-api): the capacity warning when something lands on a full
  // day, a date someone asks to move, their answer, promises your Myte found, a hand-off.
  const ledger = promiseLedgerNotice(sourceEventId);
  if (ledger) {
    return {
      ...base,
      kind: "reminder",
      priority: ledger.priority,
      sourceEventId,
      title: row.title || ledger.title,
      body: row.body,
      quote: null,
      href: safeLink(row.link) ?? "/work/promises",
      linkLabel: ledger.label,
    };
  }

  // In every meeting at once: a live interruption from your Myte, and the evening digest.
  const interruptionId = interruptionIdOf(sourceEventId);
  if (interruptionId) {
    return {
      ...base,
      sourceEventId,
      kind: "interruption",
      // Something in a live meeting needs you now: red.
      priority: 1,
      title: row.title || "Something in a live meeting needs you",
      body: row.body,
      quote: null,
      href: "/meetings/listening",
      linkLabel: "See what your Myte raised",
    };
  }
  if (eveningDigestIdOf(sourceEventId)) {
    return {
      ...base,
      sourceEventId,
      kind: "evening_digest",
      priority: 3,
      title: row.title || "What your Myte heard today",
      body: row.body,
      quote: null,
      href: safeLink(row.link) ?? "/meetings/listening",
      linkLabel: "Read the digest",
    };
  }

  // Decisions as bets: a bet whose check date came (score it), or one your Myte suggested.
  const bet = parseBetSource(sourceEventId);
  if (bet) {
    return {
      ...base,
      kind: "reminder",
      sourceEventId,
      priority: bet.stage === "due" ? 2 : 3,
      title: row.title || (bet.stage === "due" ? "Time to score a bet" : "Your Myte heard an expected outcome"),
      body: row.body,
      quote: null,
      href: safeLink(row.link) ?? "/decisions/calls",
      linkLabel: bet.stage === "due" ? "Score the bet" : "Review it",
    };
  }

  const isAlert = row.source === "agent_alert";
  return {
    ...base,
    kind: isAlert ? "alert" : "reminder",
    title: row.title || (isAlert ? "Your Myte noticed something" : "Reminder"),
    body: row.body,
    quote: null,
    href: safeLink(row.link) ?? meetingHref,
    linkLabel:
      newNotificationLabel(sourceEventId, safeLink(row.link)) ??
      (["/status-requests", "/work/updates"].includes(safeLink(row.link) ?? "") ? "Answer it" : "Open"),
  };
}

/** The promise ledger's notification kinds, from `source_event_id`: `capacity:{kind}:{id}:{due}`,
    `promise-date:{proposal}:asked|accepted|declined`, `promise-found:{channel}:{ref}`,
    `promise-handoff:{id}`. Null for anything else. */
export function promiseLedgerNotice(
  sourceEventId: string | null,
): { label: string; title: string; priority: 1 | 2 | 3 } | null {
  const parts = (sourceEventId ?? "").split(":");
  switch (parts[0]) {
    case "capacity":
      return { label: "Offer another date", title: "That day is already full", priority: 2 };
    case "promise-date":
      return parts[2] === "asked"
        ? { label: "Answer the request", title: "Someone asks to move a date", priority: 2 }
        : { label: "Open the promise", title: "Your new date was answered", priority: 3 };
    case "promise-found":
      return { label: "Review them", title: "Your Myte found a promise", priority: 3 };
    case "promise-handoff":
      return { label: "Review it", title: "A promise was handed to you", priority: 2 };
    default:
      return null;
  }
}
