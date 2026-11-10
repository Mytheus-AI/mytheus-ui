"use server";

import { revalidatePath } from "next/cache";

import { api, ApiError } from "@/lib/api/client";

export type MarkDoneResult = { ok: true } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mark one of the caller's tasks done through core-api (`POST /api/v1/actions/{id}/done`).
 * The server decides who may (the assignee or an admin) and what may (only a confirmed task);
 * this action only reports the answer. Idempotent server-side, and `api()` sends an
 * Idempotency-Key, so a double click is harmless. Completing a task emits no event: it is
 * progress, not a new decision or action for the knowledge graph.
 */
export async function markTaskDone(id: string): Promise<MarkDoneResult> {
  if (!UUID.test(id)) return { ok: false, message: "That task does not exist." };
  try {
    await api(`/api/v1/actions/${id}/done`, { method: "POST" });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 404) return { ok: false, message: "That task no longer exists." };
      if (err.status === 403) return { ok: false, message: "Only the assignee can complete this task." };
      if (err.status === 409) return { ok: false, message: "This task is not confirmed yet." };
    }
    return { ok: false, message: "Could not complete the task. Try again." };
  }
  revalidatePath("/work/tasks");
  return { ok: true };
}

export type CreateTaskResult =
  | { ok: true; id: string }
  | { ok: false; message: string; notConnected?: boolean; field?: "content" | "due_date" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Create a task by hand: `POST /api/v1/actions {content, due_date?, assignee_id?}` on core-api,
 * a confirmed action assigned to the caller (or `assignee_id`), with no meeting. `api()` sends an
 * Idempotency-Key, so a double submit creates one task.
 *
 * The endpoint is being added by the backend (Phase 2, reach builder). Until a gateway has it, the
 * server answers 404 or 405 and this returns `notConnected`, which the dialog shows as an explicit
 * "not connected yet" state rather than a generic failure; it lights up with no UI change.
 */
export async function createTask(input: { content: string; dueDate?: string | null; assigneeId?: string | null }): Promise<CreateTaskResult> {
  const content = input.content.trim();
  if (!content) return { ok: false, message: "Give the task a title.", field: "content" };
  if (content.length > 500) return { ok: false, message: "Keep the title under 500 characters.", field: "content" };
  const due = input.dueDate?.trim() || null;
  if (due && !DATE.test(due)) return { ok: false, message: "Pick a valid due date.", field: "due_date" };
  if (input.assigneeId && !UUID.test(input.assigneeId)) return { ok: false, message: "That person is not in the workspace." };
  try {
    const row = await api<{ id: string }>("/api/v1/actions", {
      method: "POST",
      body: { content, ...(due ? { due_date: due } : {}), ...(input.assigneeId ? { assignee_id: input.assigneeId } : {}) },
    });
    revalidatePath("/work/tasks");
    return { ok: true, id: row?.id ?? "" };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404 || err.status === 405) {
        return { ok: false, notConnected: true, message: "Creating tasks by hand is not connected yet." };
      }
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 422) return { ok: false, message: "The task could not be saved as written. Check the title and date." };
    }
    return { ok: false, message: "Could not create the task. Try again." };
  }
}
