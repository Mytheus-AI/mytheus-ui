"use server";

import { api, ApiError } from "@/lib/api/client";
import type { RagResponse } from "@/lib/rag/answer";
import type { AskAgentResult, AskAnswer } from "@/lib/rag/ask-live";

/* Ask: `POST /api/rag/query` through the gateway with the user's own session (rag-service,
   mytheus-docs ADR-0033). Retrieval is scoped to the meetings this user took part in plus the
   org's documents; nothing about the tenant or the user is taken from the input. */

export type AskResult = { ok: true; data: RagResponse } | { ok: false; message: string };

export async function askQuestion(question: string): Promise<AskResult> {
  const query = question.trim().slice(0, 1000);
  if (!query) return { ok: false, message: "Type a question first." };
  try {
    const data = await api<RagResponse>("/api/rag/query", {
      method: "POST",
      body: { query, generate: true },
    });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 503) {
        return { ok: false, message: "Ask is not available right now. Try again in a moment." };
      }
    }
    return { ok: false, message: "That question couldn't be answered just now. Try again." };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Ask your Myte, live (polish program, Phase 1): the meeting room's private ask box. bff's
   `POST /api/v1/ask` through the gateway with the caller's own session; bff asks rag-service on
   their behalf, scoped to the meetings they took part in and the company brain. `meetingId`
   narrows it to this meeting. Read-only and private: nothing is posted to the room. */
export async function askAgent(question: string, meetingId: string | null = null): Promise<AskAgentResult> {
  const q = question.trim().slice(0, 1000);
  if (!q) return { ok: false, reason: "invalid", message: "Type a question first." };
  try {
    const data = await api<AskAnswer>("/api/v1/ask", {
      method: "POST",
      body: { question: q, meeting_id: meetingId && UUID.test(meetingId) ? meetingId : null },
    });
    return { ok: true, data: { ...data, citations: Array.isArray(data?.citations) ? data.citations : [] } };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, reason: "session", message: "Your session expired. Sign in again." };
      if (err.status === 503 && err.reason === "ask_not_connected") {
        return {
          ok: false,
          reason: "not_connected",
          message: "Ask is not connected on this workspace yet. Your Myte can answer once an admin connects it.",
        };
      }
      if (err.status === 422) return { ok: false, reason: "invalid", message: "That question is too long. Try a shorter one." };
    }
    return { ok: false, reason: "unavailable", message: "Your Myte could not answer just now. Try again in a moment." };
  }
}
