import type { Metadata } from "next";
import { TasksView } from "@/components/tasks/TasksView";
import { mockActions } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Tasks | Mytheus" };

/* My Tasks: action items from meetings, with List and Board views, due-date groups, filters and a
   read-only quick view. Data still comes from mockActions until the tasks endpoint ships; the
   view, filters and panel are a single client island (TasksView). */
export default function TasksPage() {
  return <TasksView actions={mockActions} />;
}
