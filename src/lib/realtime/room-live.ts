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
  p: { userId?: unknown; raised?: unknown; at?: unknown; raisedAt?: unknown } | null | undefined,
): HandsState {
  if (!p || typeof p.userId !== "string" || typeof p.raised !== "boolean") return state;
  if (p.raised) {
    // The gateway's raise time is the queue order (a second raise keeps the first one's).
    const at = typeof p.raisedAt === "string" ? p.raisedAt : typeof p.at === "string" ? p.at : new Date().toISOString();
    if (state.raised[p.userId] === at) return state;
    if (state.raised[p.userId] && typeof p.raisedAt !== "string") return state;
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
    .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))
    .map(([userId]) => userId);
}

/** Someone's place in the queue, from 1; 0 when their hand is down. */
export function handPlace(state: HandsState, userId: string | null | undefined): number {
  if (!userId || !state.raised[userId]) return 0;
  return handQueue(state).indexOf(userId) + 1;
}

/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th, 21st. */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** How long a hand has been up, calmly: "just now", "1 min", "12 min". */
export function handWait(atIso: string, nowMs: number): string {
  const ms = nowMs - Date.parse(atIso);
  if (!Number.isFinite(ms) || ms < 60_000) return "just now";
  return `${Math.floor(ms / 60_000)} min`;
}

/* Why a hand came down (or went up), as the gateway says it. Older gateways send none. */
export type HandReason = "raised" | "lowered" | "spoke" | "called" | "left";
const REASONS: readonly HandReason[] = ["raised", "lowered", "spoke", "called", "left"];

/** One change to a hand, as this client announces it. `seq` makes two equal changes distinct. */
export interface HandChange {
  seq: number;
  userId: string;
  raised: boolean;
  byUserId: string | null;
  reason: HandReason;
}

export function handChangeOf(
  p: { userId?: unknown; raised?: unknown; byUserId?: unknown; reason?: unknown } | null | undefined,
  seq: number,
): HandChange | null {
  if (!p || typeof p.userId !== "string" || typeof p.raised !== "boolean") return null;
  const reason =
    typeof p.reason === "string" && (REASONS as readonly string[]).includes(p.reason)
      ? (p.reason as HandReason)
      : p.raised
        ? "raised"
        : "lowered";
  return { seq, userId: p.userId, raised: p.raised, byUserId: typeof p.byUserId === "string" ? p.byUserId : null, reason };
}

/**
 * What the room says about a hand change: a line for the screen-reader live region (everyone),
 * and a gentle toast only for the people it concerns: the host when a hand goes up, and you when
 * the host calls on you or lowers your hand. Your own raise and lower already toast where you
 * pressed.
 */
export function handAnnouncement(
  change: HandChange,
  ctx: { meId: string | null; steers: boolean; place: number; count: number; nameOf: (id: string) => string },
): { live: string; toast: { text: string; tone: "info" | "success" } | null } {
  const mine = change.userId === ctx.meId;
  const who = mine ? "You" : ctx.nameOf(change.userId);
  const by = change.byUserId && change.byUserId !== change.userId ? (change.byUserId === ctx.meId ? "You" : ctx.nameOf(change.byUserId)) : null;
  const left = ctx.count === 0 ? "No hands up." : `${ctx.count} ${ctx.count === 1 ? "hand" : "hands"} up.`;
  if (change.raised) {
    const line = `${who} raised ${mine ? "your" : "their"} hand, ${ordinal(ctx.place)} in line.`;
    return {
      live: line,
      toast: ctx.steers && !mine ? { text: `${who} raised their hand, ${ordinal(ctx.place)} in line`, tone: "info" } : null,
    };
  }
  switch (change.reason) {
    case "called":
      return {
        live: `${by ?? "The host"} called on ${mine ? "you" : who}. ${left}`,
        toast: mine ? { text: `${by ?? "The host"} called on you. Go ahead.`, tone: "success" } : null,
      };
    case "spoke":
      return { live: `${who} started speaking, so ${mine ? "your" : "their"} hand went down. ${left}`, toast: null };
    case "left":
      return { live: `${who} left the call, so ${mine ? "your" : "their"} hand went down. ${left}`, toast: null };
    default:
      return {
        live: by ? `${by} lowered ${mine ? "your" : `${who}'s`} hand. ${left}` : `${who} lowered ${mine ? "your" : "their"} hand. ${left}`,
        toast: mine && by && by !== "You" ? { text: `${by} lowered your hand`, tone: "info" } : null,
      };
  }
}

/* Lowering your hand when you start to speak. LiveKit's speaking flag flickers between words, so
   a pause shorter than SPEECH_GAP_MS still counts as one stretch of speech; a stretch of
   SPEAK_LOWER_MS lowers the hand. */
export const SPEAK_LOWER_MS = 3000;
export const SPEECH_GAP_MS = 1200;

export interface SpeechRun {
  /** When this stretch of speech began; null while quiet. */
  since: number | null;
  /** The last moment speech was heard (now, while speaking). */
  heard: number | null;
  /** Speaking at the last observation. */
  on: boolean;
}

export const quietSpeech: SpeechRun = { since: null, heard: null, on: false };

export function stepSpeech(run: SpeechRun, speaking: boolean, nowMs: number): SpeechRun {
  if (speaking) {
    if (run.on && run.since !== null) return { since: run.since, heard: nowMs, on: true };
    // Back after a short pause: the same stretch goes on.
    if (run.since !== null && run.heard !== null && nowMs - run.heard <= SPEECH_GAP_MS) return { since: run.since, heard: nowMs, on: true };
    return { since: nowMs, heard: nowMs, on: true };
  }
  // Speech just stopped: it was heard until now.
  if (run.on) return { since: run.since, heard: nowMs, on: false };
  if (run.heard !== null && nowMs - run.heard > SPEECH_GAP_MS) return quietSpeech;
  return run;
}

export function spokeLongEnough(run: SpeechRun, nowMs: number): boolean {
  return run.since !== null && run.heard !== null && nowMs - run.heard <= SPEECH_GAP_MS && run.heard - run.since >= SPEAK_LOWER_MS;
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
  /** Someone who sent their Myte instead of coming, and is not here after all. */
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
