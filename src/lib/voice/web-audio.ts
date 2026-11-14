/**
 * The browser's audio output for the speaker: one AudioContext, decoded chunks played through a
 * gain and an analyser (the plush's speaking level), pause and resume by suspending the context.
 * Created on first use, in the browser only.
 *
 * The context is shared (`sharedAudioContext`): Talk mode reads the microphone's level through
 * the same one, so a single tap (opening Talk) unlocks both the Myte's voice and the meter.
 */

import type { AudioOut, Clip, PlayingClip } from "./speaker.ts";

interface WebClip extends Clip {
  buffer: AudioBuffer;
}

function levelOf(buf: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / (buf.length || 1)) * 3.2);
}

let sharedCtx: AudioContext | null = null;

/** The app's one AudioContext (created on first use; call it first from a click to unlock it). */
export function sharedAudioContext(): AudioContext {
  if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  sharedCtx = new Ctx();
  return sharedCtx;
}

export function createWebAudioOut(): AudioOut {
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let samples: Uint8Array<ArrayBuffer> | null = null;
  let smooth = 0;
  let holding = false;

  const context = (): AudioContext => {
    if (ctx) return ctx;
    ctx = sharedAudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.connect(ctx.destination);
    samples = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    return ctx;
  };

  return {
    async decode(data) {
      const c = context();
      const buffer = await c.decodeAudioData(data.slice(0));
      return { duration: buffer.duration, buffer } as WebClip;
    },
    play(clip, onEnded): PlayingClip {
      const c = context();
      const src = c.createBufferSource();
      src.buffer = (clip as WebClip).buffer;
      src.connect(analyser!);
      let done = false;
      src.onended = () => {
        if (done) return;
        done = true;
        onEnded();
      };
      const startedAt = c.currentTime;
      src.start();
      return {
        stop() {
          if (done) return;
          done = true;
          src.onended = null;
          try {
            src.stop();
          } catch {
            // never started
          }
          src.disconnect();
        },
        elapsed: () => Math.max(0, c.currentTime - startedAt),
      };
    },
    async unlock() {
      const c = context();
      if (holding) return c.state === "running" || c.state === "suspended";
      if (c.state === "suspended") {
        try {
          await c.resume();
        } catch {
          return false;
        }
      }
      return c.state === "running";
    },
    pause() {
      holding = true;
      void ctx?.suspend().catch(() => {});
    },
    resume() {
      holding = false;
      void ctx?.resume().catch(() => {});
    },
    level() {
      if (!analyser || !samples) return 0;
      analyser.getByteTimeDomainData(samples);
      smooth = smooth * 0.55 + levelOf(samples) * 0.45;
      return smooth;
    },
  };
}
