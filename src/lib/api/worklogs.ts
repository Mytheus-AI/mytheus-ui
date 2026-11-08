/**
 * My Notes read. Plan 7-9 §3.3 step 3 / §3.4 step 2: `GET /api/v1/meetings/:id/worklogs?user_id=me`
 * on `core-api` (mytheus-backend `4fffbc6`). Returns only the caller's own surfaced notes, so
 * there is nothing to filter here.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts` (it reads the Clerk session server-side).
 */

import { api } from "@/lib/api/client";
import type { components as CoreApiSchemas } from "@/lib/api/generated/core-api";

export type Worklog = CoreApiSchemas["schemas"]["Worklog"];

export async function fetchMyWorklogs(meetingId: string): Promise<Worklog[]> {
  const result = await api<CoreApiSchemas["schemas"]["WorklogList"]>(
    `/api/v1/meetings/${encodeURIComponent(meetingId)}/worklogs`,
    { query: { user_id: "me" } },
  );
  return result.items;
}
