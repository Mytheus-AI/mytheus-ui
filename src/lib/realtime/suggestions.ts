/**
 * QuestionAgent suggestions in the meeting room (Plan 7-9 section 3.10, mytheus-docs ADR-0034).
 *
 * A suggestion is one question the agent thinks THIS participant should ask. It is private:
 * `realtime-gateway` sends "agent-suggestion" only to its owner's sockets, and `core-api` serves
 * it only to its owner. Two sources feed this, merged by suggestion id:
 *   - live: "agent-suggestion" { meetingId, payload: { windowId, agent, kind, suggestions: [...] } };
 *   - re-hydrate: `GET /api/v1/suggestions?meeting_id=` on every (re)connect, which returns this
 *     meeting's open suggestions and the caller's saved ones from ANY meeting (ADR-0034 D8), so a
 *     question saved last week shows up again here.
 *
 * The id is the same in both (ADR-0034 D3). A suggestion asked or dismissed here is remembered in
 * `resolved` and never comes back, even if a stale source repeats it.
 */

export type SuggestionPriority = 1 | 2 | 3;
export type SuggestionStatus = "open" | "saved";
export type CitationKind = "transcript" | "document" | "decision" | "action";

/** One grounding passage's citation (ADR-0033 D3). Every field but `kind` is optional. */
export interface SuggestionCitation {
  kind: CitationKind;
  meeting_id?: string | null;
  chunk_id?: string | null;
  start_ms?: number | null;
  document_id?: string | null;
  decision_id?: string | null;
  action_id?: string | null;
  title?: string | null;
}

export interface Suggestion {
  id: string;
  question: string;
  priority: SuggestionPriority;
  confidence: number;
  rationale: string | null;
  citations: SuggestionCitation[];
  status: SuggestionStatus;
  /** The meeting it was written in; absent for a live one (it is the current meeting). */
  meetingId?: string | null;
  /** Arrival order, so the list is stable. */
  seq: number;
}

export interface SuggestionsState {
  byId: Record<string, Suggestion>;
  resolved: Record<string, "asked" | "dismissed">;
  nextSeq: number;
}

export const emptySuggestionsState: SuggestionsState = { byId: {}, resolved: {}, nextSeq: 0 };

/** The live socket payload, as `realtime-gateway` forwards it. */
export interface SuggestionEventPayload {
  windowId: string;
  agent: string;
  kind: string;
  suggestions: Array<{
    id: string;
    question: string;
    priority: number;
    confidence: number;
    rationale?: string | null;
    citations?: unknown;
  }>;
}

