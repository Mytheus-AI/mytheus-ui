/**
 * The speech engine every Myte speaks through (ADR-0050 D4). One speaker for the whole app:
 * starting to speak stops whoever was speaking.
 *
 * A text is cut into chunks (`speechChunks`); chunk 0 is fetched alone so the first sound comes
 * quickly, and as soon as chunk N has arrived the next `prefetch` chunks (default 2) are fetched,
 * so they are ready by the time N ends. `warm(texts)` renders whole texts ahead of time (a
 * briefing's every segment, `concurrency` at a time, in order) into a small cache that `speak`
 * reads first, so a later `speak` of the same words starts without a network wait. Each chunk is decoded and played through the audio output, which also reports a live
 * level for the plush. Pause and resume hold the sound where it is; stop and a new `speak`
 * abort every request in flight.
 *
 * Failures never fall back to the device's voice: the speaker reports `error` with a reason
 * (`voice_not_connected`, `rate_limited`, ...) and the caller keeps the words on screen. After
 * `voice_not_connected` it does not ask again for 20 seconds.
 *
 * Pure (the network and the audio output are injected), tested in tests/voice-speaker.test.ts.
 */

import { asFailure, speechFailure, type VoiceFailure } from "./catalog.ts";
import { speechChunks } from "./text.ts";

export type SpeakerStatus = "idle" | "loading" | "speaking" | "paused" | "error";
export type SpeakOutcome = "ended" | "stopped" | "error";

export interface SpeakerSnapshot {
  status: SpeakerStatus;
  /** who is speaking (or failed last): the caller's own key */
  key: string | null;
  error: VoiceFailure | null;
  chunk: number;
  chunks: number;
}

export interface SpeakRequest {
  key: string;
  text: string;
  /** a voice id for a preview; omitted, the person's own voice (core-api knows it) */
  voice?: string | null;
  speed?: number;
  language?: string;
  /** chunks fetched ahead of the one playing (default: the speaker's, 2) */
  prefetch?: number;
}

export interface WarmOptions {
  voice?: string | null;
  speed?: number;
  language?: string;
  /** requests in flight at once (default: the speaker's, 3) */
  concurrency?: number;
}

/** A decoded chunk. */
export interface Clip {
  duration: number;
}

export interface PlayingClip {
  stop(): void;
  /** seconds of this clip heard so far */
  elapsed(): number;
}

/** Where the sound goes: Web Audio in the browser, a fake in tests. */
export interface AudioOut {
  decode(data: ArrayBuffer): Promise<Clip>;
  play(clip: Clip, onEnded: () => void): PlayingClip;
  /** Ready to make sound (resumes a suspended context). Call it from a user gesture first. */
  unlock(): Promise<boolean>;
  pause(): void;
  resume(): void;
  level(): number;
}

export interface ChunkResponse {
  ok: boolean;
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<unknown>;
}

export type FetchChunk = (body: { text: string; voice?: string; speed: number; language: string }, signal: AbortSignal) => Promise<ChunkResponse>;

export interface Position {
  chunk: number;
  chunks: number;
  /** 0..1 through the whole text, by characters, with the current chunk by its playhead */
  fraction: number;
}

interface Session {
  id: number;
  key: string;
  chunks: string[];
  voice?: string;
  speed: number;
  language: string;
  prefetch: number;
  controller: AbortController;
  clips: Map<number, Promise<Clip>>;
  index: number;
  playing: PlayingClip | null;
  playingDuration: number;
  paused: boolean;
  resolve: (o: SpeakOutcome) => void;
}

const IDLE: SpeakerSnapshot = { status: "idle", key: null, error: null, chunk: 0, chunks: 0 };
export const UNAVAILABLE_BACKOFF_MS = 20_000;
const UNLOCK_WAIT_MS = 600;
export const DEFAULT_PREFETCH = 2;
export const DEFAULT_WARM_CONCURRENCY = 3;
/** rendered chunks kept for `warm` (about a long briefing's worth) */
const CACHE_MAX = 96;

type ChunkBody = { text: string; voice?: string; speed: number; language: string };
const cacheKey = (b: ChunkBody) => `${b.language}|${b.voice ?? ""}|${b.speed}|${b.text}`;
type Failure = Error & { reason: string };
const failure = (reason: string, cause?: unknown): Failure => Object.assign(new Error(reason), { reason, cause });

