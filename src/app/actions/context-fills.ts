"use server";

import { api, ApiError } from "@/lib/api/client";

/* Dismiss for ContextGapAgent context fills (Phase P10, plan 3.5). A fill is its requester's
   private context: dismissing it only hides it for them, and core-api answers 404 to anyone else.
   Nothing about the tenant or the user is taken from the input. */

export type ContextFillResult = { ok: true } | { ok: false; message: string; gone?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function dismissContextFill(id: string): Promise<ContextFillResult> {
  if (!UUID.test(id)) return { ok: false, message: "That card is no longer valid.", gone: true };
  // A card can arrive live a moment before core-api has stored its row (the gateway and the
  // consumer read agent-results independently), so a 404 is retried briefly before it is
  // believed, as for suggestions and candidates.
  for (let attempt = 0; ; attempt++) {
    try {
      await api(`/api/v1/context-fills/${id}/dismiss`, { method: "POST", body: {} });
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      if (err instanceof ApiError) {
        if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
        if (err.status === 404) return { ok: false, message: "That context is no longer here.", gone: true };
      }
      return { ok: false, message: "The context couldn't be dismissed just now. Try again in a moment." };
    }
  }
}
