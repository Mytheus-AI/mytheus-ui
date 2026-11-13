/**
 * The calm sidebar (polish program, Phase 1: "a single Now slot with a queue, Needs you pinned on
 * top, notes folded under the current agenda item, suggestions held while you are speaking, saved
 * questions as a count").
 *
 * Three pure decisions the sidebar renders:
 *   - `needsYouQueue`: everything waiting for you, most important first. The first entry is the
 *     Now slot; the rest is the queue behind a count.
 *   - `heldSuggestions`: while you are speaking, suggestions that arrive wait; they are released
 *     after a short pause, so a card never lands under your eyes mid-sentence.
 *   - `notesByAgenda`: your notes filed under the agenda item they were said in.
 *
 * Pure: no React, no imports beyond types.
 */

import type { Alert } from "./alerts.ts";
import type { ContextFill } from "./contextFills.ts";
import type { LiveNote } from "./notes.ts";
import type { Suggestion } from "./suggestions.ts";
import type { MomentCard } from "./moments.ts";
import { windowStartMs } from "./moments.ts";

/* ---------------------------------------------------------------- Now and the queue */

export type QueueEntry =
  | { type: "alert"; key: string; rank: number; alert: Alert }
  | { type: "moment"; key: string; rank: number; card: MomentCard }
  | { type: "suggestion"; key: string; rank: number; suggestion: Suggestion }
  | { type: "context"; key: string; rank: number; fill: ContextFill };

/**
 * Rank, lower first. Priority-1 alerts are not here: they are the red banner pinned above
 * everything. Then: an "act now" question, an amber alert, cards that wait for a confirm (shared
 * with the room, so they matter to everyone), "attention" questions, blue alerts and context for
 * you, the informational questions, and last the cards that wait for someone else (you can see
 * them, but only their owner can settle them: ownership.ts).
 */
export const RANK = {
  suggestionHigh: 1,
  alertMedium: 2,
  moment: 3,
  suggestionMedium: 4,
  alertLow: 5,
  context: 5,
  suggestionLow: 6,
  watching: 7,
} as const;

export function needsYouQueue(input: {
  alerts: readonly Alert[];
  moments: readonly MomentCard[];
  suggestions: readonly Suggestion[];
  fills?: readonly ContextFill[];
  /** Whether a card holds something YOU can settle; a card that only waits for others sinks. */
  mine?: (card: MomentCard) => boolean;
}): QueueEntry[] {
  const out: Array<QueueEntry & { order: number }> = [];
  let order = 0;
  for (const a of input.alerts) {
    if (a.priority === 1) continue;
    out.push({ type: "alert", key: `alert:${a.id}`, rank: a.priority === 2 ? RANK.alertMedium : RANK.alertLow, alert: a, order: order++ });
  }
  for (const card of input.moments) {
    const rank = !input.mine || input.mine(card) ? RANK.moment : RANK.watching;
    out.push({ type: "moment", key: `moment:${card.key}`, rank, card, order: order++ });
  }
  for (const s of input.suggestions) {
    const rank = s.priority === 1 ? RANK.suggestionHigh : s.priority === 2 ? RANK.suggestionMedium : RANK.suggestionLow;
    out.push({ type: "suggestion", key: `suggestion:${s.id}`, rank, suggestion: s, order: order++ });
  }
  for (const f of input.fills ?? []) {
    out.push({ type: "context", key: `context:${f.id}`, rank: RANK.context, fill: f, order: order++ });
  }
  out.sort((a, b) => a.rank - b.rank || a.order - b.order);
  return out.map((e) => {
    const copy: Partial<typeof e> = { ...e };
    delete copy.order;
    return copy as QueueEntry;
  });
}

/** Whether an entry is urgent: it must never sit below the fold or behind a closed queue. */
export function isUrgent(e: QueueEntry): boolean {
  return e.rank <= RANK.alertMedium;
}

/* ---------------------------------------------------------------- held while you speak */

/** After you stop speaking, held suggestions wait this long before they land. */
export const SPEAKING_PAUSE_MS = 2500;

/**
 * What to show while you speak: only the suggestions that were already released (on screen before
 * you started). Not speaking: everything, and everything becomes released.
 */
export function heldSuggestions<T extends { id: string }>(
  current: readonly T[],
  released: ReadonlySet<string>,
  holding: boolean,
): { shown: T[]; held: T[] } {
  if (!holding) return { shown: [...current], held: [] };
  const shown: T[] = [];
  const held: T[] = [];
  for (const s of current) (released.has(s.id) ? shown : held).push(s);
  return { shown, held };
}

/* ---------------------------------------------------------------- notes under the agenda */

/** The agenda fields this needs; `started_at` is used when the room knows it. */
export interface AgendaLike {
  id: string;
  position: number;
  title: string;
  status: string;
  updated_at?: string | null;
  started_at?: string | null;
}

export interface NoteGroup {
  /** The agenda item id, or "other" for notes outside the agenda. */
  key: string;
  title: string;
  status: string | null;
  /** The item in progress now: open by default, and where new notes land. */
  current: boolean;
  notes: LiveNote[];
}

function offset(iso: string | null | undefined, startedMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t - startedMs : null;
}

export function noteTime(n: LiveNote): number {
  return n.moment?.startMs ?? windowStartMs(n.windowId) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Files each note under the agenda item it was said in. Covered items close a stretch of the
 * meeting when they were marked covered (their `updated_at`), in that order; what comes after the
 * last covered item belongs to the item in progress, or to "Other notes" when none is. Without a
 * meeting start or an agenda, everything is one list. The item in progress is always listed, even
 * before its first note, so you can see where notes will land.
 */
export function notesByAgenda(
  notes: readonly LiveNote[],
  items: readonly AgendaLike[],
  startedAtIso: string | null,
): NoteGroup[] {
  const sorted = [...notes].sort((a, b) => noteTime(a) - noteTime(b));
  const startedMs = startedAtIso ? Date.parse(startedAtIso) : NaN;
  const agenda = [...items].sort((a, b) => a.position - b.position);
  if (agenda.length === 0 || !Number.isFinite(startedMs)) {
    return sorted.length ? [{ key: "other", title: "My notes", status: null, current: true, notes: sorted }] : [];
  }
  const current = agenda.find((i) => i.status === "in_progress") ?? null;
  const covered = agenda
    .filter((i) => i.status === "covered")
    .map((i) => ({ item: i, end: offset(i.updated_at, startedMs) }))
    .filter((c): c is { item: AgendaLike; end: number } => c.end !== null)
    .sort((a, b) => a.end - b.end);
  const currentStart = current ? offset(current.started_at, startedMs) : null;

  const groups = new Map<string, NoteGroup>();
  const group = (item: AgendaLike | null): NoteGroup => {
    const key = item?.id ?? "other";
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        title: item?.title ?? "Other notes",
        status: item?.status ?? null,
        current: Boolean(item && current && item.id === current.id),
        notes: [],
      };
      groups.set(key, g);
    }
    return g;
  };
  if (current) group(current);

  for (const n of sorted) {
    const t = noteTime(n);
    let home: AgendaLike | null = null;
    if (current && currentStart !== null && t >= currentStart) home = current;
    else {
      const closed = covered.find((c) => t <= c.end);
      home = closed ? closed.item : current;
    }
    group(home).notes.push(n);
  }

  const rank = (g: NoteGroup) => (g.key === "other" ? Number.MAX_SAFE_INTEGER : (agenda.find((i) => i.id === g.key)?.position ?? 0));
  return Array.from(groups.values()).sort((a, b) => rank(a) - rank(b));
}
