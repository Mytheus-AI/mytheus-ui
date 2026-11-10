/**
 * Minutes for everyone, the client side: the wire shapes this app reads (from the generated
 * core-api types), defensive normalisers for them, and the small pure rules the minutes card,
 * the share dialog, the follow-up composer and the public share page render with.
 *
 * Pure, type-only imports, so the node test runner can read it (tests/minutes.test.ts).
 */

import type { components } from "../../lib/api/generated/core-api.ts";

type S = components["schemas"];

export type MeetingMinutes = S["MeetingMinutes"];
export type MinutesView = S["MeetingMinutesView"];
export type MinutesState = MinutesView["state"];
export type MinutesDecision = S["MinutesDecision"];
export type DecisionStatus = MinutesDecision["status"];
export type MinutesReason = NonNullable<MeetingMinutes["reason"]>;
export type FollowUp = S["FollowUp"];
export type FollowUpDispatch = S["FollowUpDispatch"];
export type GuestDelivery = S["GuestDelivery"];
export type ShareLink = S["ShareLink"];
export type PublicShare = S["PublicShare"];
export type MeetingRecap = S["MeetingRecap"];
export type DecisionRecord = S["DecisionRecord"];
export type LineageStep = S["LineageStep"];
export type RecapMinutes = S["RecapMinutes"];

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/* ------------------------------------------------------------------ decision status */

export type ChipTone = "neutral" | "accent" | "ok" | "high" | "medium" | "low";

/** A decision's status in the minutes, as a chip: agreed is done, tentative needs attention,
 *  deferred informs, reversed acts now (the frozen priority language). */
export const DECISION_STATUS: Record<DecisionStatus, { label: string; tone: ChipTone }> = {
  agreed: { label: "Agreed", tone: "ok" },
  tentative: { label: "Tentative", tone: "medium" },
  deferred: { label: "Deferred", tone: "low" },
  reversed: { label: "Reversed", tone: "high" },
};

export function decisionStatus(raw: unknown): { label: string; tone: ChipTone } {
  return typeof raw === "string" && raw in DECISION_STATUS
    ? DECISION_STATUS[raw as DecisionStatus]
    : { label: "Noted", tone: "neutral" };
}

/* ------------------------------------------------------------------ minutes view */

const STATES: ReadonlySet<string> = new Set(["ready", "pending", "unavailable", "not_ended"]);

function minutesOf(v: unknown): MeetingMinutes | null {
  const o = obj(v);
  if (!o) return null;
  const scope = o.scope === "personal" ? "personal" : o.scope === "shared" ? "shared" : null;
  const status = o.status === "ready" || o.status === "empty" || o.status === "unavailable" ? o.status : null;
  if (!scope || !status) return null;
  const items = <T,>(raw: unknown, f: (e: Obj) => T | null): T[] =>
    list(raw)
      .map((e) => (obj(e) ? f(obj(e) as Obj) : null))
      .filter((e): e is T => e !== null);
  return {
    scope,
    status,
    reason:
      o.reason === "no_transcript" || o.reason === "budget" || o.reason === "model_error" ? o.reason : null,
    summary: typeof o.summary === "string" ? o.summary : "",
    decisions: items(o.decisions, (e) => {
      const text = str(e.text);
      if (!text) return null;
      const status = (typeof e.status === "string" && e.status in DECISION_STATUS ? e.status : "agreed") as DecisionStatus;
      return { text, status, decision_id: str(e.decision_id) };
    }),
    open_items: items(o.open_items, (e) => {
      const text = str(e.text);
      return text
        ? { text, owner_user_id: str(e.owner_user_id), owner_name: str(e.owner_name), due: str(e.due) }
        : null;
    }),
    unanswered_questions: items(o.unanswered_questions, (e) => {
      const text = str(e.text);
      return text ? { text, asked_by_user_id: str(e.asked_by_user_id), asked_by_name: str(e.asked_by_name) } : null;
    }),
    promises:
      scope === "personal"
        ? items(o.promises, (e) => {
            const text = str(e.text);
            return text ? { text, to_name: str(e.to_name), due: str(e.due) } : null;
          })
        : [],
    prompt_version: typeof o.prompt_version === "string" ? o.prompt_version : "",
    created_at: typeof o.created_at === "string" ? o.created_at : "",
    updated_at: typeof o.updated_at === "string" ? o.updated_at : "",
  };
}

/** `GET /api/v1/meetings/{id}/minutes`, or null for a body that is not one. */
export function toMinutesView(raw: unknown): MinutesView | null {
  const o = obj(raw);
  if (!o || typeof o.meeting_id !== "string" || typeof o.state !== "string" || !STATES.has(o.state)) return null;
  return {
    meeting_id: o.meeting_id,
    state: o.state as MinutesState,
    mine: minutesOf(o.mine),
    shared: minutesOf(o.shared),
  };
}

