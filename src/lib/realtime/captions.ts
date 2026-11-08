/**
 * The caption reducer: interim-then-final, replace-in-place, append-only final track.
 *
 * This is the whole substance of plan 3-4 §3.8 step 1, kept as a pure function so the rule can
 * be tested without a socket, a browser, or a running gateway. The rendering component is then
 * only a projection of `CaptionState`.
 *
 * THE CONTRACT, taken verbatim from `realtime-gateway/src/server.ts`'s event documentation
 * rather than inferred: the `caption` event carries `{ chunkId, speakerId, startMs, endMs,
 * text, isFinal, confidence }`, and "`chunkId` is stable across an utterance's interim
 * revisions and its own final, which is what lets a client replace-in-place by `chunkId` until
 * `isFinal` arrives, then append."
 *
 * So an interim is a REVISION, never a new line. Appending interims would make the strip flicker
 * and grow with half-sentences, which is precisely the layout shift §3.8 step 1 forbids.
 *
 * Ordering is by `startMs`, not arrival. Deepgram finalizes an utterance after later interims
 * from a different speaker may already have arrived, so arrival order is not utterance order,
 * and a transcript that reorders itself as it settles reads as broken.
 *
 * REPLAY IS NOT THIS MODULE'S JOB. The gateway buffers nothing and replays nothing to a
 * reconnecting client ("finals are re-hydrated from core-api's REST read model, never from this
 * socket"), so `hydrate` exists to seed durable finals from REST, and the socket only ever adds
 * to what it seeded. `applyCaption` is idempotent on `chunkId` for exactly this reason: a final
 * that arrives both from the REST hydrate and from the socket must not appear twice.
 */

/** The `payload` of a `caption` socket event. Field names are the gateway's, verbatim. */
export interface CaptionPayload {
  chunkId: string;
  speakerId: string;
  startMs: number;
  endMs: number;
  text: string;
  isFinal: boolean;
  confidence?: number;
}

/** A rendered line. Identical in shape to the wire payload; `isFinal` distinguishes a
 *  provisional revision (rendered dimmer) from settled truth. */
export type CaptionLine = CaptionPayload;

export interface CaptionState {
  /** Ordered by `startMs`. Interims and finals together, so a revision never jumps position. */
  lines: CaptionLine[];
}

export const emptyCaptionState: CaptionState = { lines: [] };

function insertOrdered(lines: CaptionLine[], line: CaptionLine): CaptionLine[] {
  const next = [...lines, line];
  // Stable by (startMs, chunkId): two speakers can genuinely begin on the same millisecond, and
  // without the tiebreak their relative order would flip between renders.
  next.sort((a, b) => a.startMs - b.startMs || a.chunkId.localeCompare(b.chunkId));
  return next;
}

export function applyCaption(state: CaptionState, payload: CaptionPayload): CaptionState {
  // Deepgram streams results for silence and breath with empty text; drawing them showed a
  // speaker label with nothing after it. Nothing is lost: a real utterance carries text.
  if (!payload.text.trim()) return state;
  const index = state.lines.findIndex((l) => l.chunkId === payload.chunkId);

  if (index === -1) {
    return { lines: insertOrdered(state.lines, { ...payload }) };
  }

  const existing = state.lines[index];

  // A final never regresses to an interim. Redelivery is expected on this program's buses, and
  // a late interim for an already-settled chunk must be ignored rather than un-finalize a line
  // the user has already read as settled.
  if (existing.isFinal && !payload.isFinal) return state;

  // Drop the superseded revision and re-insert in order: `startMs` can be revised between an
  // interim and its final, so the old position may no longer be correct.
  const without = state.lines.filter((l) => l.chunkId !== payload.chunkId);
  return { lines: insertOrdered(without, { ...payload }) };
}

/**
 * Seed durable finals read from `core-api`, replacing whatever is held. Used on mount and on
 * every socket reconnect, because the gateway replays nothing.
 */
export function hydrate(finals: CaptionPayload[]): CaptionState {
  return finals.reduce<CaptionState>(
    (state, payload) => applyCaption(state, { ...payload, isFinal: true }),
    emptyCaptionState,
  );
}

/**
 * A stable per-speaker color index. Speaker ids are opaque diarization labels ("0", "1", …)
 * assigned by Deepgram, and `meeting_speakers` maps them to real users later; until then the
 * only requirement is that the SAME speaker keeps the SAME color for the life of the meeting.
 * Hashing the id rather than using arrival order is what guarantees that: arrival order changes
 * when a hydrate reorders lines, and a caption strip whose colors reshuffle mid-meeting is
 * worse than one with no colors at all.
 */
export function speakerColorIndex(speakerId: string, paletteSize: number): number {
  let hash = 0;
  for (let i = 0; i < speakerId.length; i += 1) {
    hash = (hash * 31 + speakerId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % paletteSize;
}
