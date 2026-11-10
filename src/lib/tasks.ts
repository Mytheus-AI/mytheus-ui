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
  /** Null for a task added by hand (`POST /api/v1/actions` with no meeting). */
  meetingId: string | null;
  meetingTitle: string | null;
  title: string;
  assignee: string;
  dueDate: string | null;
  priority: Priority | null;
  status: TaskStatus;
};

/** One row of core-api `GET /api/v1/actions/mine` (the generated `Task` schema, kept structural
 *  here so this module stays importable from tests without the generated client). */
export type MineTask = {
  id: string;
  content: string;
  due_date?: string | null;
  meeting_id?: string | null;
  meeting_title?: string | null;
  status: "confirmed" | "done";
};

/** A `/actions/mine` row as the My work screen shows it. A task with no meeting keeps a null
 *  meeting (shown "Added by hand"); a meeting with no title reads "Untitled meeting". */
export function taskFromMine(t: MineTask, assigneeName: string): TaskItem {
  const meetingId = t.meeting_id ?? null;
  return {
    id: t.id,
    meetingId,
    meetingTitle: meetingId ? t.meeting_title?.trim() || "Untitled meeting" : null,
    title: t.content,
    assignee: assigneeName,
    dueDate: t.due_date ?? null,
    priority: null,
    status: t.status === "done" ? "done" : "open",
  };
}
