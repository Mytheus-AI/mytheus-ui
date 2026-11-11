/**
 * Floor attempts (the last word, a3 room signals contract section 1): a pure state machine that
 * notices when you tried to come in and the room talked over you, so the gateway can keep it for
 * the private nudge after the call. Nothing here is shown to anyone; the gateway never broadcasts
 * it.
 *
 * Fed with what LiveKit already knows: whether your microphone is on, whether you are speaking
 * (the local participant's `isSpeaking`), and who else is speaking right now (the active remote
 * speaker). An attempt is reported when:
 *
 *   - you started speaking while someone else held the floor, your burst lasted under 2.5 s, and
 *     they were still speaking 1.2 s after you stopped; or
 *   - you unmuted, spoke under 3 s in total, and muted again within 10 s while someone else was
 *     speaking (you gave up).
 *
 * A burst of 2.5 s or more means you got the floor: nothing is reported. At most one attempt every
 * 5 s and 40 per visit, as the gateway enforces.
 *
 * Pure (no timers, no LiveKit import): the room calls `stepFloor` on every change and on a short
 * tick, and sends whatever attempt it returns.
 */

export const SHORT_BURST_MS = 2_500;
export const STILL_TALKING_AFTER_MS = 1_200;
export const GAVE_UP_WITHIN_MS = 10_000;
export const GAVE_UP_SPOKEN_MS = 3_000;
export const MIN_GAP_MS = 5_000;
export const MAX_PER_VISIT = 40;

export interface FloorAttempt {
  startedAt: number;
  endedAt: number;
  overUserId: string | null;
  unmutedAt: number | null;
}

export interface FloorInput {
  now: number;
  micOn: boolean;
  /** You are speaking (LiveKit's local `isSpeaking`). */
  speaking: boolean;
  /** Someone else speaking right now, or null when nobody else is. */
  otherSpeakerId: string | null;
}

export interface FloorState {
  micOn: boolean;
  speaking: boolean;
  /** When the mic last came on; null when it was already on when we started watching. */
  unmutedAt: number | null;
  /** Speech since the last unmute (ms). */
  spokenMs: number;
  /** The first burst since the last unmute. */
  firstStartAt: number | null;
  burst: { startedAt: number; overUserId: string | null } | null;
  /** A short contested burst, waiting to see whether the other person kept talking. */
  pending: { startedAt: number; endedAt: number; overUserId: string | null } | null;
  lastSentAt: number | null;
  sent: number;
}

export function initialFloor(micOn = false): FloorState {
  return {
    micOn,
    speaking: false,
    unmutedAt: null,
    spokenMs: 0,
    firstStartAt: null,
    burst: null,
    pending: null,
    lastSentAt: null,
    sent: 0,
  };
}

function allowed(s: FloorState, now: number): boolean {
  if (s.sent >= MAX_PER_VISIT) return false;
  return s.lastSentAt === null || now - s.lastSentAt >= MIN_GAP_MS;
}

function emit(s: FloorState, attempt: FloorAttempt, now: number): { state: FloorState; attempt: FloorAttempt | null } {
  if (!allowed(s, now) || attempt.endedAt < attempt.startedAt) return { state: s, attempt: null };
  return { state: { ...s, lastSentAt: now, sent: s.sent + 1 }, attempt };
}

/** One step: the state after `input`, and the attempt to report now, if any. */
export function stepFloor(prev: FloorState, input: FloorInput): { state: FloorState; attempt: FloorAttempt | null } {
  const { now, otherSpeakerId } = input;
  const speaking = input.micOn && input.speaking;
  let s: FloorState = { ...prev };
  let attempt: FloorAttempt | null = null;

  // The mic came on: a new chance to come in.
  if (input.micOn && !prev.micOn) {
    s = { ...s, micOn: true, unmutedAt: now, spokenMs: 0, firstStartAt: null, pending: null };
  }

  // A burst ends (you stopped, or the mic went off mid-word).
  if (prev.speaking && !speaking && s.burst) {
    const burst = s.burst;
    const dur = Math.max(0, now - burst.startedAt);
    s = { ...s, spokenMs: s.spokenMs + dur, burst: null };
    if (burst.overUserId && dur < SHORT_BURST_MS) {
      s = { ...s, pending: { startedAt: burst.startedAt, endedAt: now, overUserId: burst.overUserId } };
    }
  }

  // The mic went off: did you give up?
  if (!input.micOn && prev.micOn) {
    const gaveUp =
      s.unmutedAt !== null &&
      now - s.unmutedAt <= GAVE_UP_WITHIN_MS &&
      s.spokenMs < GAVE_UP_SPOKEN_MS &&
      otherSpeakerId !== null;
    if (gaveUp) {
      const r = emit(
        s,
        { startedAt: s.firstStartAt ?? (s.unmutedAt as number), endedAt: now, overUserId: otherSpeakerId, unmutedAt: s.unmutedAt },
        now,
      );
      s = r.state;
      attempt = r.attempt;
    }
    s = { ...s, micOn: false, speaking: false, unmutedAt: null, spokenMs: 0, firstStartAt: null, burst: null, pending: null };
    return { state: s, attempt };
  }

  // A burst starts: contested when someone else holds the floor.
  if (speaking && !prev.speaking) {
    s = {
      ...s,
      burst: { startedAt: now, overUserId: otherSpeakerId },
      firstStartAt: s.firstStartAt ?? now,
      // Speaking again means the last short burst was not the end of it.
      pending: null,
    };
  }

  // A short contested burst: report it once the other person has kept talking long enough.
  if (s.pending && !speaking && now - s.pending.endedAt >= STILL_TALKING_AFTER_MS) {
    const p = s.pending;
    s = { ...s, pending: null };
    if (otherSpeakerId !== null) {
      const r = emit(s, { startedAt: p.startedAt, endedAt: p.endedAt, overUserId: p.overUserId, unmutedAt: s.unmutedAt }, now);
      s = r.state;
      attempt = r.attempt;
    }
  }

  s = { ...s, micOn: input.micOn, speaking };
  return { state: s, attempt };
}
