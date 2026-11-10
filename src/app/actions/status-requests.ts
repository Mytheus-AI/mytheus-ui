"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import { postStatusAnswer } from "@/lib/api/status-requests";
import { PERSONAL_LIMITS } from "@/lib/api/personal-types";

/* Answer a status request (ADR-0039 B7): one line on how an action you own is going, carried into
   the upcoming meeting's agenda. The request is the caller's own; core-api answers 404 to anyone
   else and 409 once it is answered or has expired. */

export type AnswerResult =
  | { ok: true; answeredAt: string }
  | { ok: false; message: string; gone?: boolean; field?: "status_text" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function answerStatusRequest(id: string, statusText: string): Promise<AnswerResult> {
  if (!UUID.test(id)) return { ok: false, message: "That request no longer exists.", gone: true };
  const text = (typeof statusText === "string" ? statusText : "").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, message: "Pick a status or write a line first.", field: "status_text" };
  if (text.length > PERSONAL_LIMITS.statusText) {
    return { ok: false, message: `Keep it under ${PERSONAL_LIMITS.statusText} characters.`, field: "status_text" };
  }
  let answeredAt = new Date().toISOString();
  try {
    const saved = await postStatusAnswer(id, text);
    if (saved && typeof saved.answered_at === "string") answeredAt = saved.answered_at;
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 404) return { ok: false, message: "That request no longer exists.", gone: true };
      if (err.status === 409) {
        return { ok: false, message: "This request was already answered or has expired.", gone: true };
      }
      if (err.status === 422) {
        return { ok: false, message: `Keep it under ${PERSONAL_LIMITS.statusText} characters.`, field: "status_text" };
      }
    }
    return { ok: false, message: "Your answer could not be sent just now. Try again in a moment." };
  }
  revalidatePath("/work/updates");
  revalidatePath("/dashboard");
  return { ok: true, answeredAt };
}
