/**
 * Decision reversal (only-Mytheus wave, contract section 1) on core-api. When a confirmed
 * decision is superseded, every open task from the old decision's meeting that has an owner gets
 * a reversal row, and its owner is asked: keep, re-scope or close this task?
 *
 *   GET  /api/v1/decision-reversals?status=pending|resolved|all   the caller's own, newest first
 *   GET  /api/v1/decision-reversals/{id}                           404 if not the caller's
 *   POST /api/v1/decision-reversals/{id}/resolve                   {resolution, content?, due_date?}
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type {
  DecisionReversal,
  DecisionReversalList,
  ReversalResolveBody,
} from "@/lib/api/only-mytheus-types";

export async function fetchDecisionReversals(status: "pending" | "resolved" | "all" = "pending"): Promise<DecisionReversal[]> {
  const body = await api<DecisionReversalList>("/api/v1/decision-reversals", { query: { status } });
  return Array.isArray(body?.items) ? body.items : [];
}

export async function fetchDecisionReversal(id: string): Promise<DecisionReversal> {
  return api<DecisionReversal>(`/api/v1/decision-reversals/${encodeURIComponent(id)}`);
}

export async function postReversalResolution(id: string, body: ReversalResolveBody): Promise<DecisionReversal> {
  return api<DecisionReversal>(`/api/v1/decision-reversals/${encodeURIComponent(id)}/resolve`, { method: "POST", body });
}
