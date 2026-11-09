/**
 * QuestionAgent suggestions on `core-api` (Plan 7-9 section 3.10, mytheus-docs ADR-0034).
 *
 *   GET  /api/v1/suggestions?meeting_id=        the caller's open suggestions for this meeting,
 *                                               plus their saved ones from any meeting
 *   POST /api/v1/suggestions/{id}/ask|dismiss|save   owner only; nothing is published
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type { components as CoreApiSchemas } from "@/lib/api/generated/core-api";

export type SuggestionRow = CoreApiSchemas["schemas"]["Suggestion"];
export type MeetingSuggestions = CoreApiSchemas["schemas"]["SuggestionList"];

export async function fetchMeetingSuggestions(meetingId: string): Promise<MeetingSuggestions> {
  return api<MeetingSuggestions>(`/api/v1/suggestions?meeting_id=${encodeURIComponent(meetingId)}`);
}
