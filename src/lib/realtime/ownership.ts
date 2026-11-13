/**
 * Who a decision or task card belongs to in the room: the same rule core-api enforces
 * (`core_api/routes/candidates.py::_require_card_owner`), so the room only offers Confirm,
 * Accept, Edit and Dismiss to the person who can actually use them.
 *
 *   - A task with an owner who is in the meeting is that owner's alone (not even the host's).
 *   - A decision, and a task with no owner in the meeting, belongs to whoever steers the
 *     meeting (its host or its creator).
 *
 * Everyone else still sees the card (it is the meeting's shared ledger) and who it waits for.
 * Pure: no React, no imports beyond types.
 */

import type { Candidate } from "./candidates.ts";

export type CardOwner =
  | { mine: true; by: "assignee" | "host" }
  | { mine: false; waitsFor: "host" }
  | { mine: false; waitsFor: "assignee"; userId: string };

export interface RoomViewer {
  /** Your internal user id. */
  meId: string | null;
  /** You host or created the meeting. */
  steers: boolean;
  /** The internal user ids of the meeting's participants. */
  participantIds: readonly string[];
}

export function cardOwner(c: Pick<Candidate, "kind" | "assigneeId">, viewer: RoomViewer): CardOwner {
  const assignee = c.kind === "action" ? (c.assigneeId ?? null) : null;
  if (assignee && viewer.participantIds.includes(assignee)) {
    return assignee === viewer.meId ? { mine: true, by: "assignee" } : { mine: false, waitsFor: "assignee", userId: assignee };
  }
  return viewer.steers ? { mine: true, by: "host" } : { mine: false, waitsFor: "host" };
}
