"use server";

import { api, ApiError } from "@/lib/api/client";
import type { RagResponse } from "@/lib/rag/answer";

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
