/**
 * The room's people layer (polish program, Phase 0): raised hands and reactions, broadcast by
 * `realtime-gateway` ("hand", "reaction", and "room-state" on join), and the People panel's three
 * groups: who is in the call, whose agent attends for them, and who was invited but is not here.
 *
 * Pure: no React.
 */

export const REACTIONS = [
  { id: "thumbs_up", emoji: "\u{1F44D}", label: "Thumbs up" },
  { id: "clap", emoji: "\u{1F44F}", label: "Applause" },
  { id: "celebrate", emoji: "\u{1F389}", label: "Celebrate" },
  { id: "heart", emoji: "\u{2764}\u{FE0F}", label: "Love it" },
  { id: "laugh", emoji: "\u{1F602}", label: "Laugh" },
  { id: "thinking", emoji: "\u{1F914}", label: "Thinking" },
] as const;

export type ReactionId = (typeof REACTIONS)[number]["id"];

export function reactionOf(id: string): (typeof REACTIONS)[number] | null {
  return REACTIONS.find((r) => r.id === id) ?? null;
}

/* ---------------------------------------------------------------- raised hands */

export interface HandsState {
  /** Internal user id -> when the hand went up (ISO). */
  raised: Record<string, string>;
}

export const emptyHandsState: HandsState = { raised: {} };

export function applyHand(
  state: HandsState,
  p: { userId?: unknown; raised?: unknown; at?: unknown } | null | undefined,
): HandsState {
  if (!p || typeof p.userId !== "string" || typeof p.raised !== "boolean") return state;
  if (p.raised) {
    if (state.raised[p.userId]) return state;
    const at = typeof p.at === "string" ? p.at : new Date().toISOString();
    return { raised: { ...state.raised, [p.userId]: at } };
  }
  if (!state.raised[p.userId]) return state;
  const raised = { ...state.raised };
  delete raised[p.userId];
  return { raised };
}

/** The "room-state" snapshot on (re)join replaces what this client knew. */
export function applyRoomHands(
  hands: ReadonlyArray<{ userId?: unknown; at?: unknown }> | null | undefined,
): HandsState {
  const raised: Record<string, string> = {};
  for (const h of hands ?? []) {
    if (typeof h.userId === "string" && typeof h.at === "string") raised[h.userId] = h.at;
  }
  return { raised };
}

/** Raised hands in the order they went up: the queue the host calls on. */
export function handQueue(state: HandsState): string[] {
  return Object.entries(state.raised)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([userId]) => userId);
}

/* ---------------------------------------------------------------- reactions */

export interface FloatingReaction {
  id: string;
  userId: string;
  reaction: ReactionId;
  /** Local clock (ms) when it arrived; it floats for `REACTION_MS`. */
  seenAt: number;
}

export const REACTION_MS = 4000;
const MAX_FLOATING = 12;

export function applyReaction(
  list: FloatingReaction[],
  p: { id?: unknown; userId?: unknown; reaction?: unknown } | null | undefined,
  nowMs: number,
): FloatingReaction[] {
  if (!p || typeof p.id !== "string" || typeof p.userId !== "string" || typeof p.reaction !== "string") return list;
  if (!reactionOf(p.reaction) || list.some((r) => r.id === p.id)) return list;
  const next = [...list.filter((r) => nowMs - r.seenAt < REACTION_MS), {
    id: p.id,
    userId: p.userId,
    reaction: p.reaction as ReactionId,
    seenAt: nowMs,
  }];
  return next.slice(-MAX_FLOATING);
}

export function expireReactions(list: FloatingReaction[], nowMs: number): FloatingReaction[] {
  const next = list.filter((r) => nowMs - r.seenAt < REACTION_MS);
  return next.length === list.length ? list : next;
}

/* ---------------------------------------------------------------- the People panel */

export interface PersonIn {
  id: string;
  name: string;
  isLocal?: boolean;
  micOn: boolean;
  speaking?: boolean;
}

export interface Invitee {
  id: string;
  role: string | null;
  attendance: "live" | "agent";
}

export interface PeopleGroups {
  inCall: Array<PersonIn & { host: boolean; handAt: string | null }>;
  /** Someone who sent their agent instead of coming, and is not here after all. */
  agents: Array<{ id: string; name: string; agentName: string }>;
  /** Invited, not in the call, and did not send an agent. */
  absent: Array<{ id: string; name: string; host: boolean }>;
}

/**
 * Builds the People panel from the live call, the meeting's participants and the raised hands.
 * In the call: hands first in the order they went up, then you, then everyone else by name.
 */
export function peopleGroups(input: {
  inCall: PersonIn[];
  invitees: Invitee[];
  hostId: string | null;
  meId: string | null;
  hands: HandsState;
  nameOf: (id: string) => string;
  agentNameOf: (id: string) => string;
}): PeopleGroups {
  const present = new Set(input.inCall.map((p) => p.id));
  if (input.meId) present.add(input.meId);
  const inCall = input.inCall
    .map((p) => ({ ...p, host: p.id === input.hostId || (p.isLocal === true && input.meId === input.hostId), handAt: input.hands.raised[p.id] ?? (p.isLocal && input.meId ? input.hands.raised[input.meId] ?? null : null) }))
    .sort((a, b) => {
      if (a.handAt && b.handAt) return a.handAt.localeCompare(b.handAt);
      if (a.handAt) return -1;
      if (b.handAt) return 1;
      if (a.isLocal) return -1;
      if (b.isLocal) return 1;
      return a.name.localeCompare(b.name);
    });
  const agents: PeopleGroups["agents"] = [];
  const absent: PeopleGroups["absent"] = [];
  for (const inv of input.invitees) {
    if (present.has(inv.id)) continue;
    const name = input.nameOf(inv.id);
    if (inv.attendance === "agent") agents.push({ id: inv.id, name, agentName: input.agentNameOf(inv.id) });
    else absent.push({ id: inv.id, name, host: inv.id === input.hostId });
  }
  agents.sort((a, b) => a.name.localeCompare(b.name));
  absent.sort((a, b) => a.name.localeCompare(b.name));
  return { inCall, agents, absent };
}
