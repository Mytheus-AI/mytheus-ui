/**
 * Wire types to the view models the existing components already expect.
 *
 * The point of this file is to let real data flow into components written against the mock
 * WITHOUT changing those components, and without inventing the fields the backend does not
 * have yet.
 *
 * `Meeting` in `src/lib/mock/data.ts` carries `durationMinutes`, `participants`,
 * `decisionCount` and `actionCount`. None of those exist server-side yet: duration and
 * speakers come from transcription (Plan 3-4), decision and action counts from the agent and
 * confirmation bands (Plan 7-9). They are returned as `undefined` here rather than `0`,
 * because `0` renders as "0 decisions" and states a fabricated fact as a measured one.
 */

import type { MeetingStatus as MockMeetingStatus } from "@/lib/mock/data";
import type { DashboardMeeting, MeetingStatus } from "./types";

/**
 * A meeting as the dashboard components consume it. Structurally the mock `Meeting` with the
 * not-yet-available fields made optional, so a component can render either source.
 */
export interface MeetingView {
  id: string;
  title: string;
  startTime: string;
  status: MockMeetingStatus;
  /** Absent until the transcription band. Not zero. */
  durationMinutes?: number;
  /** Absent until participants are joined to real user records with display names. */
  participants?: string[];
  /** Absent until the agent/confirmation bands. Not zero. */
  decisionCount?: number;
  actionCount?: number;
}

/**
 * Server status to the vocabulary the UI already uses.
 *
 * `cancelled` maps to `past` deliberately: the existing components know three states, and a
 * cancelled meeting belongs with things that are no longer going to happen rather than being
 * shown as upcoming. `ended` is likewise `past`.
 */
export function toMockStatus(status: MeetingStatus): MockMeetingStatus {
  switch (status) {
    case "live":
      return "live";
    case "scheduled":
      return "upcoming";
    case "ended":
    case "cancelled":
      return "past";
  }
}

export function toMeetingView(m: DashboardMeeting): MeetingView {
  return {
    id: m.id,
    // The server permits a null title; a heading needs something to render. This is a
    // presentation default, not invented data.
    title: m.title ?? "Untitled meeting",
    // The components expect an ISO string. An unscheduled meeting has no start, and the
    // epoch would render as 1970; callers filter those out before display.
    startTime: m.scheduled_start ?? "",
    status: toMockStatus(m.status),
  };
}
