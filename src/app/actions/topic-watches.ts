"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import { createTopicWatch, deleteTopicWatch } from "@/lib/api/topic-watches";
import { validateTopic, type TopicWatch } from "@/lib/api/personal-types";

/* Add or remove one of the caller's watched topics (ADR-0039 A6, self only). The same rules the
   API enforces are checked first so a mistake is answered without a round trip; the API stays
   the authority (409 duplicate, 422 past the limits). */

export type AddWatchResult = { ok: true; watch: TopicWatch } | { ok: false; message: string };
export type RemoveWatchResult = { ok: true } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function addTopicWatch(topic: string, existing: string[]): Promise<AddWatchResult> {
  const check = validateTopic(typeof topic === "string" ? topic : "", Array.isArray(existing) ? existing.filter((t) => typeof t === "string") : []);
  if (!check.ok) return check;
  try {
    const watch = await createTopicWatch(check.topic);
    revalidatePath("/agent");
    return { ok: true, watch };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 409) return { ok: false, message: `You already watch ${check.topic}.` };
      if (err.status === 422) return { ok: false, message: "You can watch up to 20 topics, each under 80 characters." };
    }
    return { ok: false, message: "That topic could not be added just now. Try again in a moment." };
  }
}

export async function removeTopicWatch(id: string): Promise<RemoveWatchResult> {
  if (!UUID.test(id)) return { ok: true };
  try {
    await deleteTopicWatch(id);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      // Already gone is what was asked for.
      if (err.status === 404) return { ok: true };
    }
    return { ok: false, message: "That topic could not be removed just now. Try again in a moment." };
  }
  revalidatePath("/agent");
  return { ok: true };
}
