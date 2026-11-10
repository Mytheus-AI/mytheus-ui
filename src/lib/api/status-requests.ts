/**
 * Status requests (ADR-0039 B7) on `core-api`:
 *
 *   GET  /api/v1/status-requests?state=     the caller's own (they are the action's assignee)
 *   POST /api/v1/status-requests/{id}/answer {status_text}
 *
 * An hour before a follow-up meeting, `workflow-service` asks the assignee of every open action
 * from the previous meeting how it is going; the answer rides into that meeting's carry-forward.
 * HAND-WRITTEN TYPES (`personal-types.ts`) until the client is regenerated.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import { meetingInfoById } from "@/lib/api/commitments";
import type { components as CoreApiSchemas } from "@/lib/api/generated/core-api";
import {
  itemsOf,
  type StatusRequest,
  type StatusRequestState,
  type StatusRequestView,
} from "@/lib/api/personal-types";

type MyTaskList = CoreApiSchemas["schemas"]["MyTaskList"];

/** The caller's open actions' wording, by id (they are the assignee of every request). */
export async function actionTitleById(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    const page = await api<MyTaskList>("/api/v1/actions", { query: { assignee_id: "me", status: "confirmed" } });
    for (const t of page.items) out.set(t.id, t.content);
  } catch {
    // A join only.
  }
  return out;
}

export async function fetchStatusRequests(state: StatusRequestState): Promise<StatusRequest[]> {
  const body = await api<unknown>("/api/v1/status-requests", { query: { state } });
  return itemsOf<StatusRequest>(body);
}

export async function postStatusAnswer(id: string, statusText: string): Promise<StatusRequest> {
  return api<StatusRequest>(`/api/v1/status-requests/${encodeURIComponent(id)}/answer`, {
    method: "POST",
    body: { status_text: statusText },
  });
}

/** Rows plus the action's wording and the upcoming meeting's title and start. */
export async function toStatusViews(rows: StatusRequest[]): Promise<StatusRequestView[]> {
  const needMeetings = rows.some((r) => !r.meeting_title || r.meeting_scheduled_start === undefined);
  const needActions = rows.some((r) => !r.action_content);
  const [meetings, actions] = await Promise.all([
    needMeetings ? meetingInfoById() : Promise.resolve(new Map()),
    needActions ? actionTitleById() : Promise.resolve(new Map<string, string>()),
  ]);
  return rows.map((r) => {
    const m = meetings.get(r.meeting_id);
    return {
      ...r,
      actionTitle: r.action_content?.trim() || actions.get(r.action_id)?.trim() || "One of your open actions",
      meetingTitle: r.meeting_title?.trim() || m?.title?.trim() || "your next meeting",
      meetingStart: r.meeting_scheduled_start ?? m?.scheduledStart ?? null,
    };
  });
}

export async function fetchMyStatusRequests(state: StatusRequestState): Promise<StatusRequestView[]> {
  return toStatusViews(await fetchStatusRequests(state));
}
