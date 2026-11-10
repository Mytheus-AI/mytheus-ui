/**
 * ContextGapAgent context fills and the agent collaboration log on `core-api` (Phase P10,
 * plan 3.5, P10 contract section 6).
 *
 *   GET  /api/v1/meetings/{id}/context-fills     the caller's own surfaced, non-dismissed fills
 *   POST /api/v1/context-fills/{id}/dismiss      requester only (404 to anyone else), idempotent
 *   GET  /api/v1/meetings/{id}/collaborations    cursor-paginated, newest first; participants and
 *                                                org admins only. Never carries fill content.
 *
 * HAND-WRITTEN TYPES. The backend PR that adds these routes was built in parallel with this one,
 * so its OpenAPI document was not on main yet. Once it merges, run `npm run generate:api` and
 * replace these with `CoreApiSchemas["schemas"][...]` like the other modules here.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";

export type ContextHop = "peer" | "related_meeting" | "rag";

export type CollaborationResult =
  | "answered"
  | "no_answer"
  | "deadline_miss"
  | "authz_denied"
  | "org_spoof"
  | "foreign_org"
  | "rag_hit"
  | "rag_miss";

/** One surfaced fill, as `GET /api/v1/meetings/{id}/context-fills` returns it. */
export interface ContextFillRow {
  id: string;
  content: string;
  confidence: number;
  rationale: string | null;
  hop: ContextHop;
  /** "user:{uuid}" or "rag". */
  responder?: string | null;
  /** The responder's display name, or "Knowledge base" for a rag fill. */
  responder_label?: string | null;
  /** ADR-0033 citation objects (four kinds). */
  citations: unknown[];
  created_at: string;
}

export interface ContextFillList {
  items: ContextFillRow[];
}

/** One log row, as `GET /api/v1/meetings/{id}/collaborations` returns it. */
export interface CollaborationRow {
  id: string;
  created_at: string;
  hop: ContextHop;
  requester_id: string;
  requester_name?: string | null;
  /** "user:{uuid}" or "rag". */
  responder: string;
  /** The responder's display name, or "Knowledge base". */
  responder_label?: string | null;
  query_class: "meeting_context" | "decision_lineage" | "action_status";
  target_scope: "self" | "same_team" | "department" | "org" | null;
  result: CollaborationResult;
  success: boolean;
  latency_ms: number;
}

export interface CollaborationPage {
  items: CollaborationRow[];
  next_cursor: string | null;
}

export async function fetchMeetingContextFills(meetingId: string): Promise<ContextFillList> {
  return api<ContextFillList>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/context-fills`);
}

export async function fetchMeetingCollaborations(
  meetingId: string,
  cursor?: string,
): Promise<CollaborationPage> {
  return api<CollaborationPage>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/collaborations`, {
    query: { cursor: cursor || undefined, limit: 50 },
  });
}
