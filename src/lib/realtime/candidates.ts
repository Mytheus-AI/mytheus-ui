/**
 * Decision and action candidates in the meeting room (Plan 7-9 section 3.8 step 1).
 *
 * Two sources feed this, merged by candidate id:
 *   - live: "agent-candidate" { meetingId, payload: { windowId, agent, kind, candidates: [...] } },
 *     sent by `realtime-gateway` to everyone in the meeting (mytheus-docs ADR-0031 D4);
 *   - re-hydrate: `GET /api/v1/meetings/{id}/candidates` on every (re)connect, the still-proposed,
 *     surfaced rows `core-api` holds.
 *
 * The candidate id is the same in both (ADR-0031 D3), so a candidate that arrives live and again
 * from the re-hydrate renders once. A candidate this participant has confirmed or dismissed is
 * remembered in `resolved` and never comes back, even if a stale source repeats it.
 *
 * Nothing here commits anything. Confirm is a server action against `core-api`; this only
 * decides what the sidebar shows.
 */

export type CandidateKind = "decision" | "action";

export interface Candidate {
  id: string;
  kind: CandidateKind;
  content: string;
  confidence: number;
  /** Decision only. */
  rationale?: string | null;
  /** Action only: internal `users.id`. */
  assigneeId?: string | null;
  /** Action only: ISO date, YYYY-MM-DD. */
  dueDate?: string | null;
  /** `{meeting_id}:{start_ms}` for a live candidate; absent for a re-hydrated one. */
  windowId?: string;
  /** Arrival order, so the list is stable. */
  seq: number;
}

export interface CandidatesState {
  byId: Record<string, Candidate>;
  resolved: Record<string, "confirmed" | "dismissed">;
  nextSeq: number;
}

export const emptyCandidatesState: CandidatesState = { byId: {}, resolved: {}, nextSeq: 0 };

/** The live socket payload, as `realtime-gateway` forwards it. */
export interface CandidateEventPayload {
  windowId: string;
  agent: string;
  kind: string;
  candidates: Array<{
    id: string;
    content: string;
    confidence: number;
    rationale?: string | null;
    assignee_id?: string | null;
    due_date?: string | null;
  }>;
}

/** A `core-api` row, as the re-hydrate route returns it. */
export interface CandidateRow {
  id: string;
  content: string;
  confidence: number;
  status?: string;
  rationale?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function kindOf(kind: string): CandidateKind | null {
  if (kind === "decision_candidate") return "decision";
  if (kind === "action_candidate") return "action";
  return null;
}

function add(state: CandidatesState, incoming: Omit<Candidate, "seq">[]): CandidatesState {
  let byId = state.byId;
  let nextSeq = state.nextSeq;
  for (const c of incoming) {
    if (!UUID.test(c.id) || !c.content?.trim()) continue;
    if (state.resolved[c.id] || byId[c.id]) continue;
    if (byId === state.byId) byId = { ...state.byId };
    byId[c.id] = { ...c, seq: nextSeq++ };
  }
  return byId === state.byId ? state : { ...state, byId, nextSeq };
}

export function applyLiveCandidates(state: CandidatesState, p: CandidateEventPayload): CandidatesState {
  const kind = kindOf(p?.kind);
  if (!kind || !Array.isArray(p.candidates)) return state;
  return add(
    state,
    p.candidates.map((c) => ({
      id: c.id,
      kind,
      content: c.content,
      confidence: c.confidence,
      rationale: kind === "decision" ? (c.rationale ?? null) : undefined,
      assigneeId: kind === "action" ? (c.assignee_id ?? null) : undefined,
      dueDate: kind === "action" ? (c.due_date ?? null) : undefined,
      windowId: p.windowId,
    })),
  );
}

export function hydrateCandidates(
  state: CandidatesState,
  body: { decisions?: CandidateRow[]; actions?: CandidateRow[] },
): CandidatesState {
  const rows = (rs: CandidateRow[] | undefined, kind: CandidateKind) =>
    (rs ?? [])
      .filter((r) => !r.status || r.status === "proposed")
      .map((r) => ({
        id: r.id,
        kind,
        content: r.content,
        confidence: r.confidence,
        rationale: kind === "decision" ? (r.rationale ?? null) : undefined,
        assigneeId: kind === "action" ? (r.assignee_id ?? null) : undefined,
        dueDate: kind === "action" ? (r.due_date ?? null) : undefined,
      }));
  return add(state, [...rows(body.decisions, "decision"), ...rows(body.actions, "action")]);
}

/** Confirmed or dismissed here: gone for good. */
export function resolveCandidate(
  state: CandidatesState,
  id: string,
  outcome: "confirmed" | "dismissed",
): CandidatesState {
  if (state.resolved[id] === outcome && !state.byId[id]) return state;
  const byId = { ...state.byId };
  delete byId[id];
  return { ...state, byId, resolved: { ...state.resolved, [id]: outcome } };
}

/** After an edit: the server's row is the truth. */
export function updateCandidate(
  state: CandidatesState,
  id: string,
  patch: Partial<Pick<Candidate, "content" | "rationale" | "assigneeId" | "dueDate">>,
): CandidatesState {
  const current = state.byId[id];
  if (!current) return state;
  return { ...state, byId: { ...state.byId, [id]: { ...current, ...patch } } };
}

export function orderedCandidates(state: CandidatesState): Candidate[] {
  return Object.values(state.byId).sort((a, b) => a.seq - b.seq);
}
