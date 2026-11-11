/**
 * The promise ledger on core-api (Beyond the meeting, Layer 2):
 *
 *   GET    /api/v1/promises?status=&channel=&recipient=   the caller's ledger, every channel
 *   POST   /api/v1/promises?tz=                            a manual add (+ the capacity check)
 *   PATCH  /api/v1/promises/{id}                           kept, dropped, reopened, edited
 *   POST   /api/v1/promises/{id}/confirm?tz=               an agent-found promise becomes yours
 *   POST   /api/v1/promises/{id}/hand-off                  give it to a colleague (+ /undo)
 *   GET    /api/v1/promises/capacity?start=&days=&tz=      your days
 *   GET    /api/v1/promises/capacity/check?due_date=&tz=   one more thing on that day?
 *   POST   /api/v1/promises/date-proposals                 renegotiate a date (promise or action)
 *   GET    /api/v1/promises/date-proposals?role=           asked of you / asked by you
 *   POST   /api/v1/promises/date-proposals/{id}/accept|decline|withdraw
 *   GET|PUT /api/v1/promises/capture-preferences           may your agent read your Slack, email
 *
 * Private to the caller: anyone else's promise is a 404. SERVER-ONLY, inherited from
 * `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type {
  Capacity,
  CapacityCheck,
  CaptureSettings,
  DateProposal,
  LedgerPromise,
  PromiseLedgerBody,
  RenegotiateResult,
} from "@/lib/promises/ledger";

export async function fetchLedger(): Promise<PromiseLedgerBody> {
  return api<PromiseLedgerBody>("/api/v1/promises");
}

export async function fetchCapacity(tz?: string, start?: string): Promise<Capacity> {
  return api<Capacity>("/api/v1/promises/capacity", { query: { tz, start, days: 7 } });
}

export async function fetchCapacityCheck(
  dueDate: string,
  tz?: string,
  exclude?: { kind: "commitment" | "action"; id: string },
): Promise<CapacityCheck> {
  return api<CapacityCheck>("/api/v1/promises/capacity/check", {
    query: { due_date: dueDate, tz, exclude_kind: exclude?.kind, exclude_id: exclude?.id },
  });
}

export async function fetchProposals(role: "incoming" | "outgoing"): Promise<DateProposal[]> {
  const body = await api<{ items: DateProposal[] }>("/api/v1/promises/date-proposals", { query: { role } });
  return body.items ?? [];
}

export async function postPromise(
  body: {
    content: string;
    due_at?: string | null;
    recipient_user_id?: string | null;
    recipient_label?: string | null;
    source_link?: string | null;
  },
  tz?: string,
): Promise<{ promise: LedgerPromise; capacity: CapacityCheck | null }> {
  return api("/api/v1/promises", { method: "POST", body, query: { tz } });
}

export async function patchPromise(
  id: string,
  body: { status?: "open" | "done" | "dismissed"; due_at?: string | null; clear_due?: boolean },
): Promise<LedgerPromise> {
  return api(`/api/v1/promises/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

export async function postConfirm(
  id: string,
  dueAt: string | null,
  tz?: string,
): Promise<{ promise: LedgerPromise; capacity: CapacityCheck | null }> {
  return api(`/api/v1/promises/${encodeURIComponent(id)}/confirm`, {
    method: "POST",
    body: dueAt ? { due_at: dueAt } : {},
    query: { tz },
  });
}

export async function postHandOff(
  id: string,
  toUserId: string,
  note: string | null,
): Promise<{ promise: LedgerPromise; handed_to_name: string | null; copy_id: string }> {
  return api(`/api/v1/promises/${encodeURIComponent(id)}/hand-off`, {
    method: "POST",
    body: { to_user_id: toUserId, note },
  });
}

export async function postUndoHandOff(id: string): Promise<LedgerPromise> {
  return api(`/api/v1/promises/${encodeURIComponent(id)}/hand-off/undo`, { method: "POST", body: {} });
}

export async function postDateProposal(body: {
  target: "commitment" | "action";
  target_id: string;
  proposed_due: string;
  note?: string | null;
}): Promise<RenegotiateResult> {
  return api("/api/v1/promises/date-proposals", { method: "POST", body });
}

export async function postProposalDecision(
  id: string,
  verb: "accept" | "decline" | "withdraw",
): Promise<DateProposal> {
  return api(`/api/v1/promises/date-proposals/${encodeURIComponent(id)}/${verb}`, { method: "POST", body: {} });
}

export async function putCapturePreferences(prefs: { slack_enabled: boolean; email_enabled: boolean }): Promise<CaptureSettings> {
  return api("/api/v1/promises/capture-preferences", { method: "PUT", body: prefs });
}
