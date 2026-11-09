/**
 * Decision and action candidates on `core-api` (Plan 7-9 section 3.6, mytheus-docs ADR-0031).
 *
 *   GET   /api/v1/meetings/{id}/candidates     the meeting's proposed, surfaced candidates
 *   PATCH /api/v1/{decisions|actions}/{id}     edit before confirm
 *   POST  /api/v1/{decisions|actions}/{id}/confirm   the ONLY call that commits (row + topic event)
 *   POST  /api/v1/{decisions|actions}/{id}/dismiss   nothing published
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type { components as CoreApiSchemas } from "@/lib/api/generated/core-api";

export type DecisionRow = CoreApiSchemas["schemas"]["Decision"];
export type ActionItemRow = CoreApiSchemas["schemas"]["ActionItem"];
export type MeetingCandidates = CoreApiSchemas["schemas"]["CandidateList"];

export async function fetchMeetingCandidates(meetingId: string): Promise<MeetingCandidates> {
  return api<MeetingCandidates>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/candidates`);
}