/** A `core-api` row, as the re-hydrate route returns it. */
export interface SuggestionRow {
  id: string;
  meeting_id?: string | null;
  question: string;
  priority: number;
  status: string;
  confidence?: number | null;
  rationale?: string | null;
  citations?: unknown;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: ReadonlySet<string> = new Set(["transcript", "document", "decision", "action"]);
const MAX_CITATIONS = 5;

function priorityOf(p: unknown): SuggestionPriority | null {
  return p === 1 || p === 2 || p === 3 ? p : null;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Keeps the four known kinds and their known fields; anything else is dropped. */
export function cleanCitations(raw: unknown): SuggestionCitation[] {
  if (!Array.isArray(raw)) return [];
  const out: SuggestionCitation[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const r = c as Record<string, unknown>;
    if (typeof r.kind !== "string" || !KINDS.has(r.kind)) continue;
    out.push({
      kind: r.kind as CitationKind,
      meeting_id: str(r.meeting_id),
      chunk_id: str(r.chunk_id),
      start_ms: typeof r.start_ms === "number" && r.start_ms >= 0 ? r.start_ms : null,
      document_id: str(r.document_id),
      decision_id: str(r.decision_id),
      action_id: str(r.action_id),
      title: str(r.title),
    });
    if (out.length >= MAX_CITATIONS) break;
  }
  return out;
}

type Incoming = Omit<Suggestion, "seq">;

function normalise(
  id: unknown,
  question: unknown,
  priority: unknown,
  rest: Omit<Incoming, "id" | "question" | "priority">,
): Incoming | null {
  const p = priorityOf(priority);
  if (typeof id !== "string" || !UUID.test(id) || typeof question !== "string" || !question.trim() || !p) {
    return null;
  }
  return { id, question: question.trim(), priority: p, ...rest };
}

function upsert(state: SuggestionsState, incoming: Incoming[], overwriteStatus: boolean): SuggestionsState {
  let byId = state.byId;
  let nextSeq = state.nextSeq;
  for (const s of incoming) {
    if (state.resolved[s.id]) continue;
    const current = byId[s.id];
    if (current) {
      // The server is the truth on status: a row it says is saved is saved. It never takes a
      // saved card back to open, because a save in flight would otherwise flicker.
      if (overwriteStatus && s.status === "saved" && current.status !== "saved") {
        if (byId === state.byId) byId = { ...state.byId };
        byId[s.id] = { ...current, status: "saved", meetingId: s.meetingId ?? current.meetingId };
      }
      continue;
    }
    if (byId === state.byId) byId = { ...state.byId };
    byId[s.id] = { ...s, seq: nextSeq++ };
  }
  return byId === state.byId ? state : { ...state, byId, nextSeq };
}

export function applyLiveSuggestions(state: SuggestionsState, p: SuggestionEventPayload): SuggestionsState {
  if (p?.agent !== "QuestionAgent" || p.kind !== "suggestion" || !Array.isArray(p.suggestions)) {
    return state;
  }
  const incoming = p.suggestions
    .map((s) =>
      normalise(s?.id, s?.question, s?.priority, {
        confidence: typeof s.confidence === "number" ? s.confidence : 0,
        rationale: str(s.rationale),
        citations: cleanCitations(s.citations),
        status: "open",
      }),
    )
    .filter((s): s is Incoming => s !== null);
  return upsert(state, incoming, false);
}

export function hydrateSuggestions(
  state: SuggestionsState,
  body: { open?: SuggestionRow[]; saved?: SuggestionRow[] },
): SuggestionsState {
  const rows = (rs: SuggestionRow[] | undefined, status: SuggestionStatus) =>
    (rs ?? [])
      .filter((r) => r?.status === status)
      .map((r) =>
        normalise(r.id, r.question, r.priority, {
          confidence: typeof r.confidence === "number" ? r.confidence : 0,
          rationale: str(r.rationale),
          citations: cleanCitations(r.citations),
          status,
          meetingId: str(r.meeting_id),
        }),
      )
      .filter((s): s is Incoming => s !== null);
  return upsert(state, [...rows(body?.open, "open"), ...rows(body?.saved, "saved")], true);
}

/** Saved here: it moves to Saved for later and comes back in the next meeting. */
export function saveSuggestion(state: SuggestionsState, id: string): SuggestionsState {
  const current = state.byId[id];
  if (!current || current.status === "saved") return state;
  return { ...state, byId: { ...state.byId, [id]: { ...current, status: "saved" } } };
}

/** Asked or dismissed here (or gone on the server): gone for good. */
export function resolveSuggestion(
  state: SuggestionsState,
  id: string,
  outcome: "asked" | "dismissed",
): SuggestionsState {
  if (state.resolved[id] === outcome && !state.byId[id]) return state;
  const byId = { ...state.byId };
  delete byId[id];
  return { ...state, byId, resolved: { ...state.resolved, [id]: outcome } };
}

/** Open suggestions: most urgent first, then oldest first. */
export function openSuggestions(state: SuggestionsState): Suggestion[] {
  return Object.values(state.byId)
    .filter((s) => s.status === "open")
    .sort((a, b) => a.priority - b.priority || a.seq - b.seq);
}

/** Saved suggestions, from this meeting and earlier ones, in the order they arrived. */
export function savedSuggestions(state: SuggestionsState): Suggestion[] {
  return Object.values(state.byId)
    .filter((s) => s.status === "saved")
    .sort((a, b) => a.seq - b.seq);
}

function clock(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = String(secs % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const seg = (id: string | null | undefined) => (id && UUID.test(id) ? encodeURIComponent(id) : null);

/**
 * Where a citation points, for the card's chip. A transcript passage opens that meeting's
 * transcript; a decision opens its lineage page; an action opens its meeting (or My Tasks); a
 * document has no page in this app yet, so it is a label without a link. Ids that are not UUIDs
 * never reach an href.
 */
export function citationLink(
  c: SuggestionCitation,
  fallbackMeetingId?: string | null,
): { label: string; href: string | null } {
  const meeting = seg(c.meeting_id) ?? seg(fallbackMeetingId);
  switch (c.kind) {
    case "transcript": {
      const at = typeof c.start_ms === "number" ? ` at ${clock(c.start_ms)}` : "";
      return {
        label: `${c.title || "Transcript"}${at}`,
        href: meeting ? `/meetings/${meeting}/transcript` : null,
      };
    }
    case "decision": {
      const decision = seg(c.decision_id);
      return {
        label: c.title || "Decision",
        href: meeting && decision ? `/meetings/${meeting}/decisions/${decision}` : meeting ? `/meetings/${meeting}` : "/decisions",
      };
    }
    case "action":
      return { label: c.title || "Action", href: meeting ? `/meetings/${meeting}` : "/tasks" };
    case "document":
      return { label: c.title || "Document", href: null };
  }
}
