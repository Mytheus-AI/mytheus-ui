/**
 * Talk mode's spoken fillers (ADR-0050 D4): short phrases in the Myte's own voice, rendered once
 * when Talk opens and kept in memory, so there is never a long silence while it looks things up.
 *
 * - Right after a question is sent, one acknowledgment plays ("Got it.").
 * - When the first step starts, a filler that matches what it is doing ("Checking your
 *   calendar."), only if no answer text has started and the acknowledgment has finished; at most
 *   one step filler per turn.
 * - About 4 s in with no answer text, a slow-path line ("Still looking, nearly there.").
 * - Never more than two fillers in a turn, never the same phrase twice in a row, and none once
 *   the answer has started (the speaker cuts a playing filler for the answer).
 *
 * The scheduler is pure: the component feeds it the turn's events with a clock and plays what it
 * returns. Tested in tests/voice-fillers.test.ts.
 */

export type FillerKind = "ack" | "meetings" | "tasks" | "schedule" | "people" | "decisions" | "brain" | "generic" | "slow";

export const ACKS = ["Got it.", "Okay, let me check.", "Sure, one sec."] as const;

export const STEP_FILLERS: Record<Exclude<FillerKind, "ack">, string> = {
  meetings: "Looking through your meetings.",
  tasks: "Checking your tasks.",
  schedule: "Checking your calendar.",
  people: "Looking them up.",
  decisions: "Pulling up that decision.",
  brain: "Checking the company brain.",
  generic: "Let me check.",
  slow: "Still looking, nearly there.",
};

/** Every phrase, in the order they are worth rendering (acknowledgments first, the slow line last). */
export const FILLER_PHRASES: readonly string[] = [
  ...ACKS,
  STEP_FILLERS.generic,
  STEP_FILLERS.meetings,
  STEP_FILLERS.tasks,
  STEP_FILLERS.schedule,
  STEP_FILLERS.people,
  STEP_FILLERS.decisions,
  STEP_FILLERS.brain,
  STEP_FILLERS.slow,
];

/** ms with no answer text before the slow-path line */
export const SLOW_FILLER_MS = 4000;
export const MAX_FILLERS_PER_TURN = 2;

/** Which filler a step label calls for ("Searching your meetings" -> meetings). */
export function fillerKindFor(label: string): Exclude<FillerKind, "ack" | "slow"> {
  const l = label.toLowerCase();
  if (/\bdecision|\bdecided\b|\bruling/.test(l)) return "decisions";
  if (/\btask|\bpromise|\bowe\b|\bowed\b|\bto-?dos?\b|\baction items?\b|\bcommitment|\bassigned\b/.test(l)) return "tasks";
  if (/\bcalendar|\bschedul|\bagenda|\bavailab|\bfree time|\bcapacity|\bbusy\b|\bslot/.test(l)) return "schedule";
  if (/\bpeople\b|\bperson\b|\bteammate|\bcolleague|\bmember|\bprofile|\bwho\b|\bowner|\bteam\b|\bdirectory/.test(l)) return "people";
  if (/\bdoc(ument)?s?\b|\bhelp\b|\bbrain\b|\bknowledge|\bwiki|\bpolic|\bguide|\bhandbook|\bfaq|\bnotion|\bfiles?\b/.test(l)) return "brain";
  if (/\bmeeting|\btranscript|\bcall\b|\bcalls\b|\brecap|\bminutes|\bstandup|\bsync\b/.test(l)) return "meetings";
  return "generic";
}

export type FillerAction = { kind: FillerKind; phrase: string };

export interface FillerScheduler {
  /** the question was sent: the acknowledgment, if one is ready */
  begin(now: number): FillerAction | null;
  /** a step started running */
  step(label: string, now: number): FillerAction | null;
  /** the filler that was playing finished (or was cut) */
  ended(now: number): FillerAction | null;
  /** answer text started: no more fillers this turn */
  text(): void;
  /** call often (every ~100 ms): the slow-path line when it is due */
  tick(now: number): FillerAction | null;
  /** the turn is over (done, failed, interrupted) */
  end(): void;
  /** the phrase most recently played (kept across turns) */
  last(): string | null;
}

export function createFillerScheduler(opts: { ready?: (phrase: string) => boolean; random?: () => number; slowMs?: number; last?: string | null } = {}): FillerScheduler {
  const ready = opts.ready ?? (() => true);
  const random = opts.random ?? Math.random;
  const slowMs = opts.slowMs ?? SLOW_FILLER_MS;
  let lastPhrase: string | null = opts.last ?? null;
  let lastAck: string | null = null;
  let active = false;
  let startedAt = 0;
  let played = 0;
  let stepDone = false;
  let stepSeen = false;
  let pending: string | null = null;
  let playing = false;
  let texted = false;

  const allowed = () => active && !texted && !playing && played < MAX_FILLERS_PER_TURN;

  const play = (kind: FillerKind, phrase: string): FillerAction | null => {
    if (!ready(phrase) || phrase === lastPhrase) return null;
    played++;
    playing = true;
    lastPhrase = phrase;
    if (kind === "ack") lastAck = phrase;
    return { kind, phrase };
  };

  const stepFiller = (label: string): FillerAction | null => {
    const kind = fillerKindFor(label);
    // "Let me check." right after "Okay, let me check." says nothing new.
    if (kind === "generic" && lastAck && /let me check/i.test(lastAck) && played > 0) return null;
    const out = play(kind, STEP_FILLERS[kind]);
    if (out) stepDone = true;
    return out;
  };

  return {
    begin(now) {
      active = true;
      startedAt = now;
      played = 0;
      stepDone = false;
      stepSeen = false;
      pending = null;
      playing = false;
      texted = false;
      const pool = ACKS.filter((a) => a !== lastPhrase && a !== lastAck && ready(a));
      const from = pool.length ? pool : ACKS.filter((a) => a !== lastPhrase && ready(a));
      if (!from.length) return null;
      const phrase = from[Math.min(from.length - 1, Math.floor(random() * from.length))]!;
      return play("ack", phrase);
    },
    step(label) {
      if (!active || stepSeen) return null;
      stepSeen = true;
      if (texted || stepDone || played >= MAX_FILLERS_PER_TURN) return null;
      if (playing) {
        // Wait for the acknowledgment to finish.
        pending = label;
        return null;
      }
      return stepFiller(label);
    },
    ended() {
      playing = false;
      if (pending === null) return null;
      const label = pending;
      pending = null;
      if (!allowed() || stepDone) return null;
      return stepFiller(label);
    },
    text() {
      texted = true;
      pending = null;
    },
    tick(now) {
      if (!allowed() || pending !== null) return null;
      if (now - startedAt < slowMs) return null;
      const out = play("slow", STEP_FILLERS.slow);
      // Asked once per turn: whether it played or not, it is not asked again.
      if (!out) played = MAX_FILLERS_PER_TURN;
      return out;
    },
    end() {
      active = false;
      pending = null;
      playing = false;
    },
    last: () => lastPhrase,
  };
}
