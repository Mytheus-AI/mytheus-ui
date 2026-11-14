/**
 * Ask Myte (mytheus-docs ADR-0047): the wire shapes the UI reads and writes.
 *
 * - D7: core-api's private threads (`/api/v1/myte/*`).
 * - D8: rag-service's `POST /api/rag/myte` stream, relayed by `app/api/ask-myte/route.ts`, which
 *   adds its own `saved` event (and `unsaved` when the answer could not be stored).
 *
 * Hand-written until the generated clients are regenerated from the new OpenAPI documents; the
 * names mirror the ADR exactly. Pure (no imports), so it runs on the server, in the browser and
 * under `node --test`.
 */

/* ---------------- the question ---------------- */

export type ScopeKind = "all" | "meeting" | "person" | "as_of";

export interface AskScope {
  kind: ScopeKind;
  meeting_id: string | null;
  person_id: string | null;
  as_of: string | null;
  /** UI only: what the chip shows ("Feature Update - Backend", "Maya Chen"). Never sent upstream. */
  label?: string | null;
}

export type PageKind = "meeting" | "decision" | "person";

export interface AskPage {
  kind: PageKind | null;
  id: string | null;
  title: string | null;
}

export type Role = "user" | "myte";

export interface HistoryItem {
  role: Role;
  content: string;
}

export type Personality = "balanced" | "concise" | "detailed" | "direct" | "friendly";

export interface Persona {
  name: string;
  personality: Personality;
  instructions: string | null;
}

/** What the browser posts to `/api/ask-myte`. */
export interface AskRequest {
  thread_id?: string | null;
  question: string;
  scope: AskScope;
  page: AskPage | null;
  /** only used when there is no `thread_id` yet (the server reads a stored thread itself) */
  history?: HistoryItem[];
  /** IANA zone: sets "today" for the loop and the capacity check */
  timezone?: string | null;
  /** ADR-0049 F7: pasted or dropped text files, sent with this question only */
  attachments?: Attachment[];
  /** ADR-0049 F1: `peer_answer` drafts a reply to a teammate's question (never stored as a thread) */
  mode?: AskMode;
  peer?: PeerContext | null;
  /** ADR-0049 F5: a routine run names its new thread after the routine */
  thread_title?: string | null;
}

/* ---------------- v2 additions (ADR-0049) ---------------- */

export type AskMode = "ask" | "peer_answer";

export interface Attachment {
  name: string;
  text: string;
}

export interface PeerContext {
  question_id: string;
  from_name: string;
  question: string;
}

export interface MemoryRef {
  id: string;
  text: string;
}

/* ---------------- the stream (D8) ---------------- */

export type StepState = "running" | "done" | "failed";
export interface StepEvent {
  id: string;
  label: string;
  state: StepState;
}

export const SOURCE_KINDS = ["transcript", "decision", "action", "promise", "meeting", "document", "person", "notification"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface Source {
  n: number;
  kind: SourceKind | string;
  title: string;
  text: string;
  meeting_id?: string | null;
  meeting_title?: string | null;
  decision_id?: string | null;
  action_id?: string | null;
  occurred_at?: string | null;
  speaker?: string | null;
  start_ms?: number | null;
  /** extra ids some tools return (a person, a document); read when present */
  person_id?: string | null;
  document_id?: string | null;
  due_date?: string | null;
  status?: string | null;
}

export type CardKind = "meeting" | "decision" | "tasks" | "promises" | "capacity";
export interface CardEvent {
  kind: CardKind | string;
  source_ns: number[];
  /** rag-service sends `{items: [the cited source objects], detail: <the tool's structured result or null>}` */
  data: { items?: Source[]; detail?: unknown } | null;
}

export const PROPOSAL_KINDS = [
  "task",
  "promise",
  "attendance",
  "agenda_item",
  "schedule_meeting",
  "invite_people",
  "slack_post",
  "export_decisions",
  "share_decision",
  "ask_myte",
  "memory",
] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];
export type AttendanceChoice = "attend" | "agent" | "skip";
export type ExportDestination = "notion" | "confluence" | "slack";
/** Every field is flat on the event (ADR-0049 F3, confirmed by rag-service); only the ones for
    its kind are set. `title` is always present. */
