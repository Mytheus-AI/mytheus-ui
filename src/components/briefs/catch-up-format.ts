/**
 * The catch-up's one-sentence summary (mytheus-docs ADR-0039 B8), so the page reads in a minute.
 * Pure, so the wording is unit tested.
 */

import type { MeetingCatchUp } from "../../lib/api/meeting-brain-types.ts";

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** What you own first, then what was decided, then how far the agenda got. */
export function catchUpLead(c: MeetingCatchUp): string {
  const own =
    c.assigned_to_me.length > 0
      ? `You now own ${plural(c.assigned_to_me.length, "action", "actions")}.`
      : "Nothing new is yours.";
  const covered = c.agenda.filter((a) => a.status === "covered").length;
  const rest: string[] = [];
  rest.push(c.decisions.length > 0 ? `${plural(c.decisions.length, "decision was", "decisions were")} made` : "no decisions were made");
  if (c.agenda.length > 0) rest.push(`${covered} of ${c.agenda.length} agenda items were covered`);
  const tail = rest.length === 2 ? `${rest[0]}, and ${rest[1]}` : rest[0];
  return `${own} ${tail.charAt(0).toUpperCase()}${tail.slice(1)}.`;
}
