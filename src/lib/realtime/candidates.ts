/**
 * Decision and action candidates in the meeting room (Plan 7-9 section 3.8 step 1), as one shared
 * ledger for everyone in the meeting (polish program, Phase 0).
 *
 * Sources, merged by candidate id:
 *   - live: "agent-candidate" { meetingId, payload: { windowId, agent, kind, candidates: [...] } },
 *     sent by `realtime-gateway` to everyone in the meeting (mytheus-docs ADR-0031 D4);
 *   - re-hydrate: `GET /api/v1/meetings/{id}/candidates?include_resolved=true` on every
 *     (re)connect: the still-proposed, surfaced rows plus the meeting's confirmed ones;
 *   - the room ledger: "candidate-resolution" { candidateId, kind, outcome, byUserId, at, row },
 *     which the gateway sends to everyone only after it re-read core-api's row with the actor's
 *     token, so "Confirmed by Maya" on Raj's screen is what core-api holds;
 *   - edit locks: "candidate-lock" { candidateId, byUserId | null, until } and the "room-state"
 *     snapshot on join.
 *
 * The candidate id is the same everywhere (ADR-0031 D3), so a card renders once. A candidate that
 * is confirmed or dismissed (by anyone, for everyone) is remembered in `resolved` and never comes
 * back, even if a stale source repeats it. Confirmed ones move into `decided`, the meeting's live
 * Decisions and Actions. A card someone hid for themselves ("Hide for me") is in `hidden`: it
 * stays open for everyone else.
 *
 * Each candidate carries its moment (polish program, Phase 1; see moments.ts): the quote, the
 * speaker, the time and a `moment_id` shared with the other results of that moment. An agent may
 * UPDATE a candidate instead of proposing a second one: the live event re-sends the existing id
 * with `updates_candidate_id` set to it, and the card is replaced in place (`updatedAt` marks it).
 * Should a producer ever name a different id it updates, the old card is replaced by the new one
 * at the old card's place and the old id never comes back (`superseded`).
 *
 * Nothing here commits anything. Confirm is a server action against `core-api`; this only decides
 * what the sidebar shows. Pure: no React.
 */

import { emptyMoment, mergeMoment, readMoment, type Moment } from "./moments.ts";

export type CandidateKind = "decision" | "action";
export type CandidateOutcome = "confirmed" | "edited" | "dismissed";

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
  /** The last person who edited the draft, and when (from the room ledger). */
  editedBy?: { userId: string; at: string } | null;
  /** Where it was said: quote, speaker, time, the shared moment id and the "why" line. */
  moment?: Moment;
  /** This client's clock (ms) when the agent last updated the card in place. */
  updatedAt?: number;
}

/** A confirmed decision or action of this meeting: the live Decisions and Actions. */
export interface Decided {
  id: string;
  kind: CandidateKind;
  content: string;
  rationale?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  /** Internal user id of who confirmed it, when known. */
  confirmedBy: string | null;
  /** When it was confirmed here, when known (ISO). */
  at: string | null;
  seq: number;
}

/** What just happened to a card, shown in place for a few seconds ("Confirmed by Maya"). */
export interface Settlement {
  id: string;
  kind: CandidateKind;
  outcome: "confirmed" | "dismissed";
  content: string;
  byUserId: string;
  at: string;
  /** Local clock (ms) when this client learned it; drives the fade-out. */
  seenAt: number;
}

export interface CandidateLock {
  byUserId: string;
  until: number;
}

export interface CandidatesState {
  byId: Record<string, Candidate>;
  resolved: Record<string, "confirmed" | "dismissed">;
  nextSeq: number;
  /** Hidden by this participant only ("Hide for me"). Everyone else still sees the card. */
  hidden: Record<string, true>;
  /** Someone is editing this card right now. */
  locks: Record<string, CandidateLock>;
  /** Confirmed by anyone in the meeting: the live Decisions and Actions. */
  decided: Record<string, Decided>;
  /** Recently settled cards, shown in place for a moment. */
  settled: Record<string, Settlement>;
  /** Ids an update replaced with another id: never shown again. */
  superseded?: Record<string, true>;
}

export const emptyCandidatesState: CandidatesState = {
  byId: {},
  resolved: {},
  nextSeq: 0,
  hidden: {},
  locks: {},
  decided: {},
  settled: {},
};

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
    /** The moment (see moments.ts); `updates_candidate_id` replaces that card in place. */
    moment_id?: string;
    why?: string;
    updates_candidate_id?: string;
    quote?: string;
    speaker_id?: string;
    speaker_label?: string;
    start_ms?: number;
    end_ms?: number;
  }>;
}

