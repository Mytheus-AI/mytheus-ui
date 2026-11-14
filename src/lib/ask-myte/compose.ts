/**
 * The Ask Myte composer's pure parts: the history rail's groups, the slash shortcuts, `@`
 * mentions, and what each failure says, in the Myte's own voice (ADR-0047 D9, D10).
 *
 * Pure, tested in tests/ask-myte-compose.test.ts.
 */

import type { ThreadSummary } from "./types.ts";
import type { AnswerFailure } from "./reducer.ts";
import { dayIn, weekOf } from "./starters.ts";

/* ---------------- the history rail ---------------- */

export type GroupKey = "pinned" | "today" | "week" | "earlier";
export interface ThreadGroup {
  key: GroupKey;
  label: string;
  items: ThreadSummary[];
}

const GROUP_LABEL: Record<GroupKey, string> = { pinned: "Pinned", today: "Today", week: "This week", earlier: "Earlier" };

/** Pinned first, then Today, This week and Earlier by the last message, newest first. Each
    thread appears once; empty groups are left out. */
export function groupThreads(items: readonly ThreadSummary[], now: Date, timeZone: string): ThreadGroup[] {
  const today = dayIn(now, timeZone);
  const week = weekOf(today);
  const groups: Record<GroupKey, ThreadSummary[]> = { pinned: [], today: [], week: [], earlier: [] };
  const sorted = [...items].sort((a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at));
  for (const t of sorted) {
    if (t.pinned) {
      groups.pinned.push(t);
      continue;
    }
    const at = Date.parse(t.last_message_at);
    const day = Number.isNaN(at) ? "" : dayIn(new Date(at), timeZone);
    if (day === today) groups.today.push(t);
    else if (day && day >= week.start) groups.week.push(t);
    else groups.earlier.push(t);
  }
  return (["pinned", "today", "week", "earlier"] as const).filter((k) => groups[k].length > 0).map((k) => ({ key: k, label: GROUP_LABEL[k], items: groups[k] }));
}

/* ---------------- slash shortcuts ---------------- */

export interface Shortcut {
  name: "prep" | "recap" | "owe" | "asof" | "draft" | "routine";
  label: string;
  description: string;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { name: "prep", label: "/prep", description: "Prep me for my next meeting, or one you name" },
  { name: "recap", label: "/recap", description: "Recap my last meeting, or one you name" },
  { name: "owe", label: "/owe", description: "What I owe this week" },
  { name: "asof", label: "/asof", description: "Ask what was true on a date" },
  { name: "draft", label: "/draft", description: "Draft a follow-up I can copy" },
  { name: "routine", label: "/routine", description: "Ask something on a schedule" },
];

/** The shortcuts matching what is typed so far ("/re" offers /recap). Null unless the text is a
    lone slash word at the start. */
export function matchShortcuts(text: string): Shortcut[] | null {
  const m = /^\/([a-z]*)$/i.exec(text);
  if (!m) return null;
  const q = m[1].toLowerCase();
  return SHORTCUTS.filter((s) => s.name.startsWith(q));
}

/** A typed shortcut turned into the question it stands for. `asof` opens the date picker and
    keeps whatever followed it as the question. Null when the text is not a shortcut. */
export function expandShortcut(text: string): { question: string; picker: "as_of" | "routine" | null } | null {
  const m = /^\/(prep|recap|owe|asof|draft|routine)\b\s*([\s\S]*)$/i.exec(text.trim());
  if (!m) return null;
  const rest = m[2].trim();
  switch (m[1].toLowerCase()) {
    case "prep":
      return { question: rest ? `Prep me for ${rest}` : "Prep me for my next meeting", picker: null };
    case "recap":
      return { question: rest ? `Recap ${rest}` : "Recap my last meeting", picker: null };
    case "owe":
      return { question: rest ? `What do I owe ${rest}?` : "What do I owe this week?", picker: null };
    case "draft":
      return { question: rest ? `Draft ${rest}` : "Draft a follow-up for my last meeting that I can copy", picker: null };
    case "routine":
      return { question: rest, picker: "routine" };
    default:
      return { question: rest, picker: "as_of" };
  }
}

/* ---------------- @ mentions ---------------- */

export type MentionKind = "meeting" | "person" | "decision";
export interface Mentionable {
  kind: MentionKind;
  id: string;
  label: string;
  hint?: string | null;
}

/** The `@word` being typed at the caret, if any: where it starts and what is typed after `@`. */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|\s)@([^\s@]{0,40})$/.exec(before);
  if (!m) return null;
  return { start: before.length - m[2].length - 1, query: m[2] };
}

/** Replace the `@word` at the caret with the chosen name; returns the new text and caret. */
export function applyMention(text: string, at: { start: number; query: string }, label: string): { text: string; caret: number } {
  const end = at.start + 1 + at.query.length;
  const insert = `@${label} `;
  const next = text.slice(0, at.start) + insert + text.slice(end).replace(/^ /, "");
  return { text: next, caret: at.start + insert.length };
}

/** Best matches first: a label starting with the query, then a word starting with it, then any
    match; meetings and people before decisions on ties. */
export function rankMentions(query: string, items: readonly Mentionable[], limit = 8): Mentionable[] {
  const q = query.trim().toLowerCase();
  const order: Record<MentionKind, number> = { meeting: 0, person: 1, decision: 2 };
  const score = (it: Mentionable): number => {
    const l = it.label.toLowerCase();
    if (!q) return 3;
    if (l.startsWith(q)) return 0;
    if (l.split(/[\s\-:,]+/).some((w) => w.startsWith(q))) return 1;
    if (l.includes(q)) return 2;
    return -1;
  };
  return items
    .map((it) => ({ it, s: score(it) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || order[a.it.kind] - order[b.it.kind] || a.it.label.localeCompare(b.it.label))
    .slice(0, limit)
    .map((x) => x.it);
}

/* ---------------- what a failure says (D10) ---------------- */

export interface FailureCopy {
  title: string;
  detail: string;
  retry: boolean;
  /** a way out besides Retry */
  action?: { label: string; href: string } | null;
}

/** In character, first person, plain. `message` is what rag-service said, kept when it says
    more than ours (a budget's return date, say). */
export function failureCopy(reason: AnswerFailure | "stopped", opts: { name: string; message?: string | null; isAdmin?: boolean }): FailureCopy {
  const extra = opts.message?.trim() || "";
  switch (reason) {
    case "stopped":
      return { title: "Stopped.", detail: "Ask again to continue.", retry: true };
    case "not_connected":
      return {
        title: "I'm not connected on this workspace yet.",
        detail: opts.isAdmin ? "You can connect me in the Workspace console." : "A workspace admin can connect me. Until then I can't look anything up.",
        retry: false,
        action: opts.isAdmin ? { label: "Open Workspace", href: "/workspace" } : null,
      };
    case "budget":
      return {
        title: "Your workspace reached its AI limit.",
        detail: extra || "Answers come back when the limit resets, or sooner if an admin raises it.",
        retry: false,
        action: opts.isAdmin ? { label: "Usage and billing", href: "/workspace/billing" } : null,
      };
    case "session":
      return { title: "Your session expired.", detail: "Sign in again and ask me once more.", retry: false, action: { label: "Sign in again", href: "/sign-in" } };
    case "invalid":
      return { title: "I couldn't take that question.", detail: extra || "Keep it under 2000 characters and try again.", retry: false };
    case "offline":
      return { title: "You're offline.", detail: "I kept what I had so far. Ask again when you're back online.", retry: true };
    default:
      return { title: "I couldn't answer just now.", detail: "Nothing was lost. Try again in a moment.", retry: true };
  }
}
