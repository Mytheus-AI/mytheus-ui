/**
 * ContextGapAgent context fills in the meeting room (Phase P10, plan 3.5, P10 contract 7 and 8).
 *
 * A fill is context the agent found for THIS participant when the conversation referred to
 * something they did not have: from a teammate's Myte (hop `peer` or `related_meeting`) or from
 * their own knowledge base (hop `rag`). It is private: `realtime-gateway` sends "agent-context"
 * only to the requester's sockets, and `core-api` serves it only to the requester. Two sources
 * feed this, merged by fill id:
 *   - live: "agent-context" { meetingId, payload: { id, meetingId, content, confidence,
 *     rationale, hop, responder, citations, createdAt } }, where responder is "user:{uuid}" or
 *     "rag" (a raw id, which the card names from the room's member list);
 *   - re-hydrate: `GET /api/v1/meetings/{id}/context-fills` on every (re)connect, which returns
 *     the caller's surfaced, non-dismissed fills with a server-resolved responder label.
 *
 * A fill dismissed here is remembered in `dismissed` and never comes back, even if a stale source
 * repeats it. Citations reuse the P9 suggestion cleaner and `citationLink`.
 */

// The ".ts" extension lets `node --experimental-strip-types` (npm test) resolve the sibling.
import { cleanCitations, type SuggestionCitation } from "./suggestions.ts";

export type ContextHop = "peer" | "related_meeting" | "rag";

export interface ContextFill {
  id: string;
  content: string;
  confidence: number;
  rationale: string | null;
  hop: ContextHop;
  /** The responder's internal user id, for a peer or related-meeting fill (never for rag). */
  responderUserId: string | null;
  /** The server's label for the responder ("Bob Lee", "Knowledge base"), from re-hydrate. */
  responderLabel: string | null;
  citations: SuggestionCitation[];
  createdAt: string | null;
  /** Arrival order, so the list is stable. */
  seq: number;
}

export interface ContextFillsState {
  byId: Record<string, ContextFill>;
  dismissed: Record<string, true>;
  nextSeq: number;
}

export const emptyContextFillsState: ContextFillsState = { byId: {}, dismissed: {}, nextSeq: 0 };

/** The live socket payload, as `realtime-gateway` forwards it. */
export interface ContextFillEventPayload {
  id: string;
  meetingId?: string;
  content: string;
  confidence?: number;
  rationale?: string | null;
  hop: string;
  responder: string;
  citations?: unknown;
  createdAt?: string;
}

/** A `core-api` row, as the re-hydrate route returns it. */
export interface ContextFillRow {
  id: string;
  content: string;
  confidence?: number | null;
  rationale?: string | null;
  hop: string;
  responder?: string | null;
  responder_label?: string | null;
  citations?: unknown;
  created_at?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOPS: ReadonlySet<string> = new Set(["peer", "related_meeting", "rag"]);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** "user:{uuid}" gives the uuid; "rag" or anything else gives null. */
export function responderUserId(responder: unknown): string | null {
  if (typeof responder !== "string" || !responder.startsWith("user:")) return null;
  const id = responder.slice(5);
  return UUID.test(id) ? id : null;
}

type Incoming = Omit<ContextFill, "seq">;

function normalise(raw: {
  id: unknown;
  content: unknown;
  confidence: unknown;
  rationale: unknown;
  hop: unknown;
  responder: unknown;
  responderLabel: unknown;
  citations: unknown;
  createdAt: unknown;
}): Incoming | null {
  if (typeof raw.id !== "string" || !UUID.test(raw.id)) return null;
  const content = str(raw.content);
  if (!content || typeof raw.hop !== "string" || !HOPS.has(raw.hop)) return null;
  const hop = raw.hop as ContextHop;
  return {
    id: raw.id,
    content,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
    rationale: str(raw.rationale),
    hop,
    responderUserId: hop === "rag" ? null : responderUserId(raw.responder),
    responderLabel: str(raw.responderLabel),
    citations: cleanCitations(raw.citations),
    createdAt: str(raw.createdAt),
  };
}

function upsert(state: ContextFillsState, incoming: Incoming[]): ContextFillsState {
  let byId = state.byId;
  let nextSeq = state.nextSeq;
  for (const f of incoming) {
    if (state.dismissed[f.id]) continue;
    const current = byId[f.id];
    if (current) {
      // Live and re-hydrated copies are the same fill; the server's label fills in a name the
      // room could not resolve. Nothing else changes after arrival.
      if (!current.responderLabel && f.responderLabel) {
        if (byId === state.byId) byId = { ...state.byId };
        byId[f.id] = { ...current, responderLabel: f.responderLabel };
      }
      continue;
    }
    if (byId === state.byId) byId = { ...state.byId };
    byId[f.id] = { ...f, seq: nextSeq++ };
  }
  return byId === state.byId ? state : { ...state, byId, nextSeq };
}

export function applyLiveContextFill(state: ContextFillsState, p: ContextFillEventPayload): ContextFillsState {
  if (!p || typeof p !== "object") return state;
  const fill = normalise({
    id: p.id,
    content: p.content,
    confidence: p.confidence,
    rationale: p.rationale,
    hop: p.hop,
    responder: p.responder,
    responderLabel: null,
    citations: p.citations,
    createdAt: p.createdAt,
  });
  return fill ? upsert(state, [fill]) : state;
}

export function hydrateContextFills(state: ContextFillsState, body: { items?: ContextFillRow[] }): ContextFillsState {
  const items = Array.isArray(body?.items) ? body.items : [];
  const incoming = items
    .map((r) =>
      r && typeof r === "object"
        ? normalise({
            id: r.id,
            content: r.content,
            confidence: r.confidence,
            rationale: r.rationale,
            hop: r.hop,
            responder: r.responder,
            responderLabel: r.responder_label,
            citations: r.citations,
            createdAt: r.created_at,
          })
        : null,
    )
    .filter((f): f is Incoming => f !== null);
  return upsert(state, incoming);
}

/** Dismissed here (or gone on the server): gone for good. */
export function dismissContextFill(state: ContextFillsState, id: string): ContextFillsState {
  if (state.dismissed[id] && !state.byId[id]) return state;
  const byId = { ...state.byId };
  delete byId[id];
  return { ...state, byId, dismissed: { ...state.dismissed, [id]: true } };
}

/** The fills to show, oldest first, like the other sidebar cards. */
export function visibleContextFills(state: ContextFillsState): ContextFill[] {
  return Object.values(state.byId).sort((a, b) => a.seq - b.seq);
}

/**
 * The card's headline. A knowledge-base fill: "Context added from your knowledge base". A peer or
 * related-meeting fill: "Context added from {name}'s Myte", named from the room's member list
 * first (live cards carry only an id), then the server's label, then "a teammate". A raw id never
 * reaches the copy.
 */
export function contextFillHeadline(fill: ContextFill, nameOf: (userId: string) => string | null): string {
  if (fill.hop === "rag") return "Context added from your knowledge base";
  const fromRoom = fill.responderUserId ? nameOf(fill.responderUserId) : null;
  const label = fill.responderLabel && fill.responderLabel !== "Knowledge base" ? fill.responderLabel : null;
  const name = fromRoom || label;
  return name ? `Context added from ${name}'s Myte` : "Context added from a teammate's Myte";
}