/** A `core-api` row, as the re-hydrate returns it. */
export interface CandidateRow {
  id: string;
  content: string;
  confidence: number;
  status?: string;
  rationale?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
  confirmed_by?: string | null;
  created_at?: string | null;
  /** The moment it came from and why it surfaced (polish program, Phase 1), when core-api has them. */
  moment_id?: string | null;
  why?: string | null;
}

/** The room ledger's "candidate-resolution" payload. */
export interface ResolutionPayload {
  candidateId: string;
  kind: CandidateKind;
  outcome: CandidateOutcome;
  byUserId: string;
  at: string;
  row: {
    status: string;
    content: string;
    rationale?: string | null;
    assigneeId?: string | null;
    dueDate?: string | null;
    confirmedBy?: string | null;
  };
}

/** The room ledger's "candidate-lock" payload. */
export interface LockPayload {
  candidateId: string;
  byUserId: string | null;
  until: number | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** How long a settled card stays in place before it folds into Activity. */
export const SETTLED_MS = 4000;

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
    if (state.resolved[c.id] || state.superseded?.[c.id]) continue;
    const existing = byId[c.id];
    if (existing) {
      // Already here (a re-hydrate after the live event): only fill in what the moment lacked.
      const moment = mergeMoment(existing.moment, c.moment);
      if (!c.moment || sameMoment(existing.moment, moment)) continue;
      if (byId === state.byId) byId = { ...state.byId };
      byId[c.id] = { ...existing, moment };
      continue;
    }
    if (byId === state.byId) byId = { ...state.byId };
    byId[c.id] = { ...c, seq: nextSeq++ };
  }
  return byId === state.byId ? state : { ...state, byId, nextSeq };
}

function sameMoment(a: Moment | undefined, b: Moment | undefined): boolean {
  const x = a ?? emptyMoment;
  const y = b ?? emptyMoment;
  return (
    x.momentId === y.momentId &&
    x.why === y.why &&
    x.quote === y.quote &&
    x.speakerId === y.speakerId &&
    x.speakerLabel === y.speakerLabel &&
    x.startMs === y.startMs &&
    x.endMs === y.endMs
  );
}

/**
 * The agent updated a card instead of proposing a new one. Same id: replace its text and moment
 * in place. Another id: the new candidate takes the old one's place and the old id is retired.
 * A card someone already settled stays settled; an update for a card this client never saw is
 * simply a new card.
 */
function applyUpdate(state: CandidatesState, c: Omit<Candidate, "seq">, targetId: string, nowMs: number): CandidatesState {
  if (!UUID.test(c.id) || !c.content?.trim()) return state;
  if (state.resolved[c.id] || state.resolved[targetId]) return state;
  const target = state.byId[targetId];
  if (!target) return add(state, [{ ...c, updatedAt: nowMs }]);
  const byId = { ...state.byId };
  const next: Candidate = {
    ...target,
    ...c,
    // An edit a person saved is never silently overwritten by the agent's older wording.
    content: target.editedBy ? target.content : c.content,
    rationale: target.editedBy ? target.rationale : c.rationale,
    dueDate: target.editedBy ? target.dueDate : c.dueDate,
    moment: mergeMoment(c.moment, target.moment),
    seq: target.seq,
    updatedAt: nowMs,
    editedBy: target.editedBy,
  };
  if (c.id !== targetId) {
    delete byId[targetId];
    byId[c.id] = next;
    return { ...state, byId, superseded: { ...(state.superseded ?? {}), [targetId]: true } };
  }
  byId[c.id] = next;
  return { ...state, byId };
}

export function applyLiveCandidates(state: CandidatesState, p: CandidateEventPayload, nowMs = Date.now()): CandidatesState {
  const kind = kindOf(p?.kind);
  if (!kind || !Array.isArray(p.candidates)) return state;
  let next = state;
  const fresh: Omit<Candidate, "seq">[] = [];
  for (const c of p.candidates) {
    if (!c || typeof c !== "object") continue;
    const candidate: Omit<Candidate, "seq"> = {
      id: c.id,
      kind,
      content: c.content,
      confidence: c.confidence,
      rationale: kind === "decision" ? (c.rationale ?? null) : undefined,
      assigneeId: kind === "action" ? (c.assignee_id ?? null) : undefined,
      dueDate: kind === "action" ? (c.due_date ?? null) : undefined,
      windowId: p.windowId,
      moment: readMoment(c, p.windowId),
    };
    const target = typeof c.updates_candidate_id === "string" && UUID.test(c.updates_candidate_id) ? c.updates_candidate_id : null;
    if (target) {
      // Keep arrival order: anything new before this update lands first.
      next = add(next, fresh.splice(0));
      next = applyUpdate(next, candidate, target, nowMs);
    } else {
      fresh.push(candidate);
    }
  }
  return add(next, fresh);
}

