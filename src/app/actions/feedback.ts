"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { sendFeedback } from "@/lib/api/admin-tenant";
import { setFeedbackStatus } from "@/lib/api/admin-ops";
import { FEEDBACK_MAX, isFeedbackKind, isFeedbackStatus } from "@/lib/ops";
import { isUuid } from "@/lib/tenant-admin";

/* Bug reports and feedback (ADR-0046 D6). Sending is open to any signed-in member; marking a
   report is staff only, which admin-ops-service decides (403 otherwise) and logs. */

export type FeedbackResult = { ok: true } | { ok: false; message: string };

export async function submitFeedback(kind: string, message: string, page: string): Promise<FeedbackResult> {
  if (!isFeedbackKind(kind)) return { ok: false, message: "Pick bug or feedback." };
  const text = message.trim();
  if (!text) return { ok: false, message: "Write a few words first." };
  if (text.length > FEEDBACK_MAX) return { ok: false, message: `Keep it under ${FEEDBACK_MAX.toLocaleString("en-US")} characters.` };
  const where = page.trim().slice(0, 300);
  try {
    await sendFeedback({ kind, message: text, page: where || null });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 429) return { ok: false, message: "That is a lot of reports for one day. Try again tomorrow." };
    }
    return { ok: false, message: "It could not be sent just now. Try again in a moment." };
  }
  revalidatePath("/settings/feedback");
  return { ok: true };
}

export async function markFeedback(id: string, status: string): Promise<FeedbackResult> {
  if (!isUuid(id)) return { ok: false, message: "That report is not valid." };
  if (!isFeedbackStatus(status)) return { ok: false, message: "Unknown state." };
  try {
    await setFeedbackStatus(id, status);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { ok: false, message: "This account is not on the Mytheus staff list." };
    if (err instanceof ApiError && err.status === 404) return { ok: false, message: "That report is no longer here." };
    return { ok: false, message: "It could not be changed just now. Try again in a moment." };
  }
  revalidatePath("/ops/feedback");
  revalidatePath("/ops");
  return { ok: true };
}
