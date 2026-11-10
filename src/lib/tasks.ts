/**
 * The My Tasks view model, shared by the server fetch and the client screen.
 *
 * A real action item has a due date only when one was said in the meeting, and no priority at
 * all (`action_items` has no priority column), so both are nullable here. The screen renders a
 * priority only when one is present, which today is never.
 */

import type { Priority } from "@/lib/types";

export type TaskStatus = "open" | "done";

export type TaskItem = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  title: string;
  assignee: string;
  dueDate: string | null;
  priority: Priority | null;
  status: TaskStatus;
};
