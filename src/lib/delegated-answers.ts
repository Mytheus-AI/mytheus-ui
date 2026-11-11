/**
 * Pre-approved answers for an agent sent in your place (only-Mytheus wave, contract section 2).
 * Pure: the editor, the server action and the tests share these rules, which match the server's:
 * at most 10 statements, each 1 to 300 characters after trimming, duplicates collapsed.
 */

import type { DelegatedAnswerEntry } from "./api/only-mytheus-types";

export const DELEGATED_LIMITS = { statementsMax: 10, charsMax: 300 } as const;

/** Spaces collapsed and trimmed, as the server stores it. */
export function cleanStatement(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const keyOf = (text: string) => cleanStatement(text).toLowerCase();

export type AddResult = { ok: true; list: string[] } | { ok: false; message: string };

export function addStatement(
  list: readonly string[],
  text: string,
  limits: { statementsMax: number; charsMax: number } = DELEGATED_LIMITS,
): AddResult {
  const clean = cleanStatement(text);
  if (!clean) return { ok: false, message: "Write a statement first." };
  if (clean.length > limits.charsMax) return { ok: false, message: `Keep each statement to ${limits.charsMax} characters.` };
  if (list.some((s) => keyOf(s) === keyOf(clean))) return { ok: false, message: "That one is already on the list." };
  if (list.length >= limits.statementsMax) {
    return { ok: false, message: `Your agent can carry at most ${limits.statementsMax} statements.` };
  }
  return { ok: true, list: [...list, clean] };
}

/** Clean, drop blanks and duplicates, keep the order: what a save sends. */
export function normalizeStatements(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const clean = cleanStatement(s);
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
  }
  return out;
}

export function sameStatements(a: readonly string[], b: readonly string[]): boolean {
  const x = normalizeStatements(a);
  const y = normalizeStatements(b);
  return x.length === y.length && x.every((s, i) => s === y[i]);
}

export type StatementsCheck = { ok: true; statements: string[] } | { ok: false; message: string };

export function checkStatements(
  list: unknown,
  limits: { statementsMax: number; charsMax: number } = DELEGATED_LIMITS,
): StatementsCheck {
  if (!Array.isArray(list)) return { ok: false, message: "Those statements could not be read." };
  const statements = normalizeStatements(list.filter((s): s is string => typeof s === "string"));
  if (statements.length > limits.statementsMax) {
    return { ok: false, message: `Your agent can carry at most ${limits.statementsMax} statements.` };
  }
  if (statements.some((s) => s.length > limits.charsMax)) {
    return { ok: false, message: `Keep each statement to ${limits.charsMax} characters.` };
  }
  return { ok: true, statements };
}

/** "Sarah" from "Sarah Okafor"; a blank name reads as "Your teammate". */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "Your teammate";
}

/** Exactly what the agent says to a question it has no statement for. */
export function uncoveredAnswer(name: string | null | undefined): string {
  return `${firstName(name)} didn't pre-approve an answer to that.`;
}

/** "4 questions, 3 answered from your statements". */
export function logSummary(entries: readonly DelegatedAnswerEntry[]): string {
  const n = entries.length;
  if (n === 0) return "Nobody asked your agent anything.";
  const covered = entries.filter((e) => e.covered).length;
  const asked = `${n} ${n === 1 ? "question" : "questions"}`;
  if (covered === n) return `${asked}, all answered from your statements.`;
  if (covered === 0) return `${asked}, none covered by your statements.`;
  return `${asked}, ${covered} answered from your statements.`;
}
