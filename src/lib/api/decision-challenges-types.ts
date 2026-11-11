/**
 * Wire types for "Decisions that follow you" (Beyond the meeting, Layer 2) on core-api.
 *
 * Hand-written from the A1 contract until the generated `core-api` schema carries them (run
 * `npm run generate:api` after the backend spec lands; these then become aliases, like
 * `only-mytheus-types.ts`). `snake_case`, because that is what the wire carries.
 *
 *   POST /api/v1/decisions/check                                  DecisionCheckResult
 *   POST /api/v1/decisions/{id}/check-dismissals                  {decision_id, dismissed}
 *   GET  /api/v1/decisions/{id}/challenges                        DecisionChallenges
 *   GET  /api/v1/decision-challenges?status=open|all              {items: DecisionChallenge[]}
 *   POST /api/v1/decision-challenges/{id}/dismiss                 DecisionChallenge
 *   POST /api/v1/decisions/{id}/reopen-requests                   ReopenRequest (201, or 200 if one is pending)
 *   GET  /api/v1/decision-reopen-requests?role=&status=           {items: ReopenRequest[]}
 *   GET  /api/v1/decision-reopen-requests/{id}                    ReopenRequest
 *   POST /api/v1/decision-reopen-requests/{id}/accept|decline|withdraw
 */

/** core-api sends `name: null` for a person with no display name (the generated `Person`). */
export type PersonRef = { id: string; name: string | null };

export type ChallengeSource = "slack" | "extension" | "mcp" | "app";
export type ChallengeStatus = "open" | "dismissed" | "reopened";
export type ConflictRelation = "contradicts" | "reopens";

export interface DecisionChallenge {
  id: string;
  decision_id: string;
  decision_content?: string | null;
  meeting_id?: string | null;
  source: ChallengeSource;
  place_label: string | null;
  /** An http(s) link to where it was said (a Slack permalink, a Jira issue), when one is known. */
  link: string | null;
  quote: string;
  why: string;
  relation: ConflictRelation;
  confidence: number;
  status: ChallengeStatus;
  author: PersonRef | null;
  created_at: string;
  reopen_request_id: string | null;
  /** Optional server hint: the viewer wrote it or owns the decision, so may dismiss it. */
  viewer_can_dismiss?: boolean;
}

export type ReopenStatus = "pending" | "accepted" | "declined" | "withdrawn";
export type ReopenOutcome = "revisit" | "follow_up";
export type ReopenViewerRole = "owner" | "requester" | "viewer";

export interface ReopenRequest {
  id: string;
  decision_id: string;
  decision_content: string;
  meeting_id: string;
  meeting_title: string | null;
  requested_by: PersonRef;
  owner: PersonRef | null;
  reason: string | null;
  quote: string | null;
  source: ChallengeSource;
  place_label: string | null;
  link: string | null;
  status: ReopenStatus;
  outcome: ReopenOutcome | null;
  follow_up_action_id: string | null;
  revisit_meeting_id: string | null;
  response_note: string | null;
  created_at: string;
  resolved_at: string | null;
  viewer_role: ReopenViewerRole;
}

export interface DecisionChallenges {
  decision_id: string;
  owner: PersonRef | null;
  viewer_is_owner: boolean;
  open_count: number;
  /** Distinct places among open and reopened challenges: "Challenged in N places". */
  places: number;
  items: DecisionChallenge[];
  reopen_requests: ReopenRequest[];
}

export interface ReopenRequestList {
  items: ReopenRequest[];
}

export interface DecisionChallengeList {
  items: DecisionChallenge[];
}

export interface ReopenRequestCreate {
  reason?: string;
  quote?: string;
  source?: ChallengeSource;
  place_label?: string;
  link?: string;
  challenge_id?: string;
}

export interface ReopenAcceptBody {
  outcome: ReopenOutcome;
  note?: string;
  /** follow_up: the task's due date (YYYY-MM-DD). */
  due_date?: string;
  /** revisit: when the revisit meeting starts (ISO date-time). */
  scheduled_start?: string;
  duration_minutes?: number;
}
