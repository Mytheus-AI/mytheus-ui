/**
 * The moment an agent result points at (polish program, Phase 1: "cards tied to the moment" and
 * "one card per moment").
 *
 * Every live result can say where it came from: the words that were said (`quote`), who said
 * them (`speaker_id`, `speaker_label`), when on the meeting timeline (`start_ms`, `end_ms`, the
 * clock `transcript_chunks.start_ms` and the captions use) and a one-line `why`. Every result the
 * agents produced from one moment shares a `moment_id`, so a decision, a task, your note and your
 * promise from one sentence render as ONE card. `realtime-gateway` forwards these fields only when
 * present: snake_case inside candidate and suggestion items, camelCase on a note payload. A
 * result from before they existed (or a re-hydrated core-api row, which carries `moment_id` and
 * `why` at most) still has its window id, `{meeting_id}:{start_ms}`, so it still has a time.
 *
 * Pure: no React, no imports beyond types.
 */

import type { Candidate } from "./candidates.ts";
import type { LiveNote, NoteCommitment } from "./notes.ts";

export interface Moment {
  /** Shared by every result from one moment. */
  momentId: string | null;
  /** "Why you're seeing this". */
  why: string | null;
  /** The words that were said, verbatim. */
  quote: string | null;
  /** The speaker's internal user id, when known. */
  speakerId: string | null;
  /** The speaker's name as the agent wrote it ("Maya Chen", or "Participant 2" when unknown). */
  speakerLabel: string | null;
  /** On the meeting timeline, in ms. */
  startMs: number | null;
  endMs: number | null;
}

