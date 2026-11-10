/**
 * One honest connection state for the room (polish program, Phase 0: "Room reconnects").
 *
 * The room has two live links: the call (LiveKit: audio and video) and the meeting socket
 * (`realtime-gateway`: captions, the agent, chat, the shared agenda and cards). Either can drop on
 * its own. Before this, a socket that could not reconnect left "Listening" on while captions and
 * the agent had silently stopped. `roomConnection` folds both into the one line the room shows,
 * says what is affected in plain words, and returns `null` when everything works, so the notice
 * clears itself.
 *
 * Pure: no React.
 */

export type CallLink = "unconfigured" | "connecting" | "connected" | "reconnecting" | "error" | "consent";
export type LiveLink = "disabled" | "connecting" | "joined" | "reconnecting" | "forbidden" | "error";

export interface RoomNotice {
  tone: "waiting" | "error";
  text: string;
  /** What "Try again" should do, when there is something to try. */
  retry: "call" | "live" | "reload" | null;
}

/**
 * The line to show, or null. `liveWasJoined` distinguishes the first connect ("Connecting the
 * agent") from a drop ("Agent paused, reconnecting"), which is the case that used to be silent.
 */
export function roomConnection(call: CallLink, live: LiveLink, liveWasJoined: boolean): RoomNotice | null {
  if (live === "forbidden") {
    return {
      tone: "error",
      text: "You are not on this meeting's participant list, so captions and your agent are off. Ask the host to add you.",
      retry: null,
    };
  }
  const callDown = call === "reconnecting";
  const liveDown = live === "reconnecting" || (live === "connecting" && liveWasJoined);
  if (live === "error") {
    return {
      tone: "error",
      text: callDown
        ? "The call and the meeting link both dropped. Captions and your agent are paused."
        : "Captions and your agent are paused: the meeting link could not reconnect.",
      retry: "live",
    };
  }
  if (callDown && liveDown) return { tone: "waiting", text: "Reconnecting. Audio, captions and your agent are paused", retry: null };
  if (callDown) return { tone: "waiting", text: "Call reconnecting. Your audio and video are paused", retry: null };
  if (liveDown) return { tone: "waiting", text: "Agent paused, captions reconnecting", retry: null };
  return null;
}

/**
 * Reconnect delay for attempt `n` (0-based): exponential from 1 s, capped at 30 s, with full
 * jitter in its upper half so a room full of clients that dropped together does not reconnect
 * in lockstep (mytheus-realtime CLAUDE.md, "Reconnect storms"). `rand` is injectable for tests.
 */
export function backoffMs(n: number, rand: () => number = Math.random): number {
  const base = Math.min(30_000, 1000 * 2 ** Math.max(0, n));
  return Math.round(base / 2 + rand() * (base / 2));
}

/** After this many failed attempts in a row the room stops on its own and offers "Try again". */
export const MAX_RECONNECT_ATTEMPTS = 8;
