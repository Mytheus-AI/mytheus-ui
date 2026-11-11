/**
 * The company time machine on core-api ("Beyond the meeting", Layer 3).
 *
 *   GET /api/v1/time-machine/snapshot?as_of=&topic=   the decision graph at the end of a day
 *   GET /api/v1/time-machine/diff?from=&to=&topic=    what changed between two dates, and why
 *   GET /api/v1/time-machine/timeline?topic=&from=&to= one topic, step by step, with quotes
 *
 * Only what the caller may see (meetings they were in). SERVER-ONLY (`lib/api/client.ts`).
 */

import { api } from "@/lib/api/client";
import type { Diff, Snapshot, Timeline } from "@/lib/api/bets-types";

export async function fetchSnapshot(asOf: string, topic?: string): Promise<Snapshot> {
  return api<Snapshot>("/api/v1/time-machine/snapshot", { query: { as_of: asOf, topic: topic || undefined } });
}

export async function fetchDiff(from: string, to: string, topic?: string): Promise<Diff> {
  return api<Diff>("/api/v1/time-machine/diff", { query: { from, to, topic: topic || undefined } });
}

export async function fetchTimeline(topic: string, from?: string, to?: string): Promise<Timeline> {
  return api<Timeline>("/api/v1/time-machine/timeline", { query: { topic, from: from || undefined, to: to || undefined } });
}
