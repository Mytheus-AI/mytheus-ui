/**
 * My Tasks read. Plan 7-9 §3.8 step 2: `GET /api/v1/actions?assignee_id=me&status=...` on
 * `core-api` (ADR-0031 D3). Every row is already the caller's own confirmed (or done) task, so
 * there is nothing to filter here, and `assignee_id=me` is the only value the route accepts.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts` (it reads the Clerk session server-side).
 */

import { api } from "@/lib/api/client";
import type { components as CoreApiSchemas } from "@/lib/api/generated/core-api";
import type { TaskItem } from "@/lib/tasks";

export type MyTask = CoreApiSchemas["schemas"]["MyTask"];
type MyTaskList = CoreApiSchemas["schemas"]["MyTaskList"];

export function toTaskItem(t: MyTask, assigneeName: string): TaskItem {
  return {
    id: t.id,
    meetingId: t.meeting_id,
    meetingTitle: t.meeting_title,
    title: t.content,
    assignee: assigneeName,
    dueDate: t.due_date ?? null,
    priority: null,
    status: t.status === "done" ? "done" : "open",
  };
}

/** Open and completed tasks, in the server's order (soonest due first, undated last). */
export async function fetchMyTasks(assigneeName: string): Promise<TaskItem[]> {
  const [open, done] = await Promise.all(
    (["confirmed", "done"] as const).map((status) =>
      api<MyTaskList>("/api/v1/actions", { query: { assignee_id: "me", status } }),
    ),
  );
  return [...open.items, ...done.items].map((t) => toTaskItem(t, assigneeName));
}
