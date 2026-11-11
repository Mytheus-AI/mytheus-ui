/**
 * Settle threads (a4 contract, section 3d) and the "reopened" decision reversal (3c), as pure
 * helpers: the normalizer, the request table, the words for each state, and the checks on what an
 * owner types. Tested under `node --test` (tests/settlements.test.ts).
 */

import type { DecisionReversal } from "./api/only-mytheus-types";
import type { Person, ReversalKind, SettleMessage, SettleSide, Settlement, SettlementStatus } from "./api/why-blast-types";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

function person(v: unknown): Person | null {
  const o = obj(v);
  return o && typeof o.user_id === "string" ? { user_id: o.user_id, name: str(o.name).trim() || "Someone" } : null;
}

function side(v: unknown): SettleSide | null {
  const o = obj(v);
  if (!o || typeof o.decision_id !== "string") return null;
  const visible = o.visible !== false;
  return {
    decision_id: o.decision_id,
    meeting_id: str(o.meeting_id),
    meeting_title: visible ? strOrNull(o.meeting_title) : null,
    decided_at: str(o.decided_at),
    owner: person(o.owner),
    team: strOrNull(o.team),
    // Hidden wording is never shown, even if a server sent it by mistake.
    content: visible ? strOrNull(o.content) : null,
    quote: visible ? strOrNull(o.quote) : null,
    quote_speaker: visible ? person(o.quote_speaker) : null,
    visible,
    shared: o.shared === true,
    mine: o.mine === true,
  };
}

const STATUSES: readonly SettlementStatus[] = ["open", "kept_both", "superseded", "meeting_booked"];

export function normalizeSettlement(v: unknown): Settlement | null {
  const o = obj(v);
  if (!o || typeof o.id !== "string") return null;
  const mine = side(o.mine);
  const theirs = side(o.theirs);
  if (!mine || !theirs) return null;
  const p = obj(o.proposal);
  const r = obj(o.resolution);
  const messages: SettleMessage[] = Array.isArray(o.messages)
    ? o.messages
        .map(obj)
        .filter((m): m is Obj => m !== null && typeof m.id === "string" && typeof m.body === "string")
        .map((m) => ({ id: str(m.id), author: person(m.author), mine: m.mine === true, body: str(m.body), created_at: str(m.created_at) }))
        .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
    : [];
  return {
    id: o.id,
    status: STATUSES.includes(o.status as SettlementStatus) ? (o.status as SettlementStatus) : "open",
    created_at: str(o.created_at),
    confidence: typeof o.confidence === "number" ? o.confidence : 0,
    rationale: str(o.rationale).trim(),
    mine,
    theirs,
    proposal: p && typeof p.winner_decision_id === "string" ? { winner_decision_id: p.winner_decision_id, by_me: p.by_me === true, at: str(p.at) } : null,
    resolution: r
      ? {
          by: person(r.by),
          at: str(r.at),
          note: strOrNull(r.note),
          winner_decision_id: strOrNull(r.winner_decision_id),
          meeting_id: strOrNull(r.meeting_id),
        }
      : null,
    messages,
  };
}

export function normalizeSettlements(v: unknown): Settlement[] | null {
  const o = obj(v);
  if (!o || !Array.isArray(o.items)) return null;
  return o.items.map(normalizeSettlement).filter((s): s is Settlement => s !== null);
}

/* ---------------- requests ---------------- */

const seg = (id: string) => encodeURIComponent(id);
export type SettleReq = { method: "GET" | "POST"; path: string; body?: unknown; query?: Record<string, string> };

export const settleRoutes = {
  list: (status: "open" | "all"): SettleReq => ({ method: "GET", path: "/api/v1/settlements", query: { status } }),
  one: (id: string): SettleReq => ({ method: "GET", path: `/api/v1/settlements/${seg(id)}` }),
  message: (id: string, body: string): SettleReq => ({ method: "POST", path: `/api/v1/settlements/${seg(id)}/messages`, body: { body } }),
  share: (id: string): SettleReq => ({ method: "POST", path: `/api/v1/settlements/${seg(id)}/share`, body: {} }),
  keepBoth: (id: string, note: string): SettleReq => ({ method: "POST", path: `/api/v1/settlements/${seg(id)}/keep-both`, body: { note } }),
  supersede: (id: string, winnerDecisionId: string): SettleReq => ({
    method: "POST",
    path: `/api/v1/settlements/${seg(id)}/supersede`,
    body: { winner_decision_id: winnerDecisionId },
  }),
  accept: (id: string): SettleReq => ({ method: "POST", path: `/api/v1/settlements/${seg(id)}/accept`, body: {} }),
  decline: (id: string): SettleReq => ({ method: "POST", path: `/api/v1/settlements/${seg(id)}/decline`, body: {} }),
  slot: (id: string): SettleReq => ({ method: "GET", path: `/api/v1/settlements/${seg(id)}/meeting-slot` }),
  book: (id: string, start: string | null): SettleReq => ({ method: "POST", path: `/api/v1/settlements/${seg(id)}/book`, body: start ? { start } : {} }),
};

