"use client";

import { pushRecent, type RecentItem } from "@/lib/palette";

/* Recent items for the command palette: what you opened from it, and the detail pages you visited
   that named themselves (`<Crumb>`). This browser only, at most six. */

const KEY = "mx-recent";

export function readRecent(): RecentItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((r) => r && typeof r.href === "string" && typeof r.label === "string") : [];
  } catch {
    return [];
  }
}

export function rememberRecent(item: RecentItem) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pushRecent(readRecent(), item)));
  } catch {
    // Storage blocked: the palette simply has no recent items.
  }
}
