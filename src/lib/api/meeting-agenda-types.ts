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
  /** An `org_goals` id this item serves (ADR-0039 B3), or null. */
  goal_id?: string | null;
  /** Polish program, the agenda as the spine: when the item first went in progress and last
   *  finished, and the minutes the host added in the room (the plan is duration + extended). */
  started_at?: string | null;
  ended_at?: string | null;
  extended_minutes?: number;
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
  /** An active `org_goals` id (ADR-0039 B3), or null. */
  goal_id?: string | null;
}

/** One row of `PUT /meetings/{id}/agenda` (D6). An `id` keeps that item's status. */
export interface AgendaItemPut extends AgendaItemCreate {
  id?: string;
}

/** `GET /meetings/{id}/carry-forward` (D6). */
export interface CarryForward {
  previous_meeting: MeetingLinkSummary | null;
  decisions: { id: string; content: string }[];
  open_actions: {
    id: string;
    title: string;
    owner_user_id: string | null;
    due_date: string | null;
    /** The assignee's latest answer to a status request (ADR-0039 B7), or null. */
    latest_status?: { text: string; answered_at: string | null } | null;
  }[];
  saved_questions: { id: string; question: string }[];
  /** From the previous meeting's shared minutes (minutes for everyone); empty until they exist. */
  open_items?: { text: string; owner_user_id?: string | null; owner_name?: string | null; due?: string | null }[];
  unanswered_questions?: { text: string; asked_by_name?: string | null }[];
}

/** `"agent-agenda"` socket payload (D9), to every socket on the meeting. */
export interface AgentAgendaPayload {
  itemId: string;
  status: AgendaStatus;
  note: string | null;
}

/** `proxy_update` (ADR-0039 C5): an item owned by someone who sent their agent became in
 *  progress, so the host sees that person's update. Once per item, no model call. */
export type NudgeType = "off_agenda" | "over_time" | "unaddressed" | "proxy_update";

/** `"agent-nudge"` socket payload (D9), only to the host's sockets. A `proxy_update` nudge
 *  (ADR-0039 C5) carries the person's whole update (up to 2000 chars) and, optionally, `userId`,
 *  the participant who sent their agent. */
export interface AgentNudgePayload {
  id: string;
  type: NudgeType;
  itemId: string | null;
  content: string;
  userId?: string | null;
}

/** The persona fields `GET /users` adds per member (D3). */
export interface MemberAgentFields {
  agent_name?: string | null;
  agent_avatar_seed?: string | null;
}

export type AgentPersonality = "balanced" | "concise" | "detailed" | "direct" | "friendly";
