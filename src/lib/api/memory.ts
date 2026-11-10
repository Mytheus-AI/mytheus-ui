/**
 * The caller's own agent memory, core-api (polish program wave 2, the page is wave 3):
 *
 *   GET    /api/v1/me/memory     what the agents learned, what you changed, what you have open,
 *                                and how sure each personal agent must be (`PersonMemory`)
 *   PATCH  /api/v1/me/memory     {learning_enabled?, pin_topics?, forget_topics?, unmute_topics?,
 *                                forget_questions?} -> PersonMemory
 *   DELETE /api/v1/me/memory     forget everything -> 204
 *
 * Owner only by construction: there is no id in the path. SERVER-ONLY, inherited from
 * `lib/api/client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import type { MemoryUpdate, PersonMemory } from "@/lib/memory";

export type MemoryLoad = { kind: "live"; data: PersonMemory } | { kind: "unavailable" };

export async function loadMemory(): Promise<MemoryLoad> {
  try {
    return { kind: "live", data: await api<PersonMemory>("/api/v1/me/memory") };
  } catch (error) {
    if (error instanceof ApiError && error.isAuthFailure) throw error;
    return { kind: "unavailable" };
  }
}

export async function patchMemory(body: MemoryUpdate): Promise<PersonMemory> {
  return api<PersonMemory>("/api/v1/me/memory", { method: "PATCH", body });
}

export async function deleteMemory(): Promise<void> {
  await api<void>("/api/v1/me/memory", { method: "DELETE" });
}
