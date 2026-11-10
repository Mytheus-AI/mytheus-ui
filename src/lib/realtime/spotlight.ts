/**
 * A calmer spotlight (polish program, Phase 0): the speaker frame used to jump the instant
 * LiveKit's active-speaker set changed, so a cough or a one-word "yes" moved the whole stage. Now
 * a new speaker must hold the floor for `HOLD_MS` before the spotlight moves to them; the current
 * speaker keeps it while they pause, until someone else has held the floor that long.
 *
 * Pure: the caller keeps `SpotlightState` and feeds it the speaking set with the clock.
 */

export const HOLD_MS = 1500;

export interface SpotlightState {
  /** Who the spotlight is on (a tile id), or null before anyone has held the floor. */
  current: string | null;
  /** Who is speaking now but has not held the floor long enough yet, and since when. */
  candidate: string | null;
  since: number;
}

export const emptySpotlight: SpotlightState = { current: null, candidate: null, since: 0 };

/**
 * One step. `speaking` is the set of tile ids speaking right now, loudest first (LiveKit's order).
 * The current speaker keeps the spotlight while they are among them.
 */
export function stepSpotlight(state: SpotlightState, speaking: readonly string[], nowMs: number): SpotlightState {
  if (state.current && speaking.includes(state.current)) {
    return state.candidate ? { ...state, candidate: null, since: 0 } : state;
  }
  const top = speaking[0] ?? null;
  if (!top) return state.candidate ? { ...state, candidate: null, since: 0 } : state;
  if (state.current === null) return { current: top, candidate: null, since: 0 };
  if (state.candidate !== top) return { ...state, candidate: top, since: nowMs };
  if (nowMs - state.since >= HOLD_MS) return { current: top, candidate: null, since: 0 };
  return state;
}

/** How long until the pending candidate would take the spotlight, or null when nothing is pending. */
export function msUntilSwitch(state: SpotlightState, nowMs: number): number | null {
  if (!state.candidate) return null;
  return Math.max(0, HOLD_MS - (nowMs - state.since));
}