export const emptyMoment: Moment = {
  momentId: null,
  why: null,
  quote: null,
  speakerId: null,
  speakerLabel: null,
  startMs: null,
  endMs: null,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHY_MAX = 200;
const QUOTE_MAX = 300;
const LABEL_MAX = 80;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function uuid(v: unknown): string | null {
  return typeof v === "string" && UUID.test(v) ? v : null;
}

function ms(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

/** The start of a window id `{meeting_id}:{start_ms}`, or null when it has none. */
export function windowStartMs(windowId: string | null | undefined): number | null {
  if (!windowId) return null;
  const i = windowId.lastIndexOf(":");
  if (i < 0) return null;
  const tail = windowId.slice(i + 1);
  if (!/^\d+$/.test(tail)) return null;
  return ms(Number(tail));
}

/**
 * The moment of one result, from either spelling of its fields (snake_case items, camelCase
 * notes). Without a start of its own it falls back to its window's start.
 */
export function readMoment(raw: unknown, windowId?: string | null): Moment {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pick = (snake: string, camel: string) => (r[snake] !== undefined ? r[snake] : r[camel]);
  const startMs = ms(pick("start_ms", "startMs")) ?? windowStartMs(windowId);
  const end = ms(pick("end_ms", "endMs"));
  return {
    momentId: uuid(pick("moment_id", "momentId")),
    why: text(r.why, WHY_MAX),
    quote: text(r.quote, QUOTE_MAX),
    speakerId: uuid(pick("speaker_id", "speakerId")),
    speakerLabel: text(pick("speaker_label", "speakerLabel"), LABEL_MAX),
    startMs,
    endMs: end !== null && (startMs === null || end >= startMs) ? end : null,
  };
}

/** Fill the gaps of `base` from `extra` (a re-hydrate must never erase what the live event said). */
export function mergeMoment(base: Moment | undefined, extra: Moment | undefined): Moment {
  const a = base ?? emptyMoment;
  const b = extra ?? emptyMoment;
  return {
    momentId: a.momentId ?? b.momentId,
    why: a.why ?? b.why,
    quote: a.quote ?? b.quote,
    speakerId: a.speakerId ?? b.speakerId,
    speakerLabel: a.speakerLabel ?? b.speakerLabel,
    startMs: a.startMs ?? b.startMs,
    endMs: a.endMs ?? b.endMs,
  };
}

/** Whether there is anything to point at: a quote or a time. */
export function hasMoment(m: Moment | null | undefined): m is Moment {
  return Boolean(m && (m.quote || m.startMs !== null));
}

/* ---------------------------------------------------------------- one card per moment */

/** A promise you made in the meeting, from your note's commitments (private to you). */
export interface LivePromise {
  /** `{windowId}#{index}`: stable across re-renders, the key the UI keeps its state under. */
  key: string;
  windowId: string;
  content: string;
  dueHint: string | null;
  momentId: string | null;
}

export type MomentPart =
  | { kind: "decision" | "action"; candidate: Candidate }
  | { kind: "promise"; promise: LivePromise }
  | { kind: "note"; note: LiveNote };

export interface MomentCard {
  /** The moment id, or the single candidate's id when the result has no moment. */
  key: string;
  moment: Moment;
  /** Decisions, then tasks, then your promise, then your note. */
  parts: MomentPart[];
  /** A part was updated in place by the agent (an update, never a second card). */
  updated: boolean;
  /** Arrival order of the card's first candidate, so the list is stable. */
  seq: number;
  /** How many parts still wait for a person (the candidates). */
  pending: number;
}

/** Every promise in a note, keyed so the UI can track it. */
export function notePromises(note: LiveNote): LivePromise[] {
  return (note.commitments ?? []).map((c: NoteCommitment, i) => ({
    key: `${note.windowId}#${i}`,
    windowId: note.windowId,
    content: c.content,
    dueHint: c.dueHint ?? null,
    momentId: c.momentId ?? note.moment?.momentId ?? null,
  }));
}

const KIND_ORDER = { decision: 0, action: 1, promise: 2, note: 3 } as const;

/**
 * The cards that need a person: one per moment. Only decision and action candidates open a card
 * (they wait for a confirm); your note and your promise from the same moment join that card as
 * linked rows. A candidate without a moment is a card of its own, exactly as before.
 */
export function momentCards(candidates: readonly Candidate[], notes: readonly LiveNote[] = []): MomentCard[] {
  const cards = new Map<string, MomentCard>();
  for (const c of candidates) {
    const m = c.moment ?? emptyMoment;
    const key = m.momentId ?? c.id;
    const existing = cards.get(key);
    const part: MomentPart = { kind: c.kind, candidate: c };
    if (existing) {
      existing.parts.push(part);
      existing.moment = mergeMoment(existing.moment, m);
      existing.updated = existing.updated || Boolean(c.updatedAt);
      existing.seq = Math.min(existing.seq, c.seq);
      existing.pending += 1;
    } else {
      cards.set(key, { key, moment: { ...m }, parts: [part], updated: Boolean(c.updatedAt), seq: c.seq, pending: 1 });
    }
  }
  for (const n of notes) {
    if (!n.final) continue;
    const noteMoment = n.moment?.momentId ?? null;
    if (noteMoment && cards.has(noteMoment)) {
      const card = cards.get(noteMoment)!;
      card.parts.push({ kind: "note", note: n });
      card.moment = mergeMoment(card.moment, n.moment);
    }
    for (const p of notePromises(n)) {
      if (p.momentId && cards.has(p.momentId)) cards.get(p.momentId)!.parts.push({ kind: "promise", promise: p });
    }
  }
  const out = Array.from(cards.values());
  for (const card of out) card.parts.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  return out.sort((a, b) => a.seq - b.seq);
}

/** The moment ids that already have a card, so the notes list can say "on a card above". */
export function cardMomentIds(cards: readonly MomentCard[]): Set<string> {
  const ids = new Set<string>();
  for (const c of cards) if (c.moment.momentId) ids.add(c.moment.momentId);
  return ids;
}

/** One headline for a card from what it holds: "Decision and task", "Task", "2 decisions". */
export function momentHeadline(card: MomentCard): string {
  const decisions = card.parts.filter((p) => p.kind === "decision").length;
  const actions = card.parts.filter((p) => p.kind === "action").length;
  const part = (n: number, one: string, many: string) => (n === 0 ? null : n === 1 ? one : `${n} ${many}`);
  const bits = [part(decisions, "Decision", "decisions"), part(actions, decisions ? "task" : "Task", "tasks")].filter(
    (b): b is string => b !== null,
  );
  if (bits.length === 0) return "From this moment";
  const [first, ...rest] = bits;
  const cap = first.charAt(0).toUpperCase() + first.slice(1);
  return rest.length ? `${cap} and ${rest.join(" and ")}` : cap;
}

/* ---------------------------------------------------------------- the transcript at a moment */

export interface TimedLine {
  chunkId: string;
  startMs: number;
  endMs: number;
  isFinal: boolean;
}

/**
 * The transcript lines a moment points at: every final line that overlaps [start, end]; with no
 * end, the line spoken at the start (the last one that began at or before it, or the first one
 * after it when the moment is earlier than every line). Empty when there is nothing to point at.
 */
export function momentLines(lines: readonly TimedLine[], startMs: number | null, endMs: number | null = null): string[] {
  if (startMs === null) return [];
  const finals = lines.filter((l) => l.isFinal).sort((a, b) => a.startMs - b.startMs);
  if (finals.length === 0) return [];
  if (endMs !== null && endMs > startMs) {
    const hit = finals.filter((l) => l.startMs < endMs && l.endMs > startMs).map((l) => l.chunkId);
    if (hit.length) return hit;
  }
  let best: TimedLine | null = null;
  for (const l of finals) {
    if (l.startMs <= startMs) best = l;
    else break;
  }
  if (best && best.endMs + 15_000 < startMs) {
    // The nearest earlier line ended long before: the moment is not in the transcript yet.
    const after = finals.find((l) => l.startMs >= startMs);
    return after && after.startMs - startMs <= 15_000 ? [after.chunkId] : [];
  }
  if (!best) {
    const first = finals[0];
    return first.startMs - startMs <= 15_000 ? [first.chunkId] : [];
  }
  return [best.chunkId];
}