/** Whether one set of minutes has anything to show. */
export function hasContent(m: MeetingMinutes | null | undefined): boolean {
  if (!m || m.status !== "ready") return false;
  return (
    m.summary.trim().length > 0 ||
    (m.decisions?.length ?? 0) > 0 ||
    (m.open_items?.length ?? 0) > 0 ||
    (m.unanswered_questions?.length ?? 0) > 0 ||
    (m.promises?.length ?? 0) > 0
  );
}

/** Why there are no minutes, said calmly. */
export const UNAVAILABLE_COPY: Record<MinutesReason, { title: string; body: string }> = {
  no_transcript: {
    title: "No minutes for this meeting",
    body: "Nothing was transcribed in this call, so there was nothing to write minutes from.",
  },
  budget: {
    title: "Minutes were paused",
    body: "Your workspace reached its AI budget for this period, so no minutes were written. An admin can raise it in Usage and billing.",
  },
  model_error: {
    title: "Minutes could not be written",
    body: "Something went wrong while writing them. The transcript, decisions and tasks are all still here.",
  },
};

export function unavailableCopy(reason: MinutesReason | null | undefined): { title: string; body: string } {
  return UNAVAILABLE_COPY[reason ?? "model_error"] ?? UNAVAILABLE_COPY.model_error;
}

/** How long to keep checking for minutes while they are being written: every 10 seconds for up
 *  to 15 minutes, then the card offers a manual refresh instead. */
export const MINUTES_POLL_MS = 10_000;
export const MINUTES_POLL_LIMIT_MS = 15 * 60_000;

export function shouldPoll(state: MinutesState | null, elapsedMs: number): boolean {
  return state === "pending" && elapsedMs < MINUTES_POLL_LIMIT_MS;
}

/* ------------------------------------------------------------------ guests */

export const MAX_GUESTS = 20;
const EMAIL_RE = /^[^@\s<>,;"']{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;

export function isEmail(raw: string): boolean {
  const v = raw.trim();
  return v.length <= 320 && EMAIL_RE.test(v);
}

/** Add whatever was typed or pasted (commas, semicolons, spaces or new lines between addresses)
 *  to the guest list: lowercased, de-duplicated, at most 20. Anything that is not an address
 *  comes back in `invalid`, so the field can keep it for fixing. */
export function addGuests(
  existing: string[],
  input: string,
): { guests: string[]; invalid: string[]; overflow: boolean } {
  const guests = [...existing];
  const invalid: string[] = [];
  let overflow = false;
  for (const part of input.split(/[\s,;]+/)) {
    const raw = part.trim().replace(/^<|>$/g, "");
    if (!raw) continue;
    if (!isEmail(raw)) {
      invalid.push(raw);
      continue;
    }
    const email = raw.toLowerCase();
    if (guests.includes(email)) continue;
    if (guests.length >= MAX_GUESTS) {
      overflow = true;
      continue;
    }
    guests.push(email);
  }
  return { guests, invalid, overflow };
}

/* ------------------------------------------------------------------ composer */

export const SUBJECT_MAX = 200;
export const BODY_MAX = 10_000;

export type ComposerDraft = { subject: string; body: string; guests: string[] };

/** The first problem with a composer draft, or null when it can be sent. */
export function composerProblem(d: ComposerDraft): string | null {
  if (!d.subject.trim()) return "Add a subject.";
  if (d.subject.trim().length > SUBJECT_MAX) return `Keep the subject under ${SUBJECT_MAX} characters.`;
  if (!d.body.trim()) return "Write a message, or keep the one drafted from the minutes.";
  if (d.body.length > BODY_MAX) return "That message is too long to send.";
  if (d.guests.length > MAX_GUESTS) return `At most ${MAX_GUESTS} guests.`;
  if (d.guests.some((g) => !isEmail(g))) return "One of the guest addresses is not valid.";
  return null;
}

/** What the server will be sent: only what differs from the draft, so an untouched composer
 *  sends exactly the drafted recap. */
export function composerPayload(
  d: ComposerDraft,
  draft: { subject: string; body: string } | null,
  savedGuests: string[],
): { subject?: string; body?: string; guest_emails?: string[] } {
  const out: { subject?: string; body?: string; guest_emails?: string[] } = {};
  const subject = d.subject.trim();
  const body = d.body.replace(/\s+$/, "");
  if (!draft || subject !== draft.subject) out.subject = subject;
  if (!draft || body !== draft.body.replace(/\s+$/, "")) out.body = body;
  const same = d.guests.length === savedGuests.length && d.guests.every((g, i) => g === savedGuests[i]);
  if (!same) out.guest_emails = d.guests;
  return out;
}

/** The follow-up's last result in one line, and each guest's outcome in words. */
export function dispatchSummary(r: FollowUpDispatch | null | undefined): string | null {
  if (!r) return null;
  if (r.status === "disabled") return "The automatic follow-up is turned off.";
  if (r.status === "unavailable") {
    return r.waiting_for_minutes ? "Waiting for the minutes, then it sends." : "The follow-up could not be sent.";
  }
  const guests = r.guests ?? [];
  const sent = guests.filter((g) => g.status === "sent").length;
  const people = `${r.participants_notified} ${r.participants_notified === 1 ? "participant" : "participants"}`;
  if (guests.length === 0) return `Sent to ${people}.`;
  return `Sent to ${people} and ${sent} of ${guests.length} ${guests.length === 1 ? "guest" : "guests"}.`;
}

export function guestOutcome(g: GuestDelivery): { label: string; tone: ChipTone } {
  if (g.status === "sent") return { label: "Emailed", tone: "ok" };
  if (g.status === "pending") return { label: "Sending", tone: "low" };
  if (g.status === "skipped") {
    return { label: g.detail === "not_configured" ? "Not emailed, email not connected" : "Skipped", tone: "neutral" };
  }
  return { label: "Failed", tone: "high" };
}

/* ------------------------------------------------------------------ share links */

export const EXPIRY_CHOICES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
] as const;

