/**
 * Decision lineage read. Plan 7-9 §3.8 step 3: `GET /bff/meetings/:meetingId/decisions/:id/lineage`,
 * which `bff` answers from `knowledge-graph-service`'s `decision_lineage` template (the
 * `FOLLOWS_FROM` chain, oldest first). The tenant is the session's, decided server-side.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api, ApiError } from "@/lib/api/client";
import type { components as BffSchemas } from "@/lib/api/generated/bff";

export type DecisionLineage = BffSchemas["schemas"]["DecisionLineage"];
export type LineageDecision = BffSchemas["schemas"]["LineageDecision"];

export type LineageResult =
  | { kind: "live"; lineage: DecisionLineage }
  | { kind: "not-found" }
  | { kind: "unavailable" };

export async function fetchDecisionLineage(
  meetingId: string,
  decisionId: string,
): Promise<LineageResult> {
  try {
    const lineage = await api<DecisionLineage>(
      `/bff/meetings/${encodeURIComponent(meetingId)}/decisions/${encodeURIComponent(decisionId)}/lineage`,
    );
    return { kind: "live", lineage };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404 || error.status === 422) return { kind: "not-found" };
      if ([502, 503].includes(error.status)) return { kind: "unavailable" };
    }
    throw error;
  }
}
