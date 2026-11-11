/**
 * Decisions as bets on core-api ("Beyond the meeting", Layer 3).
 *
 *   GET  /api/v1/decisions/{id}/bet            the bet (or none), who may change it, hints
 *   PUT  /api/v1/decisions/{id}/bet            add or edit the expectation
 *   POST /api/v1/decisions/{id}/bet/{accept|dismiss|restore|resolve|reopen}
 *   GET  /api/v1/bets/mine                     bets you own
 *   GET  /api/v1/bets/calibration              "How good are our calls" (aggregates only)
 *   GET  /api/v1/bets/hints?q=&category=       lessons for a decision being written
 *
 * Participant-scoped by the server: a decision from a meeting you were not in is a 404.
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type { BetHints, BetResolve, BetUpsert, Calibration, DecisionBetView, MyBets } from "@/lib/api/bets-types";

const enc = encodeURIComponent;

export async function fetchDecisionBet(decisionId: string): Promise<DecisionBetView> {
  return api<DecisionBetView>(`/api/v1/decisions/${enc(decisionId)}/bet`);
}

export async function putDecisionBet(decisionId: string, body: BetUpsert): Promise<DecisionBetView> {
  return api<DecisionBetView>(`/api/v1/decisions/${enc(decisionId)}/bet`, { method: "PUT", body });
}

export type BetTransition = "accept" | "dismiss" | "restore" | "reopen";

export async function postBetTransition(decisionId: string, step: BetTransition): Promise<DecisionBetView> {
  return api<DecisionBetView>(`/api/v1/decisions/${enc(decisionId)}/bet/${step}`, { method: "POST" });
}

export async function postBetResolve(decisionId: string, body: BetResolve): Promise<DecisionBetView> {
  return api<DecisionBetView>(`/api/v1/decisions/${enc(decisionId)}/bet/resolve`, { method: "POST", body });
}

export async function fetchMyBets(): Promise<MyBets> {
  return api<MyBets>("/api/v1/bets/mine");
}

export async function fetchCalibration(): Promise<Calibration> {
  return api<Calibration>("/api/v1/bets/calibration");
}

export async function fetchBetHints(q: string, category?: string | null): Promise<BetHints> {
  return api<BetHints>("/api/v1/bets/hints", { query: { q, category: category ?? undefined } });
}
