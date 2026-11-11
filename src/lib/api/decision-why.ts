/**
 * "Decisions that know why" on core-api (a4 contract, section 3). SERVER-ONLY, inherited from
 * `client.ts`. Paths and bodies come from `lib/decision-why.ts`, where they are tested.
 *
 *   GET    /api/v1/decisions/{id}/why                  DecisionWhy
 *   POST   /api/v1/decisions/{id}/assumptions          (owner) 201 Assumption, max 12 live (422)
 *   PATCH  /api/v1/assumptions/{id}                    (owner) Assumption
 *   DELETE /api/v1/assumptions/{id}                    (owner) 204, soft remove
 *   POST   /api/v1/assumptions/{id}/reconfirm          (owner) {note} Assumption
 *   POST   /api/v1/assumptions/{id}/reopen-decision    (owner) {note?} DecisionWhy
 *   GET    /api/v1/assumptions/{id}/revisit-slot       (owner) {start, end, people, title}
 *   POST   /api/v1/assumptions/{id}/book-revisit       (owner) {start?} 201 {meeting_id, start, end, title}
 */

import { load, send } from "@/lib/api/why-blast-call";
import type { Assumption, AssumptionCreate, AssumptionPatch, BookedMeeting, DecisionWhy, Load, SlotProposal } from "@/lib/api/why-blast-types";
import { normalizeAssumption, normalizeSlot, normalizeWhy, whyRoutes } from "@/lib/decision-why";

export function fetchDecisionWhy(decisionId: string): Promise<Load<DecisionWhy>> {
  return load(whyRoutes.why(decisionId), normalizeWhy);
}

function assumptionOrThrow(raw: unknown): Assumption {
  const a = normalizeAssumption(raw);
  if (!a) throw new Error("Malformed assumption");
  return a;
}

export async function postAssumption(decisionId: string, body: AssumptionCreate): Promise<Assumption> {
  return assumptionOrThrow(await send<unknown>(whyRoutes.add(decisionId, body)));
}

export async function patchAssumption(id: string, body: AssumptionPatch): Promise<Assumption> {
  return assumptionOrThrow(await send<unknown>(whyRoutes.edit(id, body)));
}

export async function deleteAssumption(id: string): Promise<void> {
  await send<void>(whyRoutes.remove(id));
}

export async function postReconfirm(id: string, note: string): Promise<Assumption> {
  return assumptionOrThrow(await send<unknown>(whyRoutes.reconfirm(id, note)));
}

export async function postReopen(id: string, note: string | null): Promise<DecisionWhy> {
  const why = normalizeWhy(await send<unknown>(whyRoutes.reopen(id, note)));
  if (!why) throw new Error("Malformed decision");
  return why;
}

export async function fetchRevisitSlot(id: string): Promise<SlotProposal> {
  const slot = normalizeSlot(await send<unknown>(whyRoutes.revisitSlot(id)));
  if (!slot) throw new Error("Malformed slot");
  return slot;
}

export async function postBookRevisit(id: string, start: string | null): Promise<BookedMeeting> {
  return send<BookedMeeting>(whyRoutes.bookRevisit(id, start));
}
