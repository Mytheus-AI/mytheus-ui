/**
 * The room's keyboard shortcuts (polish program, Phase 0; WCAG 2.1.4 Character Key Shortcuts).
 *
 * Single-key shortcuts (M, V, C, L, H, 1, 2) can be turned off, and they never fire while you type:
 * not in an input, a textarea, a select, anything editable or a textbox role, and not with a
 * modifier held. The on/off choice is a per-browser convenience kept in localStorage; the room
 * works the same without it.
 *
 * Pure apart from the storage helpers, which never throw.
 */

export type ShortcutAction = "mic" | "camera" | "captions" | "layout" | "hand" | "call" | "notes";

export const SHORTCUTS: ReadonlyArray<{ key: string; action: ShortcutAction; label: string }> = [
  { key: "m", action: "mic", label: "Mute or unmute" },
  { key: "v", action: "camera", label: "Camera on or off" },
  { key: "c", action: "captions", label: "Captions on or off" },
  { key: "l", action: "layout", label: "Grid or speaker view" },
  { key: "h", action: "hand", label: "Raise or lower your hand" },
  { key: "1", action: "call", label: "Call view" },
  { key: "2", action: "notes", label: "Notes view" },
];

export const SHORTCUTS_KEY = "mytheus.room-shortcuts";

/** The element a key press came from, reduced to what matters. */
export interface KeyTarget {
  tagName?: string;
  isContentEditable?: boolean;
  role?: string | null;
  type?: string | null;
}

const TYPING_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
]);

/** True when the key press belongs to a text field, not to the room. */
export function isTypingTarget(t: KeyTarget | null | undefined): boolean {
  if (!t) return false;
  const tag = (t.tagName ?? "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return TYPING_INPUT_TYPES.has((t.type ?? "").toLowerCase());
  if (t.isContentEditable) return true;
  return t.role === "textbox" || t.role === "combobox" || t.role === "searchbox";
}

/** The action for a key press, or null when it is not a room shortcut or must not fire. */
export function shortcutFor(
  e: { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; repeat?: boolean },
  target: KeyTarget | null | undefined,
  enabled: boolean,
): ShortcutAction | null {
  if (!enabled || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return null;
  if (isTypingTarget(target)) return null;
  const k = e.key.toLowerCase();
  return SHORTCUTS.find((s) => s.key === k)?.action ?? null;
}

export function loadShortcutsEnabled(): boolean {
  try {
    return localStorage.getItem(SHORTCUTS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveShortcutsEnabled(on: boolean): void {
  try {
    localStorage.setItem(SHORTCUTS_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the choice holds for this visit.
  }
}

/** Reads what `isTypingTarget` needs from a DOM element (attributes, so it works everywhere). */
export function keyTargetOf(el: Element | null | undefined): KeyTarget | null {
  if (!el) return null;
  return {
    tagName: el.tagName,
    isContentEditable: (el as HTMLElement).isContentEditable === true,
    role: el.getAttribute("role"),
    type: el.tagName === "INPUT" ? ((el as HTMLInputElement).type ?? el.getAttribute("type")) : null,
  };
}
