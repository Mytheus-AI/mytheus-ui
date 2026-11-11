/**
 * Settle threads on core-api (a4 contract, section 3d): a clash between two teams' confirmed
 * decisions, readable and actionable only by the two owners (anyone else: 404). SERVER-ONLY,
 * inherited from `client.ts`. Paths and bodies come from `lib/settlements.ts`.
 *
 *   GET  /api/v1/settlements?status=open|all     {items}, newest first, max 100
 *   GET  /api/v1/settlements/{id}                Settlement
 *   POST .../messages {body} | share | keep-both {note} | supersede {winner_decision_id}
 *        | accept | decline                      Settlement
 *   GET  .../meeting-slot                        {start, end, people, title}
 *   POST .../book {start?}                       201 {meeting_id, start, end, title}
 */

import { load, send } from "@/lib/api/why-blast-call";
import type { BookedMeeting, Load, Settlement, SlotProposal } from "@/lib/api/why-blast-types";
import { normalizeSlot } from "@/lib/decision-why";
import { normalizeSettlement, normalizeSettlements, settleRoutes, type SettleReq } from "@/lib/settlements";

export function fetchSettlements(status: "open" | "all" = "all"): Promise<Load<Settlement[]>> {
  return load(settleRoutes.list(status), normalizeSettlements);
}

export function fetchSettlement(id: string): Promise<Load<Settlement>> {
  return load(settleRoutes.one(id), normalizeSettlement);
}

/** Every write answers the whole thread as it now is. */
export async function settleWrite(req: SettleReq): Promise<Settlement> {
  const s = normalizeSettlement(await send<unknown>(req));
  if (!s) throw new Error("Malformed settlement");
  return s;
}

export async function fetchSettleSlot(id: string): Promise<SlotProposal> {
  const slot = normalizeSlot(await send<unknown>(settleRoutes.slot(id)));
  if (!slot) throw new Error("Malformed slot");
  return slot;
}

export function postSettleBook(id: string, start: string | null): Promise<BookedMeeting> {
  return send<BookedMeeting>(settleRoutes.book(id, start));
}
