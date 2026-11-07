/**
 * One meeting by id, from `core-api` through the gateway. Server-only, like everything that
 * imports `client.ts`.
 *
 * A real answer from the server (404, 403, 401) is thrown as an `ApiError` and the caller decides
 * what it means. "No gateway configured" and "gateway unreachable" say nothing about the meeting,
 * so they return null and the caller falls back to what it had.
 */

import { ApiError, api } from "@/lib/api/client";
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
