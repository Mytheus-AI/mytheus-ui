/**
 * "Add agenda" in the room (components/room/AgendaQuickAdd.tsx): the host types items one per
 * line. A pasted list keeps working: bullets ("-", "*") and numbers ("1.", "2)") are dropped,
 * blank lines are skipped. Pure, so it is unit tested.
 */
export function itemsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}
