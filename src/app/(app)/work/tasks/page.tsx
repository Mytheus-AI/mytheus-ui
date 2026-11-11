import type { Metadata } from "next";
import { DecisionReversals } from "@/components/reversals/DecisionReversals";
import { TasksView } from "@/components/tasks/TasksView";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyTasks } from "@/lib/api/tasks";
import { listMembers } from "@/lib/api/members";

export const metadata: Metadata = { title: "Tasks | Mytheus" };

/* My work, Tasks: the caller's confirmed tasks from `GET /api/v1/actions/mine` (tasks added by
   hand with no meeting included), grouped by due date, with mark-done. The member list feeds the
   New task dialog's optional assignee picker; when it cannot load, the task is simply yours. Only confirmed
   items ever appear: a proposed candidate is not a task until someone confirms it. A failed
   read (including no gateway configured) is thrown to `error.tsx`, never dressed up as sample
   data. */
export default async function TasksPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const org = await resolveOrgContext();
  const [tasks, members] = await Promise.all([fetchMyTasks(org?.user.name ?? "You"), listMembers()]);
  const options = members?.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.imageUrl, isYou: m.isYou })) ?? null;
  const reversal = typeof searchParams?.reversal === "string" ? searchParams.reversal : null;
  return (
    <>
      <DecisionReversals focusId={reversal} />
      <TasksView actions={tasks} members={options} />
    </>
  );
}
