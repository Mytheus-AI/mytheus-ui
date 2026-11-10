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
