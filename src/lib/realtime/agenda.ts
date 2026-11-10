/**
 * The meeting's shared agenda in the room (mytheus-docs ADR-0038 D7, D9), and the host's nudges.
 *
 * Agenda: two sources, merged by item id.
 *   - re-hydrate: `GET /api/v1/meetings/{id}` (its `agenda`) on load and on every (re)connect;
 *   - live: "agent-agenda" { meetingId, payload: { itemId, status, note } } to everyone in the
 *     meeting.
 * The live rules mirror what core-api applies (D7), so the room never shows a state the server
 * will refuse: only an item of this agenda, never over a host's choice (`status_source = 'host'`,
 * the host wins), never from `covered` back to `in_progress`. An update for an item not loaded
 * yet waits in `early` and is applied by the next re-hydrate under the same rules.
 *
 * The host (or creator) marks items covered or skipped optimistically: `beginHostStatus` records
 * the item as it was, `commitHostStatus` takes the server's row, `rollbackHostStatus` puts it
 * back. Only the latest attempt per item may settle it, so a slow first click cannot undo a
 * second. While a host change is in flight the agent does not touch that item.
 *
 * Nudges: "agent-nudge" reaches the host only, and is never replayed (D9). One shows at a time;
 * more wait their turn, and an id already seen never returns.
 *
 * Pure: no React, no imports beyond types.
 */

import type {
  AgendaItem,
  AgendaStatus,
  AgentAgendaPayload,
  AgentNudgePayload,
  NudgeType,
} from "../api/meeting-agenda-types.ts";

const NOTE_MAX = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AgendaState {
  items: AgendaItem[];
  /** A re-hydrate has answered at least once (or the page was rendered with the agenda). */
  loaded: boolean;
  /** The last re-hydrate failed; what is shown may be stale. */
  stale: boolean;
  /** Host changes in flight: the item as it was before, and the attempt that may settle it. */
  pending: Record<string, { before: AgendaItem; op: number }>;
  /** Live updates for items not loaded yet, latest per item. */
  early: Record<string, AgentAgendaPayload>;
}

export const emptyAgendaState: AgendaState = { items: [], loaded: false, stale: false, pending: {}, early: {} };

function byPosition(a: AgendaItem, b: AgendaItem): number {
  return a.position - b.position;
}

/** The agenda the server rendered with the page. */
export function initialAgendaState(items: AgendaItem[] | null | undefined): AgendaState {
  if (!items) return emptyAgendaState;
  return { ...emptyAgendaState, items: [...items].sort(byPosition), loaded: true };
}

/** Whether a live agent update may change `item` (D7's consumer rules). */
export function agentMayApply(item: AgendaItem, status: AgendaStatus): boolean {
  if (status !== "in_progress" && status !== "covered") return false;
  if (item.status_source === "host") return false;
  if (item.status === "covered" && status === "in_progress") return false;
  return true;
}

function withAgentUpdate(item: AgendaItem, p: AgentAgendaPayload): AgendaItem {
  const note = typeof p.note === "string" && p.note.trim() ? p.note.trim().slice(0, NOTE_MAX) : item.agent_note;
  return { ...item, status: p.status, status_source: "agent", agent_note: note };
}

/** "agent-agenda": one item's status from the MeetingAgent. */
export function applyAgentAgenda(state: AgendaState, p: AgentAgendaPayload | null | undefined): AgendaState {
  if (!p || typeof p.itemId !== "string" || !UUID.test(p.itemId)) return state;
  if (p.status !== "in_progress" && p.status !== "covered") return state;
  const i = state.items.findIndex((it) => it.id === p.itemId);
  if (i < 0) {
    // Not loaded yet (the event beat the re-hydrate). Keep the latest for that item.
    return { ...state, early: { ...state.early, [p.itemId]: p } };
  }
  if (state.pending[p.itemId]) return state;
  const item = state.items[i];
  if (!agentMayApply(item, p.status)) return state;
  const items = [...state.items];
  items[i] = withAgentUpdate(item, p);
  return { ...state, items };
}

/**
 * A re-hydrate answered. The server's rows are the truth, with two exceptions that keep a
 * correct live view from flickering backwards while core-api catches up with the same event:
 *   - an item covered by the agent here stays covered unless the server row is the host's;
 *   - an item with a host change in flight keeps the optimistic status until that settles.
 * Early live updates for items that now exist are applied under the agent rules.
 */