export interface ProposalEvent {
  id: string;
  kind: ProposalKind;
  title: string;
  due_date?: string | null;
  meeting_id?: string | null;
  choice?: AttendanceChoice | null;
  note?: string | null;
  /* schedule_meeting */
  start?: string | null;
  end?: string | null;
  attendee_ids?: string[] | null;
  attendee_names?: string[] | null;
  /* invite_people */
  user_ids?: string[] | null;
  user_names?: string[] | null;
  /* slack_post */
  text?: string | null;
  channel?: string | null;
  /* export_decisions */
  destination?: ExportDestination | null;
  decision_ids?: string[] | null;
  /* share_decision */
  decision_id?: string | null;
  /* ask_myte */
  person_id?: string | null;
  person_name?: string | null;
  question?: string | null;
}

export type ErrorReason = "budget" | "not_connected" | "unavailable" | "invalid" | "session";
export interface ErrorEvent {
  reason: ErrorReason;
  message: string;
}

export interface DoneEvent {
  abstained: boolean;
  degraded: boolean;
  cited: number[];
}

export interface SavedEvent {
  thread_id: string;
  message_ids: string[];
}

export type StreamEvent =
  | { event: "step"; data: StepEvent }
  | { event: "delta"; data: { text: string } }
  | { event: "source"; data: Source }
  | { event: "card"; data: CardEvent }
  | { event: "proposal"; data: ProposalEvent }
  | { event: "followups"; data: { items: string[] } }
  | { event: "title"; data: { text: string } }
  | { event: "done"; data: DoneEvent }
  | { event: "error"; data: ErrorEvent }
  | { event: "saved"; data: SavedEvent }
  | { event: "unsaved"; data: { message: string } };

export type StreamEventName = StreamEvent["event"];

/* ---------------- threads (D7) ---------------- */

export interface ThreadSummary {
  id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  last_message_at: string;
}

export interface ThreadList {
  items: ThreadSummary[];
  next_cursor: string | null;
}

/** What a Myte message keeps besides its text (max 64 KB on the server). */
export type ProposalState = "confirmed" | "dismissed";

export interface MessagePayload {
  /** ADR-0049 R2: what the person did with each proposal, stored by `PATCH /myte/messages/{id}` */
  proposal_states?: Record<string, ProposalState>;
  /** user messages: the names of attached files (never their text) */
  attachments?: string[];
  steps?: StepEvent[];
  sources?: Source[];
  cards?: CardEvent[];
  proposals?: (ProposalEvent & { confirmed?: boolean })[];
  followups?: string[];
  abstained?: boolean;
  degraded?: boolean;
  /** user messages: what the question was scoped to */
  scope?: AskScope | null;
  page?: AskPage | null;
}

export interface StoredMessage {
  id: string;
  thread_id: string;
  role: Role;
  content: string;
  payload: MessagePayload | null;
  feedback: -1 | 0 | 1 | null;
  feedback_reason: string | null;
  created_at: string;
}

export interface Thread extends ThreadSummary {
  scope?: AskScope | null;
  messages: StoredMessage[];
}

/* ---------------- peer questions (F1) ---------------- */

export interface PeerUser {
  id: string;
  name: string;
  agent_name: string | null;
  agent_avatar_seed: string | null;
}

export type PeerStatus = "pending" | "answered" | "declined";

export interface PeerQuestion {
  id: string;
  from_user: PeerUser;
  to_user: PeerUser;
  question: string;
  thread_id: string | null;
  status: PeerStatus;
  answer: string | null;
  decline_reason: string | null;
  created_at: string;
  answered_at: string | null;
}

/* ---------------- memory (F4) ---------------- */

export interface Memory {
  id: string;
  text: string;
  source_thread_id?: string | null;
  created_at?: string | null;
}

/* ---------------- routines (F5) ---------------- */

export type Cadence = "daily" | "weekdays" | "weekly";

export interface Routine {
  id: string;
  question: string;
  scope: Omit<AskScope, "label"> | null;
  cadence: Cadence;
  weekday: number | null;
  hour: number;
  timezone: string;
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  last_thread_id: string | null;
  created_at?: string | null;
}

export const LIMITS = {
  question: 2000,
  history: 12,
  historyItem: 4000,
  title: 120,
  payloadBytes: 64 * 1024,
  feedbackReason: 500,
  memories: 30,
  memoryText: 300,
  attachments: 3,
  attachmentChars: 40_000,
  peerQuestion: 1000,
  peerAnswer: 8000,
  declineReason: 500,
  proposalStates: 20,
} as const;

export const ALL_SCOPE: AskScope = { kind: "all", meeting_id: null, person_id: null, as_of: null, label: null };
