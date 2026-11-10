/**
 * Topic watches (ADR-0039 A6) on `identity-tenant-service`, self only:
 *
 *   GET    /api/v1/users/me/topic-watches
 *   POST   /api/v1/users/me/topic-watches       {topic}  (409 duplicate, 422 past 20 or 80 chars)
 *   DELETE /api/v1/users/me/topic-watches/{id}
 *
 * ProactiveAgent alerts a watcher when a watched topic comes up in a meeting they are not in,
 * only when the ADR-0013 PDP lets them see that meeting's context, and never from a
 * confidential meeting. HAND-WRITTEN TYPES (`personal-types.ts`) until the client is regenerated.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import { itemsOf, type TopicWatch } from "@/lib/api/personal-types";

const BASE = "/api/v1/users/me/topic-watches";

export async function fetchTopicWatches(): Promise<TopicWatch[]> {
  const rows = itemsOf<TopicWatch>(await api<unknown>(BASE));
  return rows.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
}

export async function createTopicWatch(topic: string): Promise<TopicWatch> {
  return api<TopicWatch>(BASE, { method: "POST", body: { topic } });
}

export async function deleteTopicWatch(id: string): Promise<void> {
  await api<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
