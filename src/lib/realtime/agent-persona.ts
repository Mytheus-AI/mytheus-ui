/**
 * How a person's agent is shown (mytheus-docs ADR-0038 D2): its name, its doodle face and its
 * personality preset. Pure, so the room, the meeting page and the tests share one rule.
 *
 * - `agent_name` NULL shows "{first name}'s agent".
 * - `agent_avatar_seed` NULL draws a default derived from the person's internal user id. It is
 *   salted with "agent:" so the agent never wears its person's own face (which is keyed by email).
 *
 * `agent_name` is a display label only (D2): never an agent class, never sent anywhere.
 */

import { defaultDoodleSeed, isDoodleSeed } from "../doodle.ts";
import type { AgentPersonality } from "../api/meeting-agenda-types.ts";

export const PERSONALITY_LABEL: Record<AgentPersonality, string> = {
  balanced: "Balanced",
  concise: "Concise",
  detailed: "Detailed",
  direct: "Direct",
  friendly: "Friendly",
};

/** A known preset, or "balanced" (the column default) for anything else. */
export function asPersonality(value: unknown): AgentPersonality {
  return typeof value === "string" && value in PERSONALITY_LABEL ? (value as AgentPersonality) : "balanced";
}

/** The doodle seed to draw an agent with. */
export function agentSeedFor(seed: string | null | undefined, userId: string): string {
  return isDoodleSeed(seed) ? seed : defaultDoodleSeed(`agent:${userId || "someone"}`);
}

/** The first word of a display name, for "{first name}'s agent". */
export function firstNameOf(fullName: string | null | undefined): string {
  return (fullName ?? "").trim().split(/\s+/)[0] ?? "";
}

/** The agent's display name. */
export function agentDisplayName(agentName: string | null | undefined, personName: string | null | undefined): string {
  const named = (agentName ?? "").trim();
  if (named) return named.slice(0, 40);
  const first = firstNameOf(personName);
  return first ? `${first}'s agent` : "Their agent";
}

/** What the room needs to draw one person's agent. */
export interface AgentFace {
  name: string;
  seed: string;
}

export function agentFace(
  userId: string,
  personName: string | null | undefined,
  agentName: string | null | undefined,
  agentSeed: string | null | undefined,
): AgentFace {
  return { name: agentDisplayName(agentName, personName), seed: agentSeedFor(agentSeed, userId) };
}
