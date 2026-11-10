/**
 * One meeting by id, from `core-api` through the gateway. Server-only, like everything that
 * imports `client.ts`.
 *
 * A real answer from the server (404, 403, 401) is thrown as an `ApiError` and the caller decides
 * what it means. "No gateway configured" and "gateway unreachable" say nothing about the meeting,
 * so they return null and the caller falls back to what it had.
 */

import { ApiError, api, apiSafe } from "@/lib/api/client";
import type { CarryForward } from "@/lib/api/meeting-agenda-types";
import type { ApiMeeting } from "@/lib/api/types";

export async function fetchMeeting(meetingId: string): Promise<ApiMeeting | null> {
  try {
    return await api<ApiMeeting>(`/api/v1/meetings/${encodeURIComponent(meetingId)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status !== 0 && error.code !== "DEPENDENCY_UNAVAILABLE") {
      throw error;
    }
    return null;
  }
}

/**
 * What the previous meeting left open, for the caller (ADR-0038 D6,
 * `GET /api/v1/meetings/{id}/carry-forward`): its confirmed decisions, its open action items and
 * the caller's own saved questions. `{ ok: false }` when it cannot be read, which the meeting page
 * shows as "could not load", never as "nothing carried forward".
 */
export async function fetchCarryForward(
  meetingId: string,
): Promise<{ ok: true; data: CarryForward } | { ok: false }> {
  const res = await apiSafe<Partial<CarryForward>>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/carry-forward`);
  if (!res.ok) return { ok: false };
  return {
    ok: true,
    data: {
      previous_meeting: res.data.previous_meeting ?? null,
      decisions: Array.isArray(res.data.decisions) ? res.data.decisions : [],
      open_actions: Array.isArray(res.data.open_actions) ? res.data.open_actions : [],
      saved_questions: Array.isArray(res.data.saved_questions) ? res.data.saved_questions : [],
      open_items: Array.isArray(res.data.open_items)
        ? res.data.open_items.filter((o) => o && typeof o.text === "string" && o.text.trim())
        : [],
      unanswered_questions: Array.isArray(res.data.unanswered_questions)
        ? res.data.unanswered_questions.filter((q) => q && typeof q.text === "string" && q.text.trim())
        : [],
    },
  };
}
