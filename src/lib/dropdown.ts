/**
 * The pure parts of the shared dropdown (`components/ui/Dropdown.tsx`): keyboard movement that
 * skips disabled options, type-to-jump, grouping, and where the panel goes so it stays on
 * screen. No React and no DOM, so each rule is unit tested on its own (tests/dropdown.test.ts).
 */

export type NavItem = { label: string; disabled?: boolean };

/** The first option that can be chosen, or -1 when none can. */
export function firstEnabled(items: readonly NavItem[]): number {
  return items.findIndex((it) => !it.disabled);
}

/** The last option that can be chosen, or -1 when none can. */
export function lastEnabled(items: readonly NavItem[]): number {
  for (let i = items.length - 1; i >= 0; i--) if (!items[i].disabled) return i;
  return -1;
}

/**
 * Moves `steps` enabled options from `from` in `dir`, stopping at the ends (a listbox does not
 * wrap). From -1 (nothing active) it starts at the first or last enabled option.
 */
export function stepEnabled(items: readonly NavItem[], from: number, dir: 1 | -1, steps = 1): number {
  if (from < 0) return dir === 1 ? firstEnabled(items) : lastEnabled(items);
  let at = from;
  let moved = 0;
  for (let i = from + dir; i >= 0 && i < items.length && moved < steps; i += dir) {
    if (!items[i].disabled) {
      at = i;
      moved += 1;
    }
  }
  return at;
}

/** Where opening starts: the chosen option when it can be chosen, else the first that can. */
export function openingIndex(items: readonly NavItem[], selected: number): number {
  return selected >= 0 && selected < items.length && !items[selected].disabled ? selected : firstEnabled(items);
}

/**
 * Type to jump. `query` is what was typed in the last moment. The search starts after the active
 * option and wraps, so typing "p" twice moves from Priya to Pricing. When the query is one
 * letter repeated ("ppp"), it cycles through the options starting with that letter, as a native
 * select does. Returns -1 when nothing matches.
 */
export function typeaheadMatch(items: readonly NavItem[], query: string, from: number): number {
  const q = query.toLocaleLowerCase();
  if (!q) return -1;
  const same = q.split("").every((ch) => ch === q[0]);
  const needle = same ? q[0] : q;
  const n = items.length;
  // A longer query keeps the current option if it still matches; a single letter moves on.
  const start = same ? from + 1 : Math.max(from, 0);
  for (let k = 0; k < n; k++) {
    const i = (start + k + n) % n;
    const it = items[i];
    if (!it.disabled && it.label.toLocaleLowerCase().trimStart().startsWith(needle)) return i;
  }
  return -1;
}

/** Consecutive options grouped by their `group`, in the order groups first appear. */
export function groupOptions<O extends { group?: string }>(options: readonly O[]): Array<{ group: string | null; items: Array<{ option: O; index: number }> }> {
  const out: Array<{ group: string | null; items: Array<{ option: O; index: number }> }> = [];
  const byName = new Map<string | null, (typeof out)[number]>();
  options.forEach((option, index) => {
    const g = option.group ?? null;
    let bucket = byName.get(g);
    if (!bucket) {
      bucket = { group: g, items: [] };
      byName.set(g, bucket);
      out.push(bucket);
    }
    bucket.items.push({ option, index });
  });
  return out;
}

/** The options in the order they are drawn (grouped), which is the order the arrows move in. */
export function drawOrder<O extends { group?: string }>(options: readonly O[]): O[] {
  return groupOptions(options).flatMap((g) => g.items.map((it) => it.option));
}

export type Rect = { top: number; left: number; width: number; height: number };
export type Placement = { top: number; left: number; width: number; maxHeight: number; side: "bottom" | "top" };

/**
 * Where the panel goes: under the trigger when it fits (or when there is more room below), else
 * above it, flipped. Its width is at least the trigger's, at most the viewport less the margins,
 * and it is shifted left or right to stay inside the viewport. `align: "end"` lines its right
 * edge up with the trigger's.
 */
export function placePanel(
  trigger: Rect,
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
  opts: { gap?: number; margin?: number; align?: "start" | "end"; maxHeight?: number; maxWidth?: number; matchWidth?: boolean } = {},
): Placement {
  const gap = opts.gap ?? 6;
  const margin = opts.margin ?? 8;
  const cap = opts.maxHeight ?? 320;
  // Never wider than the viewport; never wider than `maxWidth` unless the trigger already is.
  const maxWidth = Math.max(0, Math.min(viewport.width - margin * 2, Math.max(trigger.width, opts.maxWidth ?? 440)));
  const width = Math.min(maxWidth, Math.max(opts.matchWidth === false ? 0 : trigger.width, panel.width));

  const below = viewport.height - (trigger.top + trigger.height) - gap - margin;
  const above = trigger.top - gap - margin;
  const want = Math.min(panel.height, cap);
  const side: "bottom" | "top" = want <= below || below >= above ? "bottom" : "top";
  const room = Math.max(0, side === "bottom" ? below : above);
  const maxHeight = Math.max(Math.min(cap, room), Math.min(cap, 120));
  const height = Math.min(want, maxHeight);
  const top = side === "bottom" ? trigger.top + trigger.height + gap : trigger.top - gap - height;

  let left = opts.align === "end" ? trigger.left + trigger.width - width : trigger.left;
  left = Math.min(left, viewport.width - margin - width);
  left = Math.max(left, margin);
  return { top: Math.round(top), left: Math.round(left), width: Math.round(width), maxHeight: Math.round(maxHeight), side };
}
