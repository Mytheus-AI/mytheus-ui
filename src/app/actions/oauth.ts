"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { decideConsent, disconnectApp } from "@/lib/api/oauth";
import { problemFromApi, safeReturnUrl, type ConsentProblem, type OAuthScope } from "@/lib/oauth-consent";

/* Approve or deny an app on the consent page, and disconnect one from Settings > API access. The
   person and the workspace come from the session; the request is the signed blob the
   authorization server put on the consent URL, re-validated by identity on every call. The answer
   is the app's own registered callback, which the page sends the browser to. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConsentDecisionResult =
  | { ok: true; redirectTo: string; decision: "approve" | "deny" }
  | { ok: false; message: string; problem?: ConsentProblem };

export async function decideAppConsent(input: { request: string; decision: "approve" | "deny"; scope?: OAuthScope }): Promise<ConsentDecisionResult> {
  if (!input.request || input.request.length > 8000) return { ok: false, message: "This sign-in link is not valid.", problem: "invalid_request" };
  try {
    const result = await decideConsent({ request: input.request, decision: input.decision, scope: input.decision === "approve" ? (input.scope ?? null) : null });
    const target = safeReturnUrl(result.redirect_to);
    if (!target) return { ok: false, message: "The app's return address is not safe to open." };
    return { ok: true, redirectTo: target, decision: result.decision };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again, then approve." };
      const problem = problemFromApi(err.status, err.reason);
      if (problem !== "unavailable") return { ok: false, message: "This request can no longer be approved.", problem };
    }
    return { ok: false, message: "Mytheus could not record your answer just now. Try again." };
  }
}

export type DisconnectResult = { ok: true } | { ok: false; message: string };

export async function disconnectConnectedApp(id: string): Promise<DisconnectResult> {
  if (!UUID.test(id)) return { ok: false, message: "That app is not connected." };
  try {
    await disconnectApp(id);
  } catch (err) {
    // Already gone: the goal state holds.
    if (!(err instanceof ApiError && err.status === 404)) {
      if (err instanceof ApiError && err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      return { ok: false, message: "The app could not be disconnected just now. Try again." };
    }
  }
  revalidatePath("/settings/api");
  return { ok: true };
}
