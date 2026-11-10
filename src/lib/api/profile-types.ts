/**
 * The working profile and agent persona of ADR-0038 (D1, D2, D3): the wire shapes of
 * `GET /users/me` and `PATCH /users/{user_id}` on `identity-tenant-service`, the limits the API
 * enforces, and pure helpers to clean and check what a person typed before it is sent.
 *
 * Hand-written until the generated client is regenerated from the new OpenAPI document; the
 * names and limits mirror the ADR exactly. Pure (no imports but the doodle seeds), so it runs on
 * the server, in the browser and under `node --test`.
 */

import { isDoodleSeed } from "../doodle.ts";
import { agentSeedFor } from "../realtime/agent-persona.ts";

/* ---------------- shapes ---------------- */

export const PERSONALITIES = ["balanced", "concise", "detailed", "direct", "friendly"] as const;
export type AgentPersonality = (typeof PERSONALITIES)[number];

/** `UserProfile` with the six ADR-0038 fields. */
export type UserProfile = {
  id: string;
  email: string;
  avatar_url: string | null;
  role: string | null;
  skills: string[];
  bio: string | null;
  listen_for: string[];
  ignore_topics: string[];
  agent_name: string | null;
  agent_avatar_seed: string | null;
  agent_personality: AgentPersonality;
  agent_instructions: string | null;
  created_at: string;
  updated_at: string;
};

/** `PATCH /users/{user_id}` body. Every field optional; an empty string for the three nullable
    persona fields stores NULL on the server. */
export type UserProfileUpdate = {
  role?: string | null;
  skills?: string[] | null;
  bio?: string | null;
  listen_for?: string[];
  ignore_topics?: string[];
  agent_name?: string | null;
  agent_avatar_seed?: string | null;
  agent_personality?: AgentPersonality;
  agent_instructions?: string | null;
};

/* ---------------- limits (ADR-0038 D1, D2) ---------------- */

export const LIMITS = {
  role: 200,
  bio: 1000,
  /** onboarding asks for at least this much; the API does not */
  bioMinOnboarding: 20,
  skills: { max: 30, itemMax: 100 },
  listenFor: { max: 15, itemMax: 100 },
  ignoreTopics: { max: 15, itemMax: 100 },
  agentName: 40,
  agentInstructions: 500,
} as const;

export function isPersonality(value: unknown): value is AgentPersonality {
  return typeof value === "string" && (PERSONALITIES as readonly string[]).includes(value);
}

