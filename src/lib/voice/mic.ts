"use client";

/**
 * The microphone for Talk mode and dictation (browser only): one `getUserMedia` stream with echo
 * cancellation and noise suppression, its level read through the app's shared AudioContext (the
 * same one the Myte speaks through, unlocked by the tap that opened Talk), and recordings of it
 * through `MediaRecorder` in the best format this browser has (`pickRecorderMime`).
 */

import { levelFrom } from "@/lib/ask-myte/voice-machine";
import { canRecord, createRollingRecorder, mediaRecorderTake, pickRecorderMime, type RollingRecorder, type Take } from "./listen";
import { sharedAudioContext } from "./web-audio";

export class MicError extends Error {
  constructor(public readonly kind: string) {
    super(kind);
  }
}

export interface Mic {
  level(): number;
  /** a rolling recorder over this stream (pre-roll included) */
  rolling(): RollingRecorder;
  /** one plain recording from now */
  take(): Take;
  close(): void;
}

export async function openMic(): Promise<Mic> {
  if (typeof window === "undefined" || !canRecord(window as unknown as Parameters<typeof canRecord>[0])) throw new MicError("unsupported");
  const mime = pickRecorderMime((t) => MediaRecorder.isTypeSupported(t));
  if (mime === null) throw new MicError("unsupported");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  } catch (err) {
    throw new MicError((err as { name?: string })?.name ?? "unknown");
  }
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let buf: Uint8Array<ArrayBuffer> | null = null;
  try {
    const ctx = sharedAudioContext();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    buf = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  } catch {
    // No meter: recording still works; the caller sees a level of 0.
  }
  const now = () => Date.now();
  return {
    level() {
      if (!analyser || !buf) return 0;
      analyser.getByteTimeDomainData(buf);
      return levelFrom(buf);
    },
    rolling: () => createRollingRecorder({ open: () => mediaRecorderTake(stream, mime, now), now }),
    take: () => mediaRecorderTake(stream, mime, now),
    close() {
      try {
        source?.disconnect();
      } catch {
        // already gone
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
