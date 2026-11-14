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

export type ProposalKind = "task" | "promise" | "attendance" | "agenda_item";
export type AttendanceChoice = "attend" | "agent" | "skip";
export interface ProposalEvent {
  id: string;
  kind: ProposalKind;
  title: string;
  due_date?: string | null;
  meeting_id?: string | null;
  choice?: AttendanceChoice | null;
  note?: string | null;
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
export interface MessagePayload {
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

export const LIMITS = {
  question: 2000,
  history: 12,
  historyItem: 4000,
  title: 120,
  payloadBytes: 64 * 1024,
  feedbackReason: 500,
} as const;

export const ALL_SCOPE: AskScope = { kind: "all", meeting_id: null, person_id: null, as_of: null, label: null };
