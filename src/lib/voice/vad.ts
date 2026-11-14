/**
 * Voice-activity detection for Talk mode and dictation: decides from the microphone's level
 * (0..1, `levelFrom` over the Web Audio analyser, sampled about every 50 ms) when someone starts
 * talking and when they have finished.
 *
 * - The first `calibrateMs` (500 ms) measure the room: the noise floor is the median level then
 *   (capped, so someone already talking cannot make it deaf). While nobody talks the floor keeps
 *   drifting slowly toward the room as it is now.
 * - Speech starts when the level stays at or above the speech threshold for `onsetMs` (100 ms):
 *   `floor * 2.5 + 0.05`, kept within 0.08..0.4. A click or a tap on the desk is shorter.
 * - It ends after `silenceMs` (1.2 s) below the lower silence threshold (hysteresis:
 *   `floor * 1.6 + 0.03`, at most three quarters of the speech threshold), or at `maxMs` (30 s).
 * - An utterance with under `minSpeechMs` (250 ms) of voice in it is a cough or a bump: `discard`.
 *
 * The recorder keeps a pre-roll, so the first syllable before the onset is never lost.
 * Pure (time is passed in), tested in tests/voice-vad.test.ts.
 */

export interface VadConfig {
  calibrateMs: number;
  onsetMs: number;
  silenceMs: number;
  maxMs: number;
  minSpeechMs: number;
}

export const VAD_DEFAULTS: VadConfig = { calibrateMs: 500, onsetMs: 100, silenceMs: 1200, maxMs: 30_000, minSpeechMs: 250 };

/** `start`: speech began; `end`: it finished (silence); `cap`: it ran to the limit; `discard`: too short to be words. */
export type VadEvent = "start" | "end" | "cap" | "discard";

export interface Thresholds {
  floor: number;
  speech: number;
  silence: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function thresholdsFor(floor: number): Thresholds {
  const speech = clamp(floor * 2.5 + 0.05, 0.08, 0.4);
  const silence = Math.min(clamp(floor * 1.6 + 0.03, 0.04, 0.3), speech * 0.75);
  return { floor, speech, silence };
}

const FLOOR_CAP = 0.12;

function median(xs: number[]): number {
  if (!xs.length) return 0.02;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

export interface Vad {
  /** Feed one level reading; returns what changed, if anything. */
  push(level: number, at: number): VadEvent | null;
  /** End the utterance now (Space): `end` when there was speech, else null. */
  finish(at: number): VadEvent | null;
  /** Start over (each time listening begins); keeps the floor once measured unless `recalibrate`. */
  reset(at: number, recalibrate?: boolean): void;
  readonly speaking: boolean;
  readonly calibrating: boolean;
  thresholds(): Thresholds;
}

export function createVad(config: Partial<VadConfig> = {}): Vad {
  const c = { ...VAD_DEFAULTS, ...config };
  let t0 = 0;
  let calibrating = true;
  let samples: number[] = [];
  let floor = 0.02;
  let speaking = false;
  let onsetAt: number | null = null;
  let startAt = 0;
  let lastVoiceAt = 0;
  let lastAt = 0;
  let voicedMs = 0;

  const end = (at: number, kind: "end" | "cap"): VadEvent => {
    speaking = false;
    onsetAt = null;
    lastAt = at;
    return voicedMs >= c.minSpeechMs || kind === "cap" ? kind : "discard";
  };

  return {
    push(level, at) {
      const dt = lastAt ? Math.max(0, at - lastAt) : 0;
      lastAt = at;
      if (calibrating) {
        if (at - t0 < c.calibrateMs) {
          samples.push(level);
          return null;
        }
        calibrating = false;
        if (samples.length) floor = Math.min(FLOOR_CAP, median(samples));
        samples = [];
      }
      const th = thresholdsFor(floor);
      if (!speaking) {
        if (level >= th.speech) {
          onsetAt ??= at;
          if (at - onsetAt >= c.onsetMs) {
            speaking = true;
            startAt = onsetAt;
            lastVoiceAt = at;
            voicedMs = at - onsetAt;
            return "start";
          }
        } else {
          onsetAt = null;
          // The room changes (a fan, a window): follow it slowly while nobody talks.
          floor = Math.min(FLOOR_CAP, floor * 0.97 + level * 0.03);
        }
        return null;
      }
      if (level >= th.silence) {
        lastVoiceAt = at;
        voicedMs += dt;
      }
      if (at - startAt >= c.maxMs) return end(at, "cap");
      if (at - lastVoiceAt >= c.silenceMs) return end(at, "end");
      return null;
    },
    finish(at) {
      if (!speaking) return null;
      speaking = false;
      onsetAt = null;
      lastAt = at;
      return "end";
    },
    reset(at, recalibrate = false) {
      t0 = at;
      lastAt = 0;
      speaking = false;
      onsetAt = null;
      voicedMs = 0;
      if (recalibrate || calibrating) {
        calibrating = true;
        samples = [];
      }
    },
    get speaking() {
      return speaking;
    },
    get calibrating() {
      return calibrating;
    },
    thresholds: () => thresholdsFor(floor),
  };
}
