"use server";

import { api, ApiError } from "@/lib/api/client";

/* Ask / Dismiss / Save for the QuestionAgent's suggested questions (Plan 7-9 section 3.10,
   ADR-0034 D7). A suggestion is its owner's private prompt: none of these commits or publishes
   anything, and core-api answers 404 to anyone but the owner. Nothing about the tenant or the
   user is taken from the input. */

export type SuggestionVerb = "ask" | "dismiss" | "save";

export type SuggestionResult = { ok: true; status: string } | { ok: false; message: string; gone?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAST: Record<SuggestionVerb, string> = { ask: "marked as asked", dismiss: "dismissed", save: "saved" };

function failure(err: unknown, verb: SuggestionVerb): SuggestionResult {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 404) return { ok: false, message: "That question is no longer here.", gone: true };
    if (err.status === 409) return { ok: false, message: "That question was already settled.", gone: true };
  }
  return { ok: false, message: `The question couldn't be ${PAST[verb]} just now. Try again in a moment.` };
}

async function transition(verb: SuggestionVerb, id: string): Promise<SuggestionResult> {
  if (!UUID.test(id)) return { ok: false, message: "That card is no longer valid.", gone: true };
  // A card can arrive live a moment before core-api has stored its row (the gateway and the
  // consumer read the same topic independently), so a 404 is retried briefly before it is
  // believed, as for candidates.
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await api<{ status: string }>(`/api/v1/suggestions/${id}/${verb}`, { method: "POST", body: {} });
      return { ok: true, status: row.status };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return failure(err, verb);
    }
  }
}

export async function askSuggestion(id: string): Promise<SuggestionResult> {
  return transition("ask", id);
}

export async function dismissSuggestion(id: string): Promise<SuggestionResult> {
  return transition("dismiss", id);
}

export async function saveSuggestion(id: string): Promise<SuggestionResult> {
  return transition("save", id);
}
