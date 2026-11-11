/**
 * "Decisions that follow you" on core-api: where a confirmed decision was challenged, and the
 * requests to reopen it. Types in `decision-challenges-types.ts`.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import type {
  DecisionChallenge,
  DecisionChallenges,
  ReopenAcceptBody,
  ReopenRequest,
  ReopenRequestCreate,
  ReopenRequestList,
} from "@/lib/api/decision-challenges-types";

const enc = encodeURIComponent;

export type ChallengesRead =
  | { kind: "ok"; data: DecisionChallenges }
  | { kind: "not-found" }
  | { kind: "unavailable" };

/** The decision page's section. 404 (not yours to see, or gone) is told apart from a failed read. */
export async function readDecisionChallenges(decisionId: string): Promise<ChallengesRead> {
  if (!process.env.API_GATEWAY_URL && !process.env.NEXT_PUBLIC_API_GATEWAY_URL) return { kind: "unavailable" };
  try {
    const data = await api<DecisionChallenges>(`/api/v1/decisions/${enc(decisionId)}/challenges`);
    return {
      kind: "ok",
      data: {
        ...data,
        items: Array.isArray(data?.items) ? data.items : [],
        reopen_requests: Array.isArray(data?.reopen_requests) ? data.reopen_requests : [],
      },
    };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return { kind: "not-found" };
    return { kind: "unavailable" };
  }
}

export async function fetchReopenRequests(
  role: "owner" | "requester" | "all" = "owner",
  status: "pending" | "resolved" | "all" = "pending",
): Promise<ReopenRequest[]> {
  const body = await api<ReopenRequestList>("/api/v1/decision-reopen-requests", { query: { role, status } });
  return Array.isArray(body?.items) ? body.items : [];
}

export async function fetchReopenRequest(id: string): Promise<ReopenRequest> {
  return api<ReopenRequest>(`/api/v1/decision-reopen-requests/${enc(id)}`);
}

export async function postChallengeDismiss(id: string): Promise<DecisionChallenge> {
  return api<DecisionChallenge>(`/api/v1/decision-challenges/${enc(id)}/dismiss`, { method: "POST", body: {} });
}

export async function postReopenRequest(decisionId: string, body: ReopenRequestCreate): Promise<ReopenRequest> {
  return api<ReopenRequest>(`/api/v1/decisions/${enc(decisionId)}/reopen-requests`, { method: "POST", body });
}

export async function postReopenAccept(id: string, body: ReopenAcceptBody): Promise<ReopenRequest> {
  return api<ReopenRequest>(`/api/v1/decision-reopen-requests/${enc(id)}/accept`, { method: "POST", body });
}

export async function postReopenDecline(id: string, note?: string): Promise<ReopenRequest> {
  return api<ReopenRequest>(`/api/v1/decision-reopen-requests/${enc(id)}/decline`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

export async function postReopenWithdraw(id: string): Promise<ReopenRequest> {
  return api<ReopenRequest>(`/api/v1/decision-reopen-requests/${enc(id)}/withdraw`, { method: "POST", body: {} });
}
