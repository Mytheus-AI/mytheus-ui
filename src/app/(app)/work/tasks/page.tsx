import type { Metadata } from "next";
import { DecisionReversals } from "@/components/reversals/DecisionReversals";
import { TasksView } from "@/components/tasks/TasksView";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyTasks } from "@/lib/api/tasks";

export const metadata: Metadata = { title: "Tasks | Mytheus" };

/* My work, Tasks (Plan 7-9 §3.8 step 2): the caller's confirmed action items from
   `GET /api/v1/actions?assignee_id=me`, grouped by due date, with mark-done. Only confirmed
   items ever appear: a proposed candidate is not a task until someone confirms it. A failed
   read (including no gateway configured) is thrown to `error.tsx`, never dressed up as sample
   data. */
export default async function TasksPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const org = await resolveOrgContext();
  const tasks = await fetchMyTasks(org?.user.name ?? "You");
  const reversal = typeof searchParams?.reversal === "string" ? searchParams.reversal : null;
  return (
    <>
      <DecisionReversals focusId={reversal} />
      <TasksView actions={tasks} />
    </>
  );
}