export function linkState(l: Pick<ShareLink, "state">): { label: string; tone: ChipTone } {
  if (l.state === "active") return { label: "Active", tone: "ok" };
  if (l.state === "revoked") return { label: "Turned off", tone: "neutral" };
  return { label: "Expired", tone: "neutral" };
}

/** "Expires in 29 days", "Expires tomorrow", "Expired". */
export function expiryLabel(expiresAt: string, now: Date = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 1) return "Expires within a day";
  return `Expires in ${days} days`;
}

export function viewsLabel(n: number): string {
  return n === 0 ? "Not opened yet" : n === 1 ? "Opened once" : `Opened ${n} times`;
}

/** What a failed share-link create means for the person who pressed it. */
export type ShareFailure = "confirm" | "host_only" | "not_configured" | "not_participant" | "error";

export function shareFailure(status: number, reason: string | null, code: string | null): ShareFailure {
  if (status === 409 && reason === "confidential_confirmation_required") return "confirm";
  if (status === 403 && reason === "confidential_host_only") return "host_only";
  if (status === 403 && code === "NOT_A_PARTICIPANT") return "not_participant";
  if (status === 503) return "not_configured";
  return "error";
}

export const SHARE_FAILURE_COPY: Record<Exclude<ShareFailure, "confirm">, string> = {
  host_only: "This meeting is confidential, so only its host can share the recap.",
  not_configured: "Share links are not set up on this server yet. An admin needs to configure them.",
  not_participant: "Only people who were in the meeting can share its recap.",
  error: "The link could not be created. Try again in a moment.",
};

/* ------------------------------------------------------------------ public share page */

export type PublicShareRead =
  | { kind: "ok"; share: PublicShare }
  | { kind: "gone"; reason: "expired" | "revoked" }
  | { kind: "not_found" }
  | { kind: "error" };

/** The public read's answer, from its HTTP status and body. */
export function publicShareRead(status: number, body: unknown): PublicShareRead {
  if (status === 200) {
    const o = obj(body);
    if (o && (o.kind === "meeting_recap" || o.kind === "decision_record")) return { kind: "ok", share: o as PublicShare };
    return { kind: "error" };
  }
  if (status === 410) {
    const reason = obj(body)?.reason;
    return { kind: "gone", reason: reason === "revoked" ? "revoked" : "expired" };
  }
  if (status === 404 || status === 422) return { kind: "not_found" };
  return { kind: "error" };
}

/** A token is worth sending to the server only if it could be one (10 to 200 URL-safe chars). */
export function plausibleToken(token: string): boolean {
  return /^[A-Za-z0-9_.~-]{10,200}$/.test(token);
}

/** A recap with nothing confirmed and no minutes. */
export function recapIsEmpty(r: MeetingRecap): boolean {
  const m = r.minutes;
  const minutes = !!m && (m.summary.trim() || m.decisions.length || m.open_items.length || m.unanswered_questions.length);
  return !minutes && r.decisions.length === 0 && r.actions.length === 0 && r.agenda.length === 0;
}

const AGENDA_LABEL: Record<string, string> = {
  covered: "Covered",
  in_progress: "In progress",
  skipped: "Skipped",
  pending: "Not reached",
};

export function agendaLabel(status: string): string {
  return AGENDA_LABEL[status] ?? "Not reached";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A due date as people say it: an ISO day becomes "Dec 1"; anything else ("Friday", "next
 *  week", as said in the meeting) is kept as written. */
export function dueLabel(due: string | null | undefined): string | null {
  const v = due?.trim();
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return v;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${Number(m[3])}` : v;
}

/** An open item's owner and due date as one quiet line ("Sam, by Friday"). */
export function ownerLine(owner: string | null | undefined, due: string | null | undefined): string {
  const when = dueLabel(due);
  return [owner?.trim() || null, when ? `by ${when}` : null].filter(Boolean).join(", ");
}
