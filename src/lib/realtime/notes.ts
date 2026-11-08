/**
 * The My Notes reducer: streamed drafts, settled finals, REST re-hydrate. Plan 7-9 §3.4 steps 2
 * and 4.
 *
 * Contract, from `realtime-gateway/src/server.ts` (mytheus-docs ADR-0030 D5):
 *   "agent-delta" { meetingId, payload: { windowId, seq, delta, done } }
 *   "agent-note"  { meetingId, payload: { windowId, agent, content, confidence, ... } }
 * Both are private to the participant; the gateway never sends another person's notes here.
 *
 * One note per agent window (`windowId` = `{meeting_id}:{start_ms}`). Deltas build a DRAFT for
 * that window; the final replaces it with the settled text. Deltas are disposable: the gateway
 * sheds them first under backpressure, so a missing or out-of-order delta only costs the typing
 * effect, never the note, because the final carries the whole text. A delta for a window that
 * is already final is ignored, so a late delta can never overwrite settled truth.
 *
 * Only surfaced notes ever arrive (the agent streams only surfaced-band notes, the gateway
 * forwards only surfaced finals, and the REST route returns only surfaced rows), so nothing
 * here filters on confidence.
 *
 * Ordered by the window's start time, not arrival: a re-hydrate after a reconnect brings older
 * notes in after newer live ones.
 */

export interface NoteDeltaPayload {
  windowId: string;
  seq: number;
  delta: string;
  done: boolean;
}

export interface NoteFinalPayload {
  windowId: string;
  content: string;
}

export interface LiveNote {
  windowId: string;
  text: string;
  /** false while the agent is still streaming it */
  final: boolean;
  /** highest delta seq applied, so a duplicate or stale delta is not appended twice */
  lastSeq: number;
}

export interface NotesState {
  byWindow: Record<string, LiveNote>;
}

export const emptyNotesState: NotesState = { byWindow: {} };

function startMs(windowId: string): number {
  const n = Number(windowId.slice(windowId.lastIndexOf(":") + 1));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

export function applyNoteDelta(state: NotesState, d: NoteDeltaPayload): NotesState {
  if (!d?.windowId) return state;
  const current = state.byWindow[d.windowId];
  if (current?.final) return state;
  if (current && d.seq <= current.lastSeq) return state;
  const next: LiveNote = {
    windowId: d.windowId,
    text: (current?.text ?? "") + (d.delta ?? ""),
    final: false,
    lastSeq: d.seq,
  };
  return { byWindow: { ...state.byWindow, [d.windowId]: next } };
}

export function applyNoteFinal(state: NotesState, f: NoteFinalPayload): NotesState {
  if (!f?.windowId || !f.content) return state;
  const current = state.byWindow[f.windowId];
  if (current?.final && current.text === f.content) return state;
  return {
    byWindow: {
      ...state.byWindow,
      [f.windowId]: { windowId: f.windowId, text: f.content, final: true, lastSeq: current?.lastSeq ?? -1 },
    },
  };
}

/** Durable notes from `GET /api/v1/meetings/:id/worklogs?user_id=me`, folded into what is live. */
export function hydrateNotes(state: NotesState, finals: NoteFinalPayload[]): NotesState {
  return finals.reduce(applyNoteFinal, state);
}

export function orderedNotes(state: NotesState): LiveNote[] {
  return Object.values(state.byWindow).sort((a, b) => startMs(a.windowId) - startMs(b.windowId));
}
