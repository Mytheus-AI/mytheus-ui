/**
 * "In every meeting at once" (Beyond the meeting, Layer 3): the wire types, aliased onto the
 * schemas `npm run generate:api` emits from core-api's OpenAPI document. snake_case, as the wire.
 *
 *   PUT|DELETE|GET /api/v1/meetings/{id}/attendance-choice
 *   GET /api/v1/listening/week?start=
 *   GET|POST /api/v1/listening/rules, PUT|DELETE /api/v1/listening/rules/{id}
 *   GET|PUT /api/v1/listening/preferences
 *   GET|POST /api/v1/listening/positions, PUT|DELETE /api/v1/listening/positions/{id}
 *   GET /api/v1/listening/interruptions, GET /{id}, POST /{id}/join | dismiss | view | hold
 *   GET /api/v1/meetings/{id}/views, POST /api/v1/meetings/{id}/views/{view_id}/share | dismiss
 *   GET /api/v1/listening/digests, /digests/latest, /digests/{day}
 */

import type { components } from "./generated/core-api";

type S = components["schemas"];

export type AttendanceChoice = S["MeetingAttendanceChoice"]["choice"];
export type ChoiceSource = S["MeetingAttendanceChoice"]["source"];
export type MeetingAttendanceChoice = S["MeetingAttendanceChoice"];
export type AttendanceRule = S["AttendanceRule"];
export type AttendanceRuleWrite = S["AttendanceRuleWrite"];
export type AttendanceRuleResult = S["AttendanceRuleResult"];
export type WeekMeeting = S["WeekMeeting"];
export type WeekSummary = S["WeekSummary"];
export type ListeningWeek = S["ListeningWeek"];
export type FocusBlock = S["FocusBlock"];
export type ListeningPreferences = S["ListeningPreferences"];
export type ListeningPreferencesView = S["ListeningPreferencesView"];
export type StandingPosition = S["StandingPosition"];
export type Interruption = S["Interruption"];
export type MeetingView = S["MeetingView"];
export type MeetingViewList = S["MeetingViewList"];
export type DigestSegment = S["DigestSegment"];
export type DigestMeeting = S["DigestMeeting"];
export type EveningDigest = S["EveningDigest"];
export type EveningDigestSummary = S["EveningDigestSummary"];

/** The "listeners" room event (realtime-gateway): how many agents listen in this meeting. */
export type ListenersPayload = { count: number; userIds: string[] };
