"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import { fetchDecisionReversal, postReversalResolution } from "@/lib/api/decision-reversals";
import type { DecisionReversal, ReversalResolution, ReversalResolveBody } from "@/lib/api/only-mytheus-types";
import { RESCOPE_LIMITS, isUuid } from "@/lib/reversals";

/* Keep, re-scope or close a task whose decision changed (only-Mytheus wave, contract section 1).
   The reversal is the caller's own; core-api answers 404 to anyone else. Repeating the same
   resolution is fine; a different one after it was settled is 409, and then the server's current
   row is read back so the screen shows what actually happened. */

export type ResolveResult =
  | { ok: true; reversal: DecisionReversal }
  | { ok: false; message: string; gone?: boolean; field?: "content" | "due_date"; current?: DecisionReversal };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function resolveDecisionReversal(
  id: string,
  resolution: ReversalResolution,
  fields: { content?: string; due_date?: string | null } = {},
): Promise<ResolveResult> {
  if (!isUuid(id)) return { ok: false, message: "That change is no longer here.", gone: true };
  if (resolution !== "keep" && resolution !== "rescope" && resolution !== "close") {
    return { ok: false, message: "Choose keep, re-scope or close." };
  }
  const body: ReversalResolveBody = { resolution };
  if (resolution === "rescope") {
    if (typeof fields.content === "string") {
      const content = fields.content.replace(/\s+/g, " ").trim();
      if (!content) return { ok: false, message: "Say what the task is now.", field: "content" };
      if (content.length > RESCOPE_LIMITS.contentMax) {
        return { ok: false, message: `Keep the task to ${RESCOPE_LIMITS.contentMax} characters.`, field: "content" };
      }
      body.content = content;
    }
    if (fields.due_date !== undefined) {
      if (fields.due_date !== null && !DATE.test(fields.due_date)) {
        return { ok: false, message: "Pick a due date, or leave it empty.", field: "due_date" };
      }
      body.due_date = fields.due_date;
    }
    if (body.content === undefined && body.due_date === undefined) {
      return { ok: false, message: "Change the task or its due date, or choose Keep task instead." };
    }
  }

  try {
    const reversal = await postReversalResolution(id, body);
    revalidatePath("/work/tasks");
    return { ok: true, reversal };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 404) return { ok: false, message: "That change is no longer here.", gone: true };
      if (err.status === 409) {
        const current = await fetchDecisionReversal(id).catch(() => undefined);
        return { ok: false, message: "This was already settled.", current };
      }
      if (err.status === 422) return { ok: false, message: "That change wasn't accepted. Check the task and its due date." };
    }
    return { ok: false, message: "That couldn't be saved just now. Try again in a moment." };
  }
}
