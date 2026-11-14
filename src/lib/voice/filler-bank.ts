/**
 * Talk mode's filler audio, rendered once and kept in memory for the visit (ADR-0050 D4): the
 * short phrases of `fillers.ts` in the person's own Myte voice, decoded and ready to play with no
 * network wait. `warm` fetches what is missing a few at a time, in order (the voice server also
 * caches short phrases, so a later visit is quick); a rate limit or an outage stops it quietly
 * (fillers are a nicety: a turn without them still works). `get` answers only what is ready.
 *
 * The voice is chosen on the server, so the bank is keyed by speed; `clear` empties it when the
 * person picks another voice. Pure (network and decoding injected), tested in
 * tests/voice-fillers.test.ts.
 */

import type { Clip, FetchChunk } from "./speaker.ts";

export interface FillerBank {
  /** fetch and decode these phrases (those not already held); returns a cancel */
  warm(phrases: readonly string[], opts?: { speed?: number; language?: string; concurrency?: number }): () => void;
  /** a ready clip, or null */
  get(phrase: string, speed?: number): Clip | null;
  ready(phrase: string, speed?: number): boolean;
  clear(): void;
}

export const FILLER_CONCURRENCY = 2;

export function createFillerBank(deps: { fetchChunk: FetchChunk; decode: (data: ArrayBuffer) => Promise<Clip> }): FillerBank {
  const clips = new Map<string, Clip>();
  const inFlight = new Set<string>();
  let generation = 0;
  const key = (phrase: string, speed = 1, language = "en") => `${language}|${speed}|${phrase}`;

  return {
    warm(phrases, opts = {}) {
      const speed = opts.speed ?? 1;
      const language = opts.language ?? "en";
      const gen = generation;
      const controller = new AbortController();
      const queue = phrases.filter((p) => !clips.has(key(p, speed, language)) && !inFlight.has(key(p, speed, language)));
      let stopped = false;
      const lane = async () => {
        while (queue.length && !stopped && !controller.signal.aborted) {
          const phrase = queue.shift()!;
          const k = key(phrase, speed, language);
          if (clips.has(k) || inFlight.has(k)) continue;
          inFlight.add(k);
          try {
            const res = await deps.fetchChunk({ text: phrase, speed, language }, controller.signal);
            if (!res.ok) {
              // A rate limit or an outage: stop asking; anything else skips this one.
              if (res.status === 429 || res.status === 503) stopped = true;
              continue;
            }
            const clip = await deps.decode(await res.arrayBuffer());
            if (gen === generation) clips.set(k, clip);
          } catch {
            if (!controller.signal.aborted) stopped = true;
          } finally {
            inFlight.delete(k);
          }
        }
      };
      for (let i = 0; i < Math.max(1, opts.concurrency ?? FILLER_CONCURRENCY); i++) void lane();
      return () => controller.abort();
    },
    get: (phrase, speed = 1) => clips.get(key(phrase, speed)) ?? null,
    ready: (phrase, speed = 1) => clips.has(key(phrase, speed)),
    clear() {
      generation++;
      clips.clear();
    },
  };
}
