"use server";

import { api, ApiError } from "@/lib/api/client";

/* Confirm / Edit / Dismiss for the agent's decision and action candidates (Plan 7-9 section 3.8
   step 1). Confirm is the ONLY thing that commits: `core-api` writes the row and publishes the
   `decisions` / `actions` event in one transaction. Edit rewrites the proposed row. Dismiss
   publishes nothing. Nothing about the tenant or the user is taken from the input. */

export type CandidateKind = "decision" | "action";

export type CandidateRowOut = {
  id: string;
  content: string;
  status: string;
  rationale?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
};

export type CandidateResult = { ok: true; row: CandidateRowOut } | { ok: false; message: string; gone?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const base = (kind: CandidateKind) => (kind === "decision" ? "/api/v1/decisions" : "/api/v1/actions");
const noun = (kind: CandidateKind) => (kind === "decision" ? "decision" : "task");

function failure(err: unknown, kind: CandidateKind, verb: string): CandidateResult {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 403) return { ok: false, message: `Only people in this meeting can ${verb} its ${noun(kind)}s.` };
    if (err.status === 404) return { ok: false, message: `That ${noun(kind)} is no longer here.`, gone: true };
    if (err.status === 409) return { ok: false, message: `Someone already settled this ${noun(kind)}.`, gone: true };
    if (err.status === 422) return { ok: false, message: "Some details weren't accepted. Check them and try again." };
  }
  return { ok: false, message: `The ${noun(kind)} couldn't be ${verb === "confirm" ? "confirmed" : verb === "dismiss" ? "dismissed" : "saved"} just now. Try again in a moment.` };
}

export async function confirmCandidate(kind: CandidateKind, id: string): Promise<CandidateResult> {
  if (!UUID.test(id)) return { ok: false, message: "That card is no longer valid.", gone: true };
  // A card can arrive live a moment before core-api has stored its row (ADR-0031 consequences),
  // so a 404 is retried briefly before it is believed.
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await api<CandidateRowOut>(`${base(kind)}/${id}/confirm`, { method: "POST", body: {} });
      return { ok: true, row };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return failure(err, kind, "confirm");
    }
  }
}

export async function dismissCandidate(kind: CandidateKind, id: string): Promise<CandidateResult> {
  if (!UUID.test(id)) return { ok: false, message: "That card is no longer valid.", gone: true };
  try {
    const row = await api<CandidateRowOut>(`${base(kind)}/${id}/dismiss`, { method: "POST", body: {} });
    return { ok: true, row };
  } catch (err) {
    return failure(err, kind, "dismiss");
  }
}

export async function editCandidate(
  kind: CandidateKind,
  id: string,
  fields: { content: string; rationale?: string | null; dueDate?: string | null },
): Promise<CandidateResult> {
  if (!UUID.test(id)) return { ok: false, message: "That card is no longer valid.", gone: true };
  const content = fields.content.trim();
  if (!content) return { ok: false, message: "It can't be empty." };
  if (content.length > 2000) return { ok: false, message: "That's too long." };
  const body: Record<string, unknown> = { content };
  if (kind === "decision" && fields.rationale !== undefined) body.rationale = fields.rationale?.trim() || null;
  if (kind === "action" && fields.dueDate !== undefined) {
    if (fields.dueDate && !DATE.test(fields.dueDate)) return { ok: false, message: "Pick a valid due date." };
    body.due_date = fields.dueDate || null;
  }
  try {
    const row = await api<CandidateRowOut>(`${base(kind)}/${id}`, { method: "PATCH", body });
    return { ok: true, row };
  } catch (err) {
    return failure(err, kind, "edit");
  }
}
