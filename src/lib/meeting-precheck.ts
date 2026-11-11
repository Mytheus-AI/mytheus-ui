/**
 * "Should this be a meeting?" (only-Mytheus wave, contract section 3), as pure helpers shared by
 * the new-meeting hint, its route handler and the tests.
 *
 * The dialog asks quietly as you type: debounced, only once the title and agenda hold at least 8
 * characters that are not spaces, and never twice for the same text. Dismissing the hint keeps it
 * away until the text changes meaningfully (two new words, or most of it rewritten).
 */

import type { MeetingPrecheck, PrecheckRequest, StatusRequestsAsked } from "./api/only-mytheus-types";

export const PRECHECK_DEBOUNCE_MS = 700;
export const PRECHECK_MIN_CHARS = 8;
export const PRECHECK_LIMITS = { titleMax: 300, agendaMax: 30, itemMax: 300, participantsMax: 100, askMax: 20 } as const;

export function nonSpaceLength(title: string, agenda: readonly string[]): number {
  return [title, ...agenda].join("").replace(/\s+/g, "").length;
}

export function shouldPrecheck(title: string, agenda: readonly string[]): boolean {
  return nonSpaceLength(title, agenda) >= PRECHECK_MIN_CHARS;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** The request body: trimmed, clipped to the server's limits, blank agenda rows left out. */
export function buildPrecheckRequest(title: string, agenda: readonly string[], participantIds: readonly string[] = []): PrecheckRequest {
  const body: PrecheckRequest = {
    title: clean(title).slice(0, PRECHECK_LIMITS.titleMax),
    agenda: agenda
      .map(clean)
      .filter(Boolean)
      .slice(0, PRECHECK_LIMITS.agendaMax)
      .map((a) => a.slice(0, PRECHECK_LIMITS.itemMax)),
  };
  const ids = Array.from(new Set(participantIds.filter(Boolean))).slice(0, PRECHECK_LIMITS.participantsMax);
  if (ids.length > 0) body.participant_ids = ids;
  return body;
}

/** Same text, same answer: the key a request is remembered by. Case and spacing do not count. */
export function precheckSignature(title: string, agenda: readonly string[]): string {
  return [title, ...agenda].map((s) => clean(s).toLowerCase()).filter(Boolean).join("\n");
}

function words(signature: string): string[] {
  return Array.from(new Set(signature.toLowerCase().match(/[a-z0-9\u00c0-\uffff]{3,}/g) ?? []));
}

/** Whether text dismissed earlier has changed enough to show hints again. */
export function changedMeaningfully(dismissed: string, current: string): boolean {
  if (dismissed === current) return false;
  const before = words(dismissed);
  const now = words(current);
  const added = now.filter((w) => !before.includes(w)).length;
  if (added >= 2) return true;
  const union = new Set(before.concat(now)).size;
  if (union === 0) return false;
  const shared = now.filter((w) => before.includes(w)).length;
  return shared / union < 0.6;
}

/** Anything worth showing. */
export function hasHints(r: MeetingPrecheck | null | undefined): boolean {
  if (!r) return false;
  return r.already_decided.length > 0 || askableActions(r).length > 0 || r.recent_meetings.length > 0;
}

/** The status-update items that can be asked for instead (an open task with an owner). */
export function askableActions(r: MeetingPrecheck): { id: string; ownerName: string | null; text: string }[] {
  const seen = new Set<string>();
  const out: { id: string; ownerName: string | null; text: string }[] = [];
  for (const s of r.status_updates) {
    if (!s.action || seen.has(s.action.id)) continue;
    seen.add(s.action.id);
    out.push({ id: s.action.id, ownerName: s.action.owner_name ?? null, text: s.text });
  }
  return out.slice(0, PRECHECK_LIMITS.askMax);
}

/** "Raj", "Raj and Priya", "Raj, Priya and Diego". */
export function joinNames(names: readonly string[]): string {
  const list = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** First names of the owners, for "Raj, Priya and Diego". */
function first(name: string | null | undefined): string | null {
  return name?.trim().split(/\s+/)[0] || null;
}

/** What asking did, in one line: "Asked Raj, Priya and Diego." plus who was skipped and why. */
export function askedSummary(res: StatusRequestsAsked): { title: string; detail: string | null } {
  const asked = res.items.filter((i) => i.reason === "requested");
  const names = asked.map((i) => first(i.owner_name)).filter((n): n is string => !!n);
  const unnamed = asked.length - names.length;
  let title: string;
  if (asked.length === 0) title = "No new status requests sent";
  else if (names.length === 0) title = `Asked ${asked.length} ${asked.length === 1 ? "person" : "people"}`;
  else title = `Asked ${joinNames(unnamed > 0 ? [...names, `${unnamed} more`] : names)}`;

  const pending = res.items.filter((i) => i.reason === "already_pending").map((i) => first(i.owner_name) ?? "Someone");
  const own = res.items.some((i) => i.reason === "own_action");
  const gone = res.items.filter((i) => i.reason === "not_open" || i.reason === "not_found" || i.reason === "no_owner").length;
  const notes: string[] = [];
  if (pending.length > 0) notes.push(`${joinNames(pending)} already ${pending.length === 1 ? "has" : "have"} a request waiting.`);
  if (own) notes.push("Tasks you own were left out.");
  if (gone > 0) notes.push(`${gone} ${gone === 1 ? "task is" : "tasks are"} closed or has no owner.`);
  return { title, detail: notes.length ? notes.join(" ") : null };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 3", or "Oct 3, 2025" when it is not this year. Local time: this runs in the browser. */
export function shortDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}
