/**
 * Wire types for the "Only Mytheus" wave (decision reversal, delegated answers, the meeting
 * precheck, status requests asked from the precheck, and the weekly digest), all on core-api
 * except the precheck, which is a `bff` screen read.
 *
 * HAND-WRITTEN from the wave's API contract while the backend branch is built in parallel.
 * Once its OpenAPI documents are emitted, run `npm run generate:api` and these become aliases
 * onto the generated schemas, like `types.ts`.
 *
 * `snake_case`, because that is what the wire carries.
 */

/* ---------------- decision reversal ---------------- */

export type ReversalStatus = "pending" | "kept" | "rescoped" | "closed";
export type ReversalResolution = "keep" | "rescope" | "close";

export interface ReversalDecision {
  id: string;
  content: string;
  meeting_id: string;
  meeting_title: string | null;
  decided_at: string;
}

export interface ReversalAction {
  id: string;
  content: string;
  due_date: string | null;
  status: "confirmed" | "done" | "dismissed" | "proposed";
  meeting_id: string | null;
  meeting_title: string | null;
}

export interface DecisionReversal {
  id: string;
  status: ReversalStatus;
  created_at: string;
  resolved_at: string | null;
  old_decision: ReversalDecision;
  new_decision: ReversalDecision;
  action: ReversalAction;
}

export interface DecisionReversalList {
  items: DecisionReversal[];
}

export interface ReversalResolveBody {
  resolution: ReversalResolution;
  content?: string;
  due_date?: string | null;
}

/* ---------------- delegated answers ---------------- */

export interface DelegatedStatement {
  id: string;
  text: string;
  position: number;
  updated_at: string;
}

export interface DelegatedAnswers {
  meeting_id: string;
  attendance: "live" | "agent";
  editable: boolean;
  max_statements: number;
  max_chars: number;
  statements: DelegatedStatement[];
}

export interface DelegatedAnswerEntry {
  id: string;
  question: string;
  answer: string;
  covered: boolean;
  statement_id: string | null;
  statement_text: string | null;
  asked_by: string | null;
  asked_by_name: string | null;
  created_at: string;
}

export interface DelegatedAnswerLog {
  items: DelegatedAnswerEntry[];
}

/* ---------------- should this be a meeting? ---------------- */

export interface PrecheckRequest {
  title: string;
  agenda: string[];
  participant_ids?: string[];
}

export interface PrecheckDecided {
  decision_id: string;
  meeting_id: string;
  meeting_title: string | null;
  content: string;
  decided_at: string;
  score: number;
  superseded_by: string | null;
}

export interface PrecheckStatusAction {
  id: string;
  content: string;
  owner_user_id: string;
  owner_name: string | null;
  due_date: string | null;
}

export interface PrecheckStatusUpdate {
  agenda_index: number;
  text: string;
  action: PrecheckStatusAction | null;
}

export interface PrecheckRecentMeeting {
  meeting_id: string;
  title: string;
  when: string;
}

export interface MeetingPrecheck {
  already_decided: PrecheckDecided[];
  status_updates: PrecheckStatusUpdate[];
  recent_meetings: PrecheckRecentMeeting[];
  retrieval: "semantic" | "keyword";
}

export type StatusAskReason = "requested" | "already_pending" | "no_owner" | "not_open" | "own_action" | "not_found";

export interface StatusRequestsAsked {
  requested: number;
  skipped: number;
  items: { action_id: string; request_id: string | null; owner_name: string | null; reason: StatusAskReason }[];
}

/* ---------------- weekly digest ---------------- */

export interface DigestPreferences {
  weekly_enabled: boolean;
  email_enabled: boolean;
}

export interface DigestDecision {
  id: string;
  content: string;
  meeting_id: string;
  meeting_title: string | null;
  decided_at: string;
  matched_topics: string[];
}

export interface DigestDecisionChange {
  old_decision_id: string;
  old_content: string;
  new_decision_id: string;
  new_content: string;
  meeting_id: string;
  meeting_title: string | null;
  changed_at: string;
  matched_topics: string[];
}

export interface DigestAction {
  id: string;
  content: string;
  meeting_id: string | null;
  meeting_title: string | null;
  due_date: string | null;
  status: string;
  changed_at: string | null;
}

export interface DigestPromise {
  kind: "action" | "commitment";
  id: string;
  content: string;
  due_date: string | null;
  due_hint: string | null;
  meeting_id: string | null;
  meeting_title: string | null;
}

export interface WeeklyDigest {
  id: string | null;
  week_start: string;
  week_end: string;
  created_at: string | null;
  topics: string[];
  item_count: number;
  decisions: DigestDecision[];
  decision_changes: DigestDecisionChange[];
  actions_assigned: DigestAction[];
  actions_closed: DigestAction[];
  promises_due: DigestPromise[];
}

export interface LatestDigest {
  digest: WeeklyDigest | null;
  next_run_at: string;
}

export interface DigestSummary {
  id: string;
  week_start: string;
  item_count: number;
  created_at: string;
}

export interface DigestList {
  items: DigestSummary[];
}