/* ---------------- words ---------------- */

export const SETTLE_LIMITS = { message: 1000, note: 500 } as const;

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function checkMessage(body: string): { ok: true; body: string } | { ok: false; message: string } {
  const b = body.trim();
  if (!b) return { ok: false, message: "Write a message first." };
  if (b.length > SETTLE_LIMITS.message) return { ok: false, message: `Keep it to ${SETTLE_LIMITS.message} characters.` };
  return { ok: true, body: b };
}

export function checkKeepNote(note: string): { ok: true; note: string } | { ok: false; message: string } {
  const n = squash(note);
  if (!n) return { ok: false, message: "Add a short note: why can both decisions stand?" };
  if (n.length > SETTLE_LIMITS.note) return { ok: false, message: `Keep the note to ${SETTLE_LIMITS.note} characters.` };
  return { ok: true, note: n };
}

/** "Priya Nair" or "the other owner". */
export function ownerName(s: SettleSide): string {
  return s.owner?.name ?? "the other owner";
}

/** What theirs says when its wording is hidden. */
export function hiddenLine(theirs: SettleSide): string {
  return `Only ${theirs.owner?.name ?? "its owner"} can share the wording of their decision.`;
}

export const STATUS_CHIP: Record<SettlementStatus, { label: string; tone: "medium" | "ok" | "low" }> = {
  open: { label: "To settle", tone: "medium" },
  kept_both: { label: "Both stand", tone: "ok" },
  superseded: { label: "Settled", tone: "ok" },
  meeting_booked: { label: "Meeting booked", tone: "low" },
};

/** The one sentence a resolved thread opens with. */
export function outcomeLine(s: Settlement): string {
  const r = s.resolution;
  const who = r?.by?.name ?? "One of you";
  switch (s.status) {
    case "kept_both":
      return `${who} kept both decisions: they can stand together.`;
    case "superseded": {
      const mineWon = r?.winner_decision_id === s.mine.decision_id;
      return mineWon
        ? `Your decision stands. ${ownerName(s.theirs)}'s decision was superseded, and its tasks were sent to their owners to keep, re-scope or close.`
        : `${capital(ownerName(s.theirs))}'s decision stands. Yours was superseded, and its tasks were sent to their owners to keep, re-scope or close.`;
    }
    case "meeting_booked":
      return `${who} booked a meeting to settle it together.`;
    default:
      return "";
  }
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The pending proposal, from the viewer's side. */
export function proposalLine(s: Settlement): string | null {
  const p = s.proposal;
  if (!p) return null;
  const mineWins = p.winner_decision_id === s.mine.decision_id;
  if (p.by_me) {
    return mineWins
      ? `You proposed that your decision stands. ${capital(ownerName(s.theirs))} has to accept before anything changes.`
      : "You proposed that their decision stands.";
  }
  return mineWins
    ? `${capital(ownerName(s.theirs))} proposed that your decision stands.`
    : `${capital(ownerName(s.theirs))} proposed that their decision stands over yours. If you accept, yours is superseded and its tasks are sent to their owners to keep, re-scope or close.`;
}

/** The decision page of a side, when the viewer may open it. */
export function sideHref(s: SettleSide): string | null {
  return s.visible && s.meeting_id ? `/meetings/${s.meeting_id}/decisions/${s.decision_id}` : null;
}

/* ---------------- reopened reversal (3c) ---------------- */

/** A reversal's kind; rows from before the field existed are "superseded". */
export function reversalKind(r: Pick<DecisionReversal, "id"> & { kind?: unknown }): ReversalKind {
  return r.kind === "reopened" ? "reopened" : "superseded";
}

/** "Ship the beta to 40 customers was reopened because a reason for it no longer holds." */
export function reopenedLine(decision: string): string {
  const d = decision.trim().replace(/[.!]+$/, "");
  return `${d || "This decision"} was reopened because a reason for it no longer holds.`;
}

/* ---------------- notifications ---------------- */

/** The link label for the two new notifications (`settle:` and `assumption-break:` source events). */
export function newNotificationLabel(sourceEventId: string | null, link: string | null): string | null {
  const e = sourceEventId ?? "";
  if (e.startsWith("settle:") || (link ?? "").startsWith("/work/settle/")) return "Settle it together";
  if (e.startsWith("assumption-break:") || /[?&]assumption=/.test(link ?? "")) return "See what changed";
  return null;
}