function decide(
  state: CandidatesState,
  d: Omit<Decided, "seq">,
): CandidatesState {
  if (!UUID.test(d.id) || !d.content?.trim()) return state;
  const existing = state.decided[d.id];
  const seq = existing?.seq ?? state.nextSeq;
  const byId = { ...state.byId };
  delete byId[d.id];
  return {
    ...state,
    byId,
    resolved: { ...state.resolved, [d.id]: "confirmed" },
    decided: {
      ...state.decided,
      [d.id]: {
        ...d,
        confirmedBy: d.confirmedBy ?? existing?.confirmedBy ?? null,
        at: d.at ?? existing?.at ?? null,
        seq,
      },
    },
    nextSeq: existing ? state.nextSeq : state.nextSeq + 1,
  };
}

export function hydrateCandidates(
  state: CandidatesState,
  body: { decisions?: CandidateRow[]; actions?: CandidateRow[] },
): CandidatesState {
  let next = state;
  const confirmed = (rs: CandidateRow[] | undefined, kind: CandidateKind) => {
    for (const r of rs ?? []) {
      if (r.status !== "confirmed") continue;
      next = decide(next, {
        id: r.id,
        kind,
        content: r.content,
        rationale: kind === "decision" ? (r.rationale ?? null) : undefined,
        assigneeId: kind === "action" ? (r.assignee_id ?? null) : undefined,
        dueDate: kind === "action" ? (r.due_date ?? null) : undefined,
        confirmedBy: r.confirmed_by ?? null,
        at: null,
      });
    }
  };
  confirmed(body.decisions, "decision");
  confirmed(body.actions, "action");
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
        moment: r.moment_id || r.why ? readMoment({ moment_id: r.moment_id, why: r.why }) : undefined,
      }));
  return add(next, [...rows(body.decisions, "decision"), ...rows(body.actions, "action")]);
}