export interface Speaker {
  speak(req: SpeakRequest): Promise<SpeakOutcome>;
  stop(key?: string): void;
  pause(): void;
  resume(): void;
  /** Call from a click or key press: lets later, gesture-less speech make sound. */
  unlock(): void;
  /** Render these texts ahead of time, in order; returns a cancel for what is still waiting. */
  warm(texts: readonly string[], opts?: WarmOptions): () => void;
  setSpeed(speed: number): void;
  level(): number;
  position(): Position | null;
  getSnapshot(): SpeakerSnapshot;
  subscribe(fn: () => void): () => void;
}

export function createSpeaker(deps: { fetchChunk: FetchChunk; out: () => AudioOut; now?: () => number; prefetch?: number; warmConcurrency?: number }): Speaker {
  const now = deps.now ?? (() => Date.now());
  const defaultPrefetch = Math.max(1, deps.prefetch ?? DEFAULT_PREFETCH);
  const defaultConcurrency = Math.max(1, deps.warmConcurrency ?? DEFAULT_WARM_CONCURRENCY);
  /** rendered audio by its words and voice: warmed ahead, read by `load` */
  const cache = new Map<string, Promise<ArrayBuffer>>();
  let snapshot: SpeakerSnapshot = IDLE;
  const listeners = new Set<() => void>();
  let session: Session | null = null;
  let seq = 0;
  let unavailableUntil = 0;
  let outRef: AudioOut | null = null;
  const out = () => (outRef ??= deps.out());

  const set = (patch: Partial<SpeakerSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((l) => l());
  };

  const finish = (s: Session, outcome: SpeakOutcome, error: VoiceFailure | null = null) => {
    if (session !== s) return;
    session = null;
    s.controller.abort();
    s.playing?.stop();
    s.playing = null;
    // Stopped while paused: the output is released so the next voice is heard.
    if (s.paused) out().resume();
    if (outcome === "error") set({ status: "error", key: s.key, error, chunk: s.index, chunks: s.chunks.length });
    else set({ ...IDLE });
    s.resolve(outcome);
  };

  /** One chunk's audio from the network (a failure carries `reason`). */
  const fetchAudio = async (body: ChunkBody, signal: AbortSignal): Promise<ArrayBuffer> => {
    let res: ChunkResponse;
    try {
      res = await deps.fetchChunk(body, signal);
    } catch (err) {
      if (signal.aborted) throw failure("aborted");
      throw failure("voice_not_connected", err);
    }
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const reason = json && typeof json === "object" && "reason" in json ? asFailure((json as { reason: unknown }).reason) : speechFailure(res.status, json).reason;
      throw failure(reason);
    }
    return res.arrayBuffer();
  };

  const remember = (key: string, p: Promise<ArrayBuffer>) => {
    cache.set(key, p);
    // A failed or cancelled render is forgotten, so the next ask tries again.
    p.catch(() => {
      if (cache.get(key) === p) cache.delete(key);
    });
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  };

  const load = (s: Session, i: number): Promise<Clip> | undefined => {
    if (i >= s.chunks.length) return undefined;
    const have = s.clips.get(i);
    if (have) return have;
    const body: ChunkBody = { text: s.chunks[i]!, speed: s.speed, language: s.language };
    if (s.voice) body.voice = s.voice;
    const warmed = cache.get(cacheKey(body));
    const p = (async () => {
      let data: ArrayBuffer | null = null;
      // A warm render that failed or was cancelled is fetched again for real.
      if (warmed) data = await warmed.catch(() => null);
      data ??= await fetchAudio(body, s.controller.signal);
      if (s.controller.signal.aborted) throw failure("aborted");
      return out().decode(data);
    })();
    p.catch(() => {}); // handled where it is awaited
    s.clips.set(i, p);
    return p;
  };

  const playFrom = async (s: Session, i: number): Promise<void> => {
    let clip: Clip;
    try {
      clip = await load(s, i)!;
    } catch (err) {
      const reason = (err as { reason?: string }).reason;
      if (reason === "aborted" || session !== s) return;
      const failure = asFailure(reason);
      if (failure === "voice_not_connected") unavailableUntil = now() + UNAVAILABLE_BACKOFF_MS;
      finish(s, "error", failure);
      return;
    }
    if (session !== s) return;
    // The next chunks render while this one plays.
    for (let k = 1; k <= s.prefetch; k++) load(s, i + k);
    if (i === 0) {
      const ready = await Promise.race([out().unlock(), new Promise<boolean>((r) => setTimeout(() => r(false), UNLOCK_WAIT_MS))]);
      if (session !== s) return;
      if (!ready) {
        finish(s, "error", "blocked");
        return;
      }
    }
    s.index = i;
    s.playingDuration = clip.duration;
    s.playing = out().play(clip, () => {
      if (session !== s) return;
      s.playing = null;
      s.clips.delete(i);
      if (i + 1 < s.chunks.length) {
        set({ status: s.paused ? "paused" : "loading", chunk: i + 1 });
        void playFrom(s, i + 1);
      } else finish(s, "ended");
    });
    set({ status: s.paused ? "paused" : "speaking", key: s.key, error: null, chunk: i, chunks: s.chunks.length });
  };

  const speaker: Speaker = {
    speak(req) {
      if (session) finish(session, "stopped");
      const chunks = speechChunks(req.text);
      if (!chunks.length) return Promise.resolve("ended");
      if (now() < unavailableUntil) {
        set({ status: "error", key: req.key, error: "voice_not_connected", chunk: 0, chunks: chunks.length });
        return Promise.resolve("error");
      }
      // Within a gesture, this is what lets the sound start later.
      void out().unlock();
      return new Promise<SpeakOutcome>((resolve) => {
        const s: Session = {
          id: ++seq,
          key: req.key,
          chunks,
          voice: req.voice ?? undefined,
          speed: req.speed ?? 1,
          language: req.language ?? "en",
          prefetch: Math.max(1, req.prefetch ?? defaultPrefetch),
          controller: new AbortController(),
          clips: new Map(),
          index: 0,
          playing: null,
          playingDuration: 0,
          paused: false,
          resolve,
        };
        session = s;
        set({ status: "loading", key: req.key, error: null, chunk: 0, chunks: chunks.length });
        void playFrom(s, 0);
      });
    },
    stop(key) {
      if (session && (key === undefined || session.key === key)) finish(session, "stopped");
      else if (snapshot.status === "error" && (key === undefined || snapshot.key === key)) set({ ...IDLE });
    },
    pause() {
      const s = session;
      if (!s || s.paused) return;
      s.paused = true;
      out().pause();
      set({ status: "paused" });
    },
    resume() {
      const s = session;
      if (!s || !s.paused) return;
      s.paused = false;
      out().resume();
      set({ status: s.playing ? "speaking" : "loading" });
    },
    unlock() {
      void out().unlock();
    },
    warm(texts, opts = {}) {
      const controller = new AbortController();
      const queue: ChunkBody[] = [];
      for (const text of texts)
        for (const chunk of speechChunks(text)) {
          const body: ChunkBody = { text: chunk, speed: opts.speed ?? 1, language: opts.language ?? "en" };
          if (opts.voice) body.voice = opts.voice;
          queue.push(body);
        }
      let next = 0;
      const pump = (): Promise<void> | void => {
        while (next < queue.length) {
          if (controller.signal.aborted || now() < unavailableUntil) return;
          const body = queue[next++]!;
          const key = cacheKey(body);
          if (cache.has(key)) continue;
          const p = fetchAudio(body, controller.signal);
          remember(key, p);
          return p.then(
            () => pump(),
            (err: Failure) => {
              if (err.reason === "voice_not_connected") unavailableUntil = now() + UNAVAILABLE_BACKOFF_MS;
              // One failure does not stop the rest; a rate limit or an outage does.
              if (err.reason !== "rate_limited" && err.reason !== "voice_not_connected") return pump();
            },
          );
        }
      };
      const lanes = Math.max(1, opts.concurrency ?? defaultConcurrency);
      for (let l = 0; l < lanes; l++) void pump();
      return () => controller.abort();
    },
    setSpeed(speed) {
      // Chunks not yet asked for use the new speed.
      if (session) session.speed = speed;
    },
    level() {
      return snapshot.status === "speaking" && outRef ? outRef.level() : 0;
    },
    position() {
      const s = session;
      if (!s) return null;
      const lengths = s.chunks.map((c) => c.length);
      const total = lengths.reduce((a, b) => a + b, 0) || 1;
      const before = lengths.slice(0, s.index).reduce((a, b) => a + b, 0);
      const within = s.playing && s.playingDuration > 0 ? Math.min(1, s.playing.elapsed() / s.playingDuration) : 0;
      return { chunk: s.index, chunks: s.chunks.length, fraction: (before + (lengths[s.index] ?? 0) * within) / total };
    },
    getSnapshot: () => snapshot,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  return speaker;
}
