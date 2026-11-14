/**
 * Ask another person's Myte (ADR-0049 F1), the pure parts: the teammate's Myte as a face and a
 * name, what a question's state says on each side, the draft cleaned for sending (the recipient
 * reviews it with its `[n]` citations; the asker gets plain words only), and polling.
 *
 * Pure, tested in tests/ask-myte-peer.test.ts.
 */

import type { PeerQuestion, PeerUser } from "./types.ts";

/* The teammate Myte's face comes from `agentSeedFor(agent_avatar_seed, id)` (lib/realtime/agent-persona), the app's one fallback. */

/** Polls every 20 seconds while the page is visible (and once on focus). */
export const PEER_POLL_MS = 20_000;

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim() || "Your teammate";
}

/** "Samar's Myte" unless core-api named it (it always does; this is the fallback). */
export function peerMyteName(u: Pick<PeerUser, "name" | "agent_name">): string {
  return u.agent_name?.trim() || `${firstName(u.name)}'s Myte`;
}

/** The draft as the teammate will read it: no citation markers, no trailing spaces. */
export function cleanDraft(text: string): string {
  return text
    .replace(/\s?\[(\d+)\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]+$/g, "")
    .trim();
}

/** The asker's line under the waiting card. */
export function askerStatus(q: Pick<PeerQuestion, "status" | "to_user">): string {
  const who = firstName(q.to_user.name);
  if (q.status === "answered") return `${who} reviewed and sent this answer.`;
  if (q.status === "declined") return `${who} declined to answer.`;
  return `Drafted when ${who} next opens Mytheus. Nothing is sent until ${who} reviews it.`;
}

/** Relative age for a row: "just now", "12 min ago", "3 h ago", "2 days ago". */
export function ago(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** Match a sent question to the ask_myte proposal it came from, by person and wording. */
export function matchesProposal(q: Pick<PeerQuestion, "question" | "to_user">, p: { person_id?: string | null; question?: string | null }): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return q.to_user.id === p.person_id && !!p.question && norm(q.question) === norm(p.question);
}

/** The source event id core-api gives a peer question notification, as its question id. */
export function peerIdOf(sourceEventId: string | null | undefined): string | null {
  const m = /^mytepeer:([0-9a-f-]{36})(?::(answered|declined))?$/i.exec(sourceEventId ?? "");
  return m ? m[1] : null;
}