export function hydrateAgenda(state: AgendaState, rows: AgendaItem[] | null | undefined): AgendaState {
  if (!Array.isArray(rows)) return { ...state, stale: true };
  const local = new Map(state.items.map((it) => [it.id, it]));
  const early = { ...state.early };
  const pending: AgendaState["pending"] = {};
  const items = [...rows].sort(byPosition).map((row) => {
    const mine = local.get(row.id);
    const inFlight = state.pending[row.id];
    if (inFlight && mine) {
      pending[row.id] = inFlight;
      return { ...row, status: mine.status, status_source: mine.status_source };
    }
    let next = row;
    if (
      mine &&
      mine.status === "covered" &&
      mine.status_source === "agent" &&
      row.status_source !== "host" &&
      row.status !== "covered"
    ) {
      next = { ...row, status: "covered", status_source: "agent", agent_note: mine.agent_note ?? row.agent_note };
    }
    const waiting = early[row.id];
    if (waiting) {
      delete early[row.id];
      if (agentMayApply(next, waiting.status)) next = withAgentUpdate(next, waiting);
    }
    return next;
  });
  return { items, loaded: true, stale: false, pending, early };
}

/** The host marks an item (optimistic). `op` identifies this attempt. */
export function beginHostStatus(state: AgendaState, itemId: string, status: AgendaStatus, op: number): AgendaState {
  const i = state.items.findIndex((it) => it.id === itemId);
  if (i < 0) return state;
  const before = state.pending[itemId]?.before ?? state.items[i];
  const items = [...state.items];
  items[i] = { ...state.items[i], status, status_source: "host" };
  return { ...state, items, pending: { ...state.pending, [itemId]: { before, op } } };
}

/** The server accepted attempt `op`: its row is the truth. A superseded attempt changes nothing. */
export function commitHostStatus(state: AgendaState, itemId: string, op: number, row: AgendaItem | null): AgendaState {
  const inFlight = state.pending[itemId];
  if (!inFlight || inFlight.op !== op) return state;
  const pending = { ...state.pending };
  delete pending[itemId];
  const items = row ? state.items.map((it) => (it.id === itemId ? { ...row, position: it.position } : it)) : state.items;
  return { ...state, items, pending };
}

/** The server refused attempt `op`: put the item back as it was. A superseded attempt changes nothing. */
export function rollbackHostStatus(state: AgendaState, itemId: string, op: number): AgendaState {
  const inFlight = state.pending[itemId];
  if (!inFlight || inFlight.op !== op) return state;
  const pending = { ...state.pending };
  delete pending[itemId];
  return { ...state, items: state.items.map((it) => (it.id === itemId ? inFlight.before : it)), pending };
}

/** How far along the agenda is: covered or skipped, of all. */
export function agendaProgress(items: AgendaItem[]): { done: number; total: number } {
  return { done: items.filter((it) => it.status === "covered" || it.status === "skipped").length, total: items.length };
}

/* ---------------------------------------------------------------- nudges (host only) */

export interface Nudge {
  id: string;
  type: NudgeType;
  itemId: string | null;
  content: string;
}

export interface NudgeState {
  current: Nudge | null;
  queue: Nudge[];
  seen: Record<string, true>;
}

export const emptyNudgeState: NudgeState = { current: null, queue: [], seen: {} };

const NUDGE_TYPES = new Set<NudgeType>(["off_agenda", "over_time", "unaddressed"]);
const QUEUE_MAX = 5;

export function applyNudge(state: NudgeState, p: AgentNudgePayload | null | undefined): NudgeState {
  if (!p || typeof p.id !== "string" || !p.id || state.seen[p.id]) return state;
  if (!NUDGE_TYPES.has(p.type)) return state;
  const content = typeof p.content === "string" ? p.content.trim().slice(0, 200) : "";
  if (!content) return state;
  const nudge: Nudge = {
    id: p.id,
    type: p.type,
    itemId: typeof p.itemId === "string" && UUID.test(p.itemId) ? p.itemId : null,
    content,
  };
  const seen = { ...state.seen, [p.id]: true as const };
  if (!state.current) return { ...state, current: nudge, seen };
  return { ...state, queue: [...state.queue, nudge].slice(-QUEUE_MAX), seen };
}

/** The host dismissed the one showing: the next waiting one takes its place. */
export function dismissNudge(state: NudgeState, id: string): NudgeState {
  if (state.current?.id !== id) return state;
  const [next = null, ...rest] = state.queue;
  return { ...state, current: next, queue: rest };
}

/** The frozen priority language: over time needs attention (amber), the rest inform (blue). */
export function nudgeTone(type: NudgeType): "medium" | "low" {
  return type === "over_time" ? "medium" : "low";
}

export const NUDGE_LABEL: Record<NudgeType, string> = {
  over_time: "Running over",
  off_agenda: "Off the agenda",
  unaddressed: "Still open from last time",
};
