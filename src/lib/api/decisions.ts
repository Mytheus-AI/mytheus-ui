/**
 * The decision log read: `GET /api/v1/decisions` on `core-api`. Confirmed (and superseded)
 * decisions from meetings the caller was in, newest first. Participant scoping and tenancy are
 * the server's; nothing is filtered here.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type { components as CoreApiSchemas } from "@/lib/api/generated/core-api";
import type { DecisionLogEntry } from "@/lib/api/types";

type DecisionLog = CoreApiSchemas["schemas"]["DecisionLog"];

/** A logged decision as the Decisions screen renders it. */
export type DecisionView = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  content: string;
  rationale: string | null;
  status: DecisionLogEntry["status"];
  supersedes: string | null;
  supersededBy: string | null;
  recordedAt: string;
};

export function toDecisionView(d: DecisionLogEntry): DecisionView {
  return {
    id: d.id,
    meetingId: d.meeting_id,
    meetingTitle: d.meeting_title ?? "Untitled meeting",
    content: d.content,
    rationale: d.rationale ?? null,
    status: d.status,
    supersedes: d.supersedes ?? null,
    supersededBy: d.superseded_by ?? null,
    recordedAt: d.created_at,
  };
}

export async function fetchDecisionLog(): Promise<DecisionView[]> {
  const log = await api<DecisionLog>("/api/v1/decisions");
  return log.items.map(toDecisionView);
}
