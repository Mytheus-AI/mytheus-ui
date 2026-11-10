/**
 * Hand-written wire types for linked meetings, hosts and agendas (mytheus-docs ADR-0038 D5, D6,
 * D9), until the generated core-api client is regenerated with them. Shapes and limits mirror the
 * ADR exactly; `snake_case` on the wire, as every REST shape here.
 *
 * Pure types and constants: no imports, so client components, server code and the node test
 * runner can all read it.
 */

export type AgendaStatus = "pending" | "in_progress" | "covered" | "skipped";
export type AgendaStatusSource = "agent" | "host";

export const AGENDA_STATUSES: readonly AgendaStatus[] = ["pending", "in_progress", "covered", "skipped"];

/** ADR-0038 D5 limits. The server enforces them (422); the UI says them first. */
export const AGENDA_LIMITS = {
  maxItems: 20,
  titleMax: 200,
  minutesMin: 1,
  minutesMax: 240,
  noteMax: 500,
} as const;

/** `AgendaItem` (D6). */
export interface AgendaItem {
  id: string;
  position: number;
  title: string;
  owner_user_id: string | null;
  duration_minutes: number | null;
  status: AgendaStatus;
  status_source: AgendaStatusSource | null;
  agent_note: string | null;
  updated_at: string;
}

/** `previous_meeting` on a meeting read and on carry-forward (D6). */
export interface MeetingLinkSummary {
  id: string;
  title: string | null;
  scheduled_start: string | null;
}

/** What D6 adds to `Meeting` (create, get, list) and to `GET /meetings/{id}` only. */
export interface MeetingAgendaFields {
  host_user_id: string | null;
  previous_meeting_id: string | null;
  /** `GET /meetings/{id}` only. */
  previous_meeting?: MeetingLinkSummary | null;
  /** `GET /meetings/{id}` only, ordered by `position`. */
  agenda?: AgendaItem[];
}

/** One row of `MeetingCreate.agenda` (D6). */
export interface AgendaItemCreate {
  title: string;
  owner_user_id?: string | null;
  duration_minutes?: number | null;
}

/** One row of `PUT /meetings/{id}/agenda` (D6). An `id` keeps that item's status. */
export interface AgendaItemPut extends AgendaItemCreate {
  id?: string;
}

/** `GET /meetings/{id}/carry-forward` (D6). */
export interface CarryForward {
  previous_meeting: MeetingLinkSummary | null;
  decisions: { id: string; content: string }[];
  open_actions: { id: string; title: string; owner_user_id: string | null; due_date: string | null }[];
  saved_questions: { id: string; question: string }[];
}

/** `"agent-agenda"` socket payload (D9), to every socket on the meeting. */
export interface AgentAgendaPayload {
  itemId: string;
  status: AgendaStatus;
  note: string | null;
}

export type NudgeType = "off_agenda" | "over_time" | "unaddressed";

/** `"agent-nudge"` socket payload (D9), only to the host's sockets. */
export interface AgentNudgePayload {
  id: string;
  type: NudgeType;
  itemId: string | null;
  content: string;
}

/** The persona fields `GET /users` adds per member (D3). */
export interface MemberAgentFields {
  agent_name?: string | null;
  agent_avatar_seed?: string | null;
}

export type AgentPersonality = "balanced" | "concise" | "detailed" | "direct" | "friendly";
