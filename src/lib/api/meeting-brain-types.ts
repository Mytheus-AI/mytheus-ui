/**
 * Hand-written wire types for the meeting side of the company brain (mytheus-docs ADR-0039 Part B
 * and the C5 / C7 socket payloads), until the generated clients are regenerated with them. Shapes
 * and limits mirror the ADR; `snake_case` on the wire, as every REST shape here.
 *
 * Pure types and constants: no imports beyond types, so client components, server code and the
 * node test runner can all read it.
 */

import type { AgendaItem, AgendaStatus } from "./meeting-agenda-types.ts";

/* ---------------------------------------------------------------- B1 meeting types */

/** One agenda row of a meeting type (B1). */
export interface MeetingTemplateAgendaItem {
  title: string;
  duration_minutes: number | null;
}

/** `meeting_templates` as `GET /api/v1/meeting-templates` returns it (B1). */
export interface MeetingTemplate {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  agenda: MeetingTemplateAgendaItem[];
  confidential: boolean;
}

/** B1 limits on a meeting's length, which a template may set: 5 to 480 minutes. */
export const MEETING_MINUTES = { min: 5, max: 480 } as const;

/* ---------------------------------------------------------------- A4 goals (read here only) */

export type OrgGoalStatus = "active" | "achieved" | "dropped";

/** `org_goals` as `GET /api/v1/org/goals` returns it (A4). Only active goals are offered. */
export interface OrgGoal {
  id: string;
  title: string;
  period: string | null;
  status: OrgGoalStatus;
}

/* ---------------------------------------------------------------- B4 drafted agenda */

export type DraftSource = "template" | "unfinished" | "open_action";

/** One item of `POST /api/v1/meetings/agenda-draft` (B4). Nothing is saved. */
export interface DraftedAgendaItem {
  title: string;
  owner_user_id: string | null;
  duration_minutes: number | null;
  goal_id: string | null;
  source: DraftSource;
}

/* ---------------------------------------------------------------- B5 send your Myte instead */

export type Attendance = "live" | "agent";

/** B5 limits. The server enforces them (422); the UI says them first. */
export const ATTENDANCE_LIMITS = {
  updateMax: 2000,
  questionsMax: 5,
  questionMax: 300,
} as const;

/** `PUT /api/v1/meetings/{id}/attendance` (B5): self only, not after the meeting ended. */
export interface AttendancePut {
  attendance: Attendance;
  proxy_update?: string | null;
  proxy_questions?: string[];
}

/** What B5 adds to each participant of a meeting read. `proxy_questions` reaches only the person
 *  and the host; everyone in the meeting sees `attendance` and `proxy_update`. */
export interface ParticipantAttendanceFields {
  attendance?: Attendance | null;
  proxy_update?: string | null;
  proxy_questions?: string[] | null;
}

/* ---------------------------------------------------------------- B2, B3 on the meeting */

/** What B2 adds to `Meeting` and `MeetingCreate`. */
export interface MeetingBrainFields {
  confidential?: boolean;
  template_id?: string | null;
}

/* ---------------------------------------------------------------- B7 latest status */

/** The assignee's latest answer to a status request (B7), or null when none came. */
export interface LatestStatus {
  text: string;
  answered_at: string | null;
}

/* ---------------------------------------------------------------- B8 screen reads */

/** An open action from the previous meeting, with its latest status (B7, B8). */
export interface BriefAction {
  id: string;
  title: string;
  owner_user_id: string | null;
  due_date: string | null;
  latest_status: LatestStatus | null;
}

/** What the previous meeting's minutes left open, for the caller (minutes for everyone). */
export interface BriefMinutes {
  /** The shared minutes' open items, the caller's own (`mine`) first. */
  open_items: { text: string; owner_user_id: string | null; owner_name: string | null; due: string | null; mine: boolean }[];
  unanswered_questions: string[];
  /** The caller's own promises from their personal minutes. Only they see these. */
  my_promises: { text: string; to_name: string | null; due: string | null }[];
}

/** `GET /bff/meetings/{id}/brief` (B8). */
export interface MeetingBrief {
  meeting: { id: string; title: string; scheduled_start: string | null };
  my_agenda_items: AgendaItem[];
  my_open_actions: BriefAction[];
  saved_questions: { id: string; question: string }[];
  proxies: { user_id: string; proxy_update: string | null }[];
  previous_meeting: { id: string; title: string } | null;
  /** Null without minutes for the previous meeting (or an older backend). */
  previous_minutes: BriefMinutes | null;
}

/** One step of the health trend along the follow-up chain (B8). */
export interface HealthTrendPoint {
  meeting_id: string;
  title: string;
  scheduled_start: string | null;
  /** 0..1, the share of agenda items covered; null when the meeting had no agenda. */
  coverage: number | null;
  decisions: number;
}

/** `GET /bff/meetings/{id}/health` (B8), after the meeting ended. */
export interface MeetingHealth {
  duration_minutes: number;
  people_hours: number;
  agenda: { covered: number; total: number };
  decisions: number;
  actions: number;
  /** null when no speaker timing is stored. */
  talk_balance: { user_id: string; share: number }[] | null;
  async_suggestion: boolean;
  trend: HealthTrendPoint[];
}

/** One agenda item on the catch-up: its status and the meeting agent's note. */
export interface CatchUpAgendaItem {
  id: string;
  title: string;
  owner_user_id: string | null;
  status: AgendaStatus;
  agent_note: string | null;
}

/** `GET /bff/meetings/{id}/catch-up` (B8). */
export interface MeetingCatchUp {
  meeting: { id: string; title: string; scheduled_start: string | null } | null;
  agenda: CatchUpAgendaItem[];
  decisions: { id: string; content: string }[];
  assigned_to_me: { id: string; title: string; due_date: string | null }[];
  my_notes: { id: string; content: string; created_at: string | null }[];
  my_questions: string[];
}

/* ---------------------------------------------------------------- C7 already decided */

/** The decision an `already_decided` alert points back to (C7). */
export interface AlreadyDecided {
  decisionId: string;
  content: string;
  decidedAt: string | null;
  meetingId: string | null;
  meetingTitle: string | null;
}