/** Trimmed, empties dropped, duplicates (ignoring case) dropped, first spelling kept. */
export function cleanList(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.replace(/\s+/g, " ").trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Split typed or pasted text into list items on commas and new lines. */
export function splitItems(text: string): string[] {
  return text.split(/[,\n]/);
}

/**
 * Bring a profile from the wire into the full shape. Tolerates a server that has not shipped the
 * ADR-0038 columns yet (missing lists become empty, an unknown personality reads as balanced).
 */
export function normalizeProfile(raw: Partial<UserProfile> & { id: string }): UserProfile {
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const text = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
  return {
    id: raw.id,
    email: raw.email ?? "",
    avatar_url: raw.avatar_url ?? null,
    role: text(raw.role),
    skills: list(raw.skills),
    bio: text(raw.bio),
    listen_for: list(raw.listen_for),
    ignore_topics: list(raw.ignore_topics),
    agent_name: text(raw.agent_name),
    agent_avatar_seed: isDoodleSeed(raw.agent_avatar_seed) ? raw.agent_avatar_seed : null,
    agent_personality: isPersonality(raw.agent_personality) ? raw.agent_personality : "balanced",
    agent_instructions: text(raw.agent_instructions),
    created_at: raw.created_at ?? "",
    updated_at: raw.updated_at ?? "",
  };
}

/* ---------------- validation ---------------- */

export type ProfileField = "role" | "bio" | "skills" | "listen_for" | "ignore_topics";
export type PersonaField = "agent_name" | "agent_avatar_seed" | "agent_personality" | "agent_instructions";
export type FieldErrors<F extends string> = Partial<Record<F, string>>;
export type Checked<F extends string, V> = { ok: true; value: V } | { ok: false; errors: FieldErrors<F> };

export type ProfileInput = {
  role: string;
  bio: string;
  skills: readonly string[];
  listen_for: readonly string[];
  ignore_topics: readonly string[];
};

export type ProfileValue = {
  role: string | null;
  bio: string | null;
  skills: string[];
  listen_for: string[];
  ignore_topics: string[];
};

function checkList(
  items: string[],
  limit: { max: number; itemMax: number },
  noun: { one: string; many: string },
): string | undefined {
  const long = items.find((i) => i.length > limit.itemMax);
  if (long) return `Keep each ${noun.one} under ${limit.itemMax} characters. "${long.slice(0, 24)}..." is too long.`;
  if (items.length > limit.max) return `Keep it to ${limit.max} ${noun.many} or fewer.`;
  return undefined;
}

/**
 * Check the working profile. `onboarding` adds the two rules the onboarding step asks for (a
 * role, and at least 20 characters about the work); Settings saves without them, like the API.
 */
export function validateProfile(input: ProfileInput, opts: { onboarding?: boolean } = {}): Checked<ProfileField, ProfileValue> {
  const role = input.role.replace(/\s+/g, " ").trim();
  const bio = input.bio.trim();
  const skills = cleanList(input.skills);
  const listen_for = cleanList(input.listen_for);
  const ignore_topics = cleanList(input.ignore_topics);
  const errors: FieldErrors<ProfileField> = {};

  if (opts.onboarding && !role) errors.role = "Add your role, so your agent knows what to listen for.";
  else if (role.length > LIMITS.role) errors.role = `Keep the role under ${LIMITS.role} characters.`;

  if (opts.onboarding && bio.length < LIMITS.bioMinOnboarding)
    errors.bio = bio
      ? `A little more, please: at least ${LIMITS.bioMinOnboarding} characters (${bio.length} so far).`
      : "Say a sentence or two about what you work on.";
  else if (bio.length > LIMITS.bio) errors.bio = `Keep this under ${LIMITS.bio} characters (${bio.length} now).`;

  const s = checkList(skills, LIMITS.skills, { one: "focus area", many: "focus areas" });
  if (s) errors.skills = s;
  const l = checkList(listen_for, LIMITS.listenFor, { one: "topic", many: "topics" });
  if (l) errors.listen_for = l;
  const g = checkList(ignore_topics, LIMITS.ignoreTopics, { one: "topic", many: "topics" });
  if (g) errors.ignore_topics = g;

  const ignoredAndWanted = ignore_topics.find((t) => listen_for.some((w) => w.toLowerCase() === t.toLowerCase()));
  if (!errors.ignore_topics && ignoredAndWanted)
    errors.ignore_topics = `"${ignoredAndWanted}" is also in listen for. Keep it in one list.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { role: role || null, bio: bio || null, skills, listen_for, ignore_topics } };
}

export type PersonaInput = {
  agent_name: string;
  agent_avatar_seed: string;
  agent_personality: string;
  agent_instructions: string;
};

export type PersonaValue = {
  agent_name: string | null;
  agent_avatar_seed: string | null;
  agent_personality: AgentPersonality;
  agent_instructions: string | null;
};

/** Check the agent persona. Blank name, face or instructions mean "use the default" (NULL). */
export function validatePersona(input: PersonaInput): Checked<PersonaField, PersonaValue> {
  const name = input.agent_name.replace(/\s+/g, " ").trim();
  const seed = input.agent_avatar_seed.trim();
  const instructions = input.agent_instructions.trim();
  const errors: FieldErrors<PersonaField> = {};

  if (name.length > LIMITS.agentName) errors.agent_name = `Keep the name under ${LIMITS.agentName} characters.`;
  if (seed && !isDoodleSeed(seed)) errors.agent_avatar_seed = "That face could not be used. Deal a new one and pick again.";
  if (!isPersonality(input.agent_personality)) errors.agent_personality = "Pick one of the five personalities.";
  if (instructions.length > LIMITS.agentInstructions)
    errors.agent_instructions = `Keep instructions under ${LIMITS.agentInstructions} characters (${instructions.length} now).`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      agent_name: name || null,
      agent_avatar_seed: seed || null,
      agent_personality: input.agent_personality as AgentPersonality,
      agent_instructions: instructions || null,
    },
  };
}

/**
 * Which field a 422 from the API is about. The server names the field in the problem detail
 * (ADR-0038 D3); the first known name found wins.
 */
export function fieldFromDetail<F extends string>(detail: string, fields: readonly F[]): F | null {
  const text = detail.toLowerCase();
  // longest first, so `agent_name` is not mistaken for a shorter name it contains
  const sorted = [...fields].sort((a, b) => b.length - a.length);
  return sorted.find((f) => text.includes(f.toLowerCase())) ?? null;
}

/* ---------------- how an agent is shown ---------------- */

/** "{first name}'s agent" when the person has not named theirs (ADR-0038 D2). */
export function agentDisplayName(agentName: string | null | undefined, personName: string): string {
  const named = agentName?.trim();
  if (named) return named;
  const first = personName.trim().split(/\s+/)[0];
  return first ? `${first}'s agent` : "Your agent";
}

/** The agent's doodle: the chosen seed, else one derived from the person's `users.id`. */
export function agentSeed(seed: string | null | undefined, userId: string): string {
  // One definition of an agent's face for the whole app: the room draws it with this too.
  return agentSeedFor(seed, userId);
}

/* ---------------- the five voices ---------------- */

export type PersonalityPreset = {
  id: AgentPersonality;
  label: string;
  /** what it means, in a few words */
  blurb: string;
  /** the same note, written in this voice */
  sample: string;
};

/** One meeting moment (pricing settled, Raj takes the deck), written five ways. */
export const PERSONALITY_PRESETS: readonly PersonalityPreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    blurb: "Clear notes with the context that matters.",
    sample: "Pricing is settled: annual plans at 20% off. Raj updates the deck by Friday.",
  },
  {
    id: "concise",
    label: "Concise",
    blurb: "Short notes, only the essentials.",
    sample: "Annual plans, 20% off. Raj: deck, Friday.",
  },
  {
    id: "detailed",
    label: "Detailed",
    blurb: "Fuller notes, with the reasoning behind them.",
    sample: "Diego proposed annual plans at 20% off to cut churn; the team agreed, and Raj updates the deck before Friday's board prep.",
  },
  {
    id: "direct",
    label: "Direct",
    blurb: "Plain and to the point, what to do first.",
    sample: "Decided: annual plans at 20% off. Raj owns the deck, due Friday. Nothing needed from you.",
  },
  {
    id: "friendly",
    label: "Friendly",
    blurb: "Warm and conversational.",
    sample: "Good news, pricing is sorted: annual plans at 20% off. Raj is on the deck for Friday.",
  },
];

export function presetFor(id: AgentPersonality): PersonalityPreset {
  return PERSONALITY_PRESETS.find((p) => p.id === id) ?? PERSONALITY_PRESETS[0];
}
