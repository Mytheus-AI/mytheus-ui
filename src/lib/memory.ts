/**
 * "What your agent remembers" (Settings > Agent memory), as pure functions.
 *
 * The server is core-api `GET/PATCH/DELETE /api/v1/me/memory`: the topics the agents learned
 * (with a decayed weight), the questions the person keeps asking, the topics they muted, what
 * they have open, and how sure each personal agent must be before it shows them something
 * (`calibration`). These helpers turn that into plain sentences and stable orderings, so the
 * copy is testable without a server. No imports beyond types: `tests/memory.test.ts` loads this
 * file directly.
 */

import type { components as CoreSchemas } from "./api/generated/core-api";

export type PersonMemory = CoreSchemas["schemas"]["PersonMemory"];
export type MemoryTopic = CoreSchemas["schemas"]["MemoryTopic"];
export type MemoryCalibration = CoreSchemas["schemas"]["MemoryCalibration"];
export type MemoryUpdate = {
  learning_enabled?: boolean;
  pin_topics?: string[];
  forget_topics?: string[];
  unmute_topics?: string[];
  forget_questions?: string[];
};

/** core-api's `MIN_SAMPLES_USER`: below this many rated items, the workspace threshold applies. */
export const PERSONAL_MIN_SAMPLES = 8;
export const MAX_TOPIC_LABEL = 80;

const AGENTS: Record<string, { name: string; noun: string; one: string }> = {
  PersonalListenerAgent: { name: "Notes", noun: "notes", one: "note" },
  QuestionAgent: { name: "Suggested questions", noun: "suggested questions", one: "suggested question" },
  ContextGapAgent: { name: "Context fills", noun: "context fills", one: "context fill" },
};

export function agentName(agent: string): string {
  return AGENTS[agent]?.name ?? agent.replace(/Agent$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** The threshold as the person reads it: two decimals, "0.75". */
export function thresholdLabel(surface: number): string {
  const clamped = Math.min(1, Math.max(0, surface));
  return clamped.toFixed(2);
}

/** "Your agent shows notes above 0.75 because you dismissed 4 of the last 10." */
export function calibrationSentence(c: Pick<MemoryCalibration, "agent" | "surface" | "personal" | "samples"> & { dismissed?: number }): string {
  const a = AGENTS[c.agent] ?? { noun: "items", one: "item" };
  const lead = `Your agent shows ${a.noun} above ${thresholdLabel(c.surface)}`;
  if (c.personal) {
    const dismissed = Math.max(0, Math.min(c.samples, Math.round(c.dismissed ?? 0)));
    if (dismissed === 0) return `${lead} because you kept all of the last ${c.samples}.`;
    return `${lead} because you dismissed ${dismissed} of the last ${c.samples}.`;
  }
  const left = Math.max(1, PERSONAL_MIN_SAMPLES - c.samples);
  return `${lead}, the workspace setting. It tunes to you after ${left} more ${left === 1 ? a.one : a.noun} you keep or dismiss.`;
}

/** Strongest first; pinned topics lead, then weight, then name. */
export function sortTopics(topics: MemoryTopic[]): MemoryTopic[] {
  return [...topics].sort((x, y) => Number(y.pinned) - Number(x.pinned) || y.weight - x.weight || x.label.localeCompare(y.label));
}

/** How strongly a topic weighs, relative to the strongest one: a 0..1 bar and a word for it. */
export function topicStrength(topic: Pick<MemoryTopic, "weight" | "pinned">, strongest: number): { share: number; label: string } {
  if (topic.pinned) return { share: 1, label: "Pinned" };
  const share = strongest > 0 ? Math.min(1, Math.max(0.06, topic.weight / strongest)) : 0.06;
  return { share, label: share >= 0.66 ? "Strong" : share >= 0.33 ? "Steady" : "Fading" };
}

/** A label typed to pin: single line, trimmed, at most `MAX_TOPIC_LABEL` characters. Null when
 *  empty, or already pinned (case ignored). */
export function cleanTopicLabel(raw: string, existing: MemoryTopic[]): string | null {
  const label = raw.replace(/\s+/g, " ").trim().slice(0, MAX_TOPIC_LABEL).trim();
  if (!label) return null;
  const lower = label.toLocaleLowerCase("en-US");
  if (existing.some((t) => t.pinned && t.label.toLocaleLowerCase("en-US") === lower)) return null;
  return label;
}

/** The memory after a PATCH, as the server will apply it (forget, unmute, pin), so the page can
 *  answer at once and reconcile when the server replies. */
export function applyUpdate(memory: PersonMemory, update: MemoryUpdate): PersonMemory {
  const same = (a: string, b: string) => a.toLocaleLowerCase("en-US") === b.toLocaleLowerCase("en-US");
  let topics = memory.topics;
  let muted = memory.muted_topics;
  let questions = memory.recurring_questions;
  for (const label of update.forget_topics ?? []) {
    topics = topics.filter((t) => !same(t.label, label));
    if (!muted.some((m) => same(m, label))) muted = [...muted, label];
  }
  for (const label of update.unmute_topics ?? []) muted = muted.filter((m) => !same(m, label));
  for (const label of update.pin_topics ?? []) {
    muted = muted.filter((m) => !same(m, label));
    const found = topics.find((t) => same(t.label, label));
    topics = found
      ? topics.map((t) => (t === found ? { ...t, pinned: true } : t))
      : [...topics, { label, weight: 1, mentions: 0, pinned: true, last_seen_at: null }];
  }
  for (const text of update.forget_questions ?? []) questions = questions.filter((q) => q.text !== text);
  return {
    ...memory,
    learning_enabled: update.learning_enabled ?? memory.learning_enabled,
    topics,
    muted_topics: muted,
    recurring_questions: questions,
  };
}

/** True when nothing has been learned or set yet (the first-visit state). */
export function isEmptyMemory(m: PersonMemory): boolean {
  return m.topics.length === 0 && m.recurring_questions.length === 0 && m.muted_topics.length === 0;
}

/** The memory after "Forget everything": nothing learned, the switch and the live lists kept. */
export function forgotten(m: PersonMemory): PersonMemory {
  return { ...m, topics: [], recurring_questions: [], muted_topics: [], updated_at: null };
}

/** "Asked 3 times" */
export function askedLabel(count: number): string {
  return count <= 1 ? "Asked once" : count === 2 ? "Asked twice" : `Asked ${count} times`;
}
