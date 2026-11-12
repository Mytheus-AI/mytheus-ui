"use client";

/* Per-browser display preferences for the signed-in app: the colour theme and whether single-key
   shortcuts (j, k, e, z in the inbox) are on. Kept in localStorage because they are conveniences
   of this device, not account data. Every change fires `mx-prefs` so open views follow at once. */

export type ThemeChoice = "light" | "dark" | "system";
const THEME_KEY = "mx-theme";
const SHORTCUTS_KEY = "mx-shortcuts";
const EVENT = "mx-prefs";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function themeChoice(): ThemeChoice {
  const t = read(THEME_KEY);
  return t === "light" || t === "dark" ? t : "system";
}

export function resolvedTheme(): "light" | "dark" {
  const c = themeChoice();
  if (c !== "system") return c;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Writes the resolved theme to `<html data-theme>`, where the dark token set reads it. */
export function applyTheme() {
  document.documentElement.setAttribute("data-theme", resolvedTheme());
}

/** Writes the choice and applies it (no re-render needed). "system" clears the saved choice. */
export function setThemeChoice(choice: ThemeChoice) {
  write(THEME_KEY, choice === "system" ? null : choice);
  applyTheme();
}

/** Keeps `<html data-theme>` in step with the OS setting (while the choice is "system") and with
    a choice made in another tab. Returns the unsubscribe. */
export function watchTheme(): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (themeChoice() === "system") applyTheme();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY || e.key === null) applyTheme();
  };
  media.addEventListener("change", onMedia);
  window.addEventListener("storage", onStorage);
  applyTheme();
  return () => {
    media.removeEventListener("change", onMedia);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleTheme() {
  setThemeChoice(resolvedTheme() === "dark" ? "light" : "dark");
}

export function shortcutsOn(): boolean {
  return read(SHORTCUTS_KEY) !== "off";
}

export function setShortcutsOn(on: boolean) {
  write(SHORTCUTS_KEY, on ? null : "off");
}

/** Subscribe to preference changes (this tab and others). Returns the unsubscribe. */
export function onPrefsChange(fn: () => void): () => void {
  const storage = (e: StorageEvent) => {
    if (e.key === THEME_KEY || e.key === SHORTCUTS_KEY) fn();
  };
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", storage);
  };
}
