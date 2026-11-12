/**
 * Delegated answers (only-Mytheus wave, contract section 2) on core-api. When you send your Myte
 * instead (ADR-0039 B5), it answers questions in the room only from statements you pre-approved;
 * anything else gets "{First name} didn't pre-approve an answer to that."
 *
 *   GET /api/v1/meetings/{id}/delegated-answers       your statements, and whether they can change
 *   PUT /api/v1/meetings/{id}/delegated-answers       {statements}; 409 once the meeting is over
 *   GET /api/v1/meetings/{id}/delegated-answers/log   what YOUR Myte said (only you see it)
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type { DelegatedAnswerLog, DelegatedAnswers } from "@/lib/api/only-mytheus-types";

export async function fetchDelegatedAnswers(meetingId: string): Promise<DelegatedAnswers> {
  return api<DelegatedAnswers>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/delegated-answers`);
}

export async function putDelegatedAnswers(meetingId: string, statements: string[]): Promise<DelegatedAnswers> {
  return api<DelegatedAnswers>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/delegated-answers`, {
    method: "PUT",
    body: { statements },
  });
}

export async function fetchDelegatedAnswerLog(meetingId: string): Promise<DelegatedAnswerLog> {
  return api<DelegatedAnswerLog>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/delegated-answers/log`);
}
