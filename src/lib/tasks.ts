/**
 * The My Tasks view model, shared by the server fetch and the client screen.
 *
 * A real action item has a due date only when one was said in the meeting, and no priority at
 * all (`action_items` has no priority column), so both are nullable here. The mock tasks carry
 * both, which is why the screen still renders them in the sample (no-gateway) mode.
 */

import type { Priority } from "@/lib/mock/data";

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
