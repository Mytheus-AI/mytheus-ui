/**
 * Wire types for the `bff` and `core-api` reads.
 *
 * Hand-written and matched to the FastAPI response models by name. Replaced by a generated
 * client once the OpenAPI specs are emitted from code (an open gap in the band record); until
 * then this is the one file where wire drift can hide, which is why it is small and separate
 * from every screen.
 *
 * `snake_case` here because that is what the wire carries. Conversion to `camelCase` happens
 * in `present.ts`, so no screen ever has to know which convention it is looking at.
 */

/** Every `bff` panel carries its own status. `empty` and `degraded` are NOT interchangeable:
 *  one means "you have nothing", the other means "we could not load it". They need different
 *  empty states, and guessing from an empty array gets it wrong half the time. */
export type ArmStatus = "ok" | "degraded" | "empty";

export interface Arm<T> {
  status: ArmStatus;
  items: T[];
}

export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";

export interface DashboardMeeting {
  id: string;
  title: string | null;
  status: MeetingStatus;
  scheduled_start: string | null;
  scheduled_end: string | null;
  livekit_room: string | null;
}

export interface DashboardResponse {
  upcoming_meetings: Arm<DashboardMeeting>;
  action_items: Arm<unknown>;
  worklogs: Arm<unknown>;
  decisions: Arm<unknown>;
}

export interface Participant {
  user_id: string;
  role_in_meeting: string | null;
}

export interface ApiMeeting {
  id: string;
  title: string | null;
  status: MeetingStatus;
  scheduled_start: string | null;
  scheduled_end: string | null;
  livekit_room: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participants: Participant[];
}

/** Cursor pagination, never offset. `next_cursor` is opaque: build no logic on its contents. */
export interface MeetingPage {
  items: ApiMeeting[];
  next_cursor: string | null;
}

export interface ApiTeam {
  id: string;
  name: string;
  department_id: string | null;
  created_at: string;
}
