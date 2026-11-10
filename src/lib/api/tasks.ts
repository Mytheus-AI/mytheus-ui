/**
 * My Tasks read: core-api `GET /api/v1/actions/mine?status=confirmed|done` (Phase 4). Unlike the
 * older `GET /api/v1/actions?assignee_id=me`, it includes tasks created by hand with no meeting
 * (`meeting_id: null`), so a task made with New task appears on My work and on Home. Every row is
 * already the caller's own confirmed (or done) task; there is nothing to filter here.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts` (it reads the Clerk session server-side).
 */

import { api, apiSafe } from "@/lib/api/client";
import type { components as CoreApiSchemas } from "@/lib/api/generated/core-api";
import { taskFromMine, type TaskItem } from "@/lib/tasks";

export type MineTask = CoreApiSchemas["schemas"]["Task"];
type TaskList = CoreApiSchemas["schemas"]["TaskList"];

/** Open and completed tasks, in the server's order (soonest due first, undated last). */
export async function fetchMyTasks(assigneeName: string): Promise<TaskItem[]> {
  const [open, done] = await Promise.all(
    (["confirmed", "done"] as const).map((status) => api<TaskList>("/api/v1/actions/mine", { query: { status } })),
  );
  return [...open.items, ...done.items].map((t) => taskFromMine(t, assigneeName));
}

/** Home's task arm: the caller's open tasks, meeting or not, or `failed` when unreadable. */
export async function fetchMyOpenTasks(): Promise<{ items: MineTask[]; failed: boolean }> {
  const res = await apiSafe<TaskList>("/api/v1/actions/mine", { query: { status: "confirmed" } });
  return res.ok ? { items: res.data.items, failed: false } : { items: [], failed: true };
}
