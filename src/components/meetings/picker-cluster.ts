/* The member picker's rules, kept free of React so they can be tested on their own: toggling a
   person in or out of the picked list, which picked faces show in the one-line cluster and how
   many fold into the "+N" ball, and what is announced when the selection changes. */

/** How many balls the cluster shows in one line, the "+N" ball included. */
export const CLUSTER_MAX = 8;

/** Adds the person if they are not picked, removes them if they are. Order is the picking order. */
export function toggleId(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}

/**
 * Which picked people show as balls. Up to `max` fit as they are; past that the most recent
 * `max - 1` stay visible (so the face you just picked always lands somewhere you can see) and
 * the earlier ones fold into one "+N" ball. `expanded` shows everyone.
 */
export function clusterOf<T>(picked: readonly T[], max = CLUSTER_MAX, expanded = false): { visible: T[]; hidden: T[] } {
  if (expanded || picked.length <= max) return { visible: [...picked], hidden: [] };
  const keep = Math.max(1, max - 1);
  return { visible: picked.slice(picked.length - keep), hidden: picked.slice(0, picked.length - keep) };
}

/** "No one picked yet", "1 person", "3 people". */
export function peopleCount(n: number): string {
  if (n === 0) return "No one picked yet";
  return n === 1 ? "1 person" : `${n} people`;
}

/** The polite announcement after a pick or a removal. */
export function selectionMessage(name: string, added: boolean, count: number): string {
  return `${added ? "Added" : "Removed"} ${name}. ${count === 0 ? "No one picked." : `${peopleCount(count)} picked.`}`;
}

/** Where focus goes after the item at `index` leaves a list of `length` (before removal). */
export function neighbourAfterRemoval(index: number, length: number): number | null {
  if (length <= 1) return null;
  return index < length - 1 ? index : index - 1;
}
