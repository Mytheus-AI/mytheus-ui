import type { Metadata } from "next";
import { TasksView } from "@/components/tasks/TasksView";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyTasks } from "@/lib/api/tasks";
import { mockActions } from "@/lib/mock/data";
import type { TaskItem } from "@/lib/tasks";

export const metadata: Metadata = { title: "Tasks | Mytheus" };

/* My Tasks (Plan 7-9 §3.8 step 2): the caller's confirmed action items from
   `GET /api/v1/actions?assignee_id=me`, grouped by due date, with mark-done. Only confirmed
   items ever appear: a proposed candidate is not a task until someone confirms it.

   With no gateway configured (a local UI-only run) the page shows the sample tasks, the same
   rule the Usage page follows. A real failure is thrown to `error.tsx`, never dressed up as
   sample data. */
export default async function TasksPage() {
  if (!process.env.API_GATEWAY_URL && !process.env.NEXT_PUBLIC_API_GATEWAY_URL) {
    const sample: TaskItem[] = mockActions.map((a) => ({ ...a }));
    return <TasksView actions={sample} />;
  }
  const org = await resolveOrgContext();
  const tasks = await fetchMyTasks(org?.user.name ?? "You");
  return <TasksView actions={tasks} live />;
}