/** Confirmed or dismissed here, for everyone: gone for good. */
export function resolveCandidate(
  state: CandidatesState,
  id: string,
  outcome: "confirmed" | "dismissed",
): CandidatesState {
  if (state.resolved[id] === outcome && !state.byId[id]) return state;
  const current = state.byId[id];
  if (outcome === "confirmed" && current) {
    return decide(state, {
      id,
      kind: current.kind,
      content: current.content,
      rationale: current.rationale,
      assigneeId: current.assigneeId,
      dueDate: current.dueDate,
      confirmedBy: null,
      at: null,
    });
  }
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

/** "Hide for me": this participant stops seeing the card; nobody else is affected. */
export function hideCandidate(state: CandidatesState, id: string): CandidatesState {
  if (state.hidden[id]) return state;
  return { ...state, hidden: { ...state.hidden, [id]: true } };
}

/** Restore the hidden set this participant kept for this meeting (e.g. after a reload). */
export function restoreHidden(state: CandidatesState, ids: readonly string[]): CandidatesState {
  const valid = ids.filter((id) => UUID.test(id) && !state.hidden[id]);
  if (valid.length === 0) return state;
  const hidden = { ...state.hidden };
  for (const id of valid) hidden[id] = true;
  return { ...state, hidden };
}

/**
 * The room ledger: someone confirmed, edited or (as host) dismissed a card, and core-api holds it.
 * `nowMs` is this client's clock, for the in-place "Confirmed by Maya" moment.
 */
export function applyResolution(
  state: CandidatesState,
  p: ResolutionPayload | null | undefined,
  nowMs: number,
): CandidatesState {
  if (!p || !UUID.test(p.candidateId) || typeof p.byUserId !== "string" || !p.row) return state;
  if (p.kind !== "decision" && p.kind !== "action") return state;
  const id = p.candidateId;
  const locks = { ...state.locks };
  delete locks[id];
  const content = typeof p.row.content === "string" ? p.row.content : (state.byId[id]?.content ?? "");

  if (p.outcome === "edited") {
    const current = state.byId[id];
    if (!current || state.resolved[id]) return { ...state, locks };
    return {
      ...state,
      locks,
      byId: {
        ...state.byId,
        [id]: {
          ...current,
          content: content || current.content,
          rationale: p.kind === "decision" ? (p.row.rationale ?? null) : current.rationale,
          assigneeId: p.kind === "action" ? (p.row.assigneeId ?? null) : current.assigneeId,
          dueDate: p.kind === "action" ? (p.row.dueDate ?? null) : current.dueDate,
          editedBy: { userId: p.byUserId, at: p.at },
        },
      },
    };
  }

  if (p.outcome !== "confirmed" && p.outcome !== "dismissed") return state;
  const settledEntry: Settlement = {
    id,
    kind: p.kind,
    outcome: p.outcome,
    content,
    byUserId: p.byUserId,
    at: p.at,
    seenAt: nowMs,
  };
  // Already settled here with the same outcome (our own action echoed back): keep the first.
  const settled = state.settled[id] ? state.settled : { ...state.settled, [id]: settledEntry };
  if (p.outcome === "confirmed") {
    const decided = decide({ ...state, locks, settled }, {
      id,
      kind: p.kind,
      content,
      rationale: p.kind === "decision" ? (p.row.rationale ?? null) : undefined,
      assigneeId: p.kind === "action" ? (p.row.assigneeId ?? null) : undefined,
      dueDate: p.kind === "action" ? (p.row.dueDate ?? null) : undefined,
      confirmedBy: p.row.confirmedBy ?? p.byUserId,
      at: p.at,
    });
    return decided;
  }
  const byId = { ...state.byId };
  delete byId[id];
  return { ...state, byId, locks, settled, resolved: { ...state.resolved, [id]: "dismissed" } };
}

/** Mark a card settled locally (the actor's own screen), before the room echo arrives. */
export function settleLocally(
  state: CandidatesState,
  id: string,
  outcome: "confirmed" | "dismissed",
  byUserId: string,
  nowMs: number,
): CandidatesState {
  const current = state.byId[id];
  if (!current) return resolveCandidate(state, id, outcome);
  const settled = {
    ...state.settled,
    [id]: {
      id,
      kind: current.kind,
      outcome,
      content: current.content,
      byUserId,
      at: new Date(nowMs).toISOString(),
      seenAt: nowMs,
    },
  };
  const next = resolveCandidate({ ...state, settled }, id, outcome);
  if (outcome === "confirmed" && next.decided[id]) {
    return {
      ...next,
      decided: {
        ...next.decided,
        [id]: { ...next.decided[id], confirmedBy: byUserId, at: new Date(nowMs).toISOString() },
      },
    };
  }
  return next;
}

/** Someone took or released the edit lock on a card. */
export function applyLock(state: CandidatesState, p: LockPayload | null | undefined): CandidatesState {
  if (!p || !UUID.test(p.candidateId)) return state;
  const locks = { ...state.locks };
  if (p.byUserId && typeof p.until === "number") locks[p.candidateId] = { byUserId: p.byUserId, until: p.until };
  else delete locks[p.candidateId];
  return { ...state, locks };
}

/** The "room-state" snapshot on (re)join replaces every lock this client knew. */
export function applyRoomLocks(
  state: CandidatesState,
  locks: ReadonlyArray<{ candidateId: string; byUserId: string; until: number }> | null | undefined,
): CandidatesState {
  const next: Record<string, CandidateLock> = {};
  for (const l of locks ?? []) {
    if (UUID.test(l.candidateId) && typeof l.byUserId === "string" && typeof l.until === "number") {
      next[l.candidateId] = { byUserId: l.byUserId, until: l.until };
    }
  }
  return { ...state, locks: next };
}

/** Who else is editing this card right now (null when nobody, or only you, or it expired). */
export function lockedBy(state: CandidatesState, id: string, meId: string | null, nowMs: number): string | null {
  const lock = state.locks[id];
  if (!lock || lock.until <= nowMs) return null;
  if (meId && lock.byUserId === meId) return null;
  return lock.byUserId;
}

/** Drop settled moments older than `SETTLED_MS`. Returns the same state when nothing expired. */
export function expireSettled(state: CandidatesState, nowMs: number): CandidatesState {
  const stale = Object.values(state.settled).filter((s) => nowMs - s.seenAt >= SETTLED_MS);
  if (stale.length === 0) return state;
  const settled = { ...state.settled };
  for (const s of stale) delete settled[s.id];
  return { ...state, settled };
}

/** The cards waiting for a person, oldest first, without the ones you hid. */
export function orderedCandidates(state: CandidatesState): Candidate[] {
  return Object.values(state.byId)
    .filter((c) => !state.hidden[c.id])
    .sort((a, b) => a.seq - b.seq);
}

/** Cards settled a moment ago, still shown in place. */
export function recentSettlements(state: CandidatesState): Settlement[] {
  return Object.values(state.settled).sort((a, b) => a.seenAt - b.seenAt);
}

/** The meeting's confirmed decisions and actions, in the order they were confirmed. */
export function decidedItems(state: CandidatesState): { decisions: Decided[]; actions: Decided[] } {
  const all = Object.values(state.decided).sort((a, b) => a.seq - b.seq);
  return { decisions: all.filter((d) => d.kind === "decision"), actions: all.filter((d) => d.kind === "action") };
}
