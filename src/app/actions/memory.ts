"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { deleteMemory, patchMemory } from "@/lib/api/memory";
import { MAX_TOPIC_LABEL, type MemoryUpdate, type PersonMemory } from "@/lib/memory";

/* Settings > Agent memory: change what your agent remembers. Every call is the caller's own
   memory (core-api keys it on the verified user), so nothing here names a person. */

const PATH = "/settings/memory";

export type MemoryResult = { ok: true; memory: PersonMemory } | { ok: false; message: string };
export type ForgetResult = { ok: true } | { ok: false; message: string };

function clean(list: unknown, max: number): string[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out = list.filter((s): s is string => typeof s === "string").map((s) => s.trim().slice(0, max)).filter(Boolean);
  return out.length ? out.slice(0, 20) : undefined;
}

function failure(err: unknown, fallback: string): { ok: false; message: string } {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 422) return { ok: false, message: "That change could not be saved as entered." };
  }
  return { ok: false, message: fallback };
}

export async function updateMemory(input: MemoryUpdate): Promise<MemoryResult> {
  const body: MemoryUpdate = {};
  if (typeof input.learning_enabled === "boolean") body.learning_enabled = input.learning_enabled;
  const pin = clean(input.pin_topics, MAX_TOPIC_LABEL);
  const forget = clean(input.forget_topics, MAX_TOPIC_LABEL);
  const unmute = clean(input.unmute_topics, MAX_TOPIC_LABEL);
  const questions = clean(input.forget_questions, 500);
  if (pin) body.pin_topics = pin;
  if (forget) body.forget_topics = forget;
  if (unmute) body.unmute_topics = unmute;
  if (questions) body.forget_questions = questions;
  if (Object.keys(body).length === 0) return { ok: false, message: "Nothing to change." };
  try {
    const memory = await patchMemory(body);
    revalidatePath(PATH);
    return { ok: true, memory };
  } catch (err) {
    return failure(err, "Your change could not be saved just now. Try again in a moment.");
  }
}

export async function forgetEverything(): Promise<ForgetResult> {
  try {
    await deleteMemory();
  } catch (err) {
    return failure(err, "Your agent's memory could not be cleared just now. Nothing was forgotten. Try again.");
  }
  revalidatePath(PATH);
  return { ok: true };
}
