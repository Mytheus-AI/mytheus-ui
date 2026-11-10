/**
 * Turning browser audio into what `/capture/audio` accepts: 16 kHz, mono, signed 16-bit
 * little-endian PCM, in fixed-size frames.
 *
 * The capture `AudioContext` runs at the device rate (usually 48 kHz, sometimes 44.1 kHz), and an
 * AudioWorklet hands over 128-sample blocks. `PcmEncoder` keeps state across blocks so frame
 * boundaries never drop or duplicate a sample:
 *
 * 1. Downsample by box-averaging each output sample's span of input samples. The average is a
 *    cheap low-pass, enough to keep speech energy above 8 kHz from folding back as noise, and it
 *    handles non-integer ratios (44.1 kHz -> 16 kHz) as well as integer ones.
 * 2. Clamp to [-1, 1] and convert to int16.
 * 3. Cut into frames of `frameSamples` (50 ms = 800 samples = 1600 bytes by default), which sits
 *    in the 10-100 ms range the server expects and far below its 64 KiB frame limit.
 *
 * Pure and dependency-free: imported by the worklet bundle and by `node --test`.
 */

export const TARGET_SAMPLE_RATE = 16000;
export const FRAME_MS = 50;
export const FRAME_SAMPLES = (TARGET_SAMPLE_RATE * FRAME_MS) / 1000;

export function floatToInt16(sample: number): number {
  const clamped = sample > 1 ? 1 : sample < -1 ? -1 : Number.isNaN(sample) ? 0 : sample;
  return clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
}

export class PcmEncoder {
  readonly inputRate: number;
  readonly frameSamples: number;
  private readonly ratio: number;
  /** Position, in input samples, where the next output sample's span starts. */
  private cursor = 0;
  /** Input samples not yet consumed (the tail of the previous block). */
  private pending: Float32Array = new Float32Array(0);
  private frame: Int16Array;
  private filled = 0;

  constructor(inputRate: number, frameSamples: number = FRAME_SAMPLES) {
    if (!(inputRate >= TARGET_SAMPLE_RATE)) {
      throw new RangeError(`input rate ${inputRate} is below ${TARGET_SAMPLE_RATE} Hz`);
    }
    if (!Number.isInteger(frameSamples) || frameSamples <= 0) {
      throw new RangeError("frameSamples must be a positive integer");
    }
    this.inputRate = inputRate;
    this.frameSamples = frameSamples;
    this.ratio = inputRate / TARGET_SAMPLE_RATE;
    this.frame = new Int16Array(frameSamples);
  }

  /** Feeds one block of mono float samples; returns every frame completed by it, in order. */
  push(block: Float32Array): Int16Array[] {
    const input = new Float32Array(this.pending.length + block.length);
    input.set(this.pending, 0);
    input.set(block, this.pending.length);

    const out: Int16Array[] = [];
    let cursor = this.cursor;
    while (cursor + this.ratio <= input.length) {
      const start = Math.floor(cursor);
      const end = Math.max(start + 1, Math.floor(cursor + this.ratio));
      let sum = 0;
      for (let i = start; i < end; i++) sum += input[i];
      this.frame[this.filled++] = floatToInt16(sum / (end - start));
      if (this.filled === this.frameSamples) {
        out.push(this.frame);
        this.frame = new Int16Array(this.frameSamples);
        this.filled = 0;
      }
      cursor += this.ratio;
    }

    const consumed = Math.floor(cursor);
    this.pending = input.slice(consumed);
    this.cursor = cursor - consumed;
    return out;
  }

  /** The partial frame, if any (on stop), so the last words are not lost. */
  flush(): Int16Array | null {
    if (this.filled === 0) return null;
    const last = this.frame.slice(0, this.filled);
    this.frame = new Int16Array(this.frameSamples);
    this.filled = 0;
    return last;
  }
}

/** Little-endian bytes of an int16 frame (the wire format), independent of host endianness. */
export function toLittleEndianBytes(frame: Int16Array): ArrayBuffer {
  const buffer = new ArrayBuffer(frame.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < frame.length; i++) view.setInt16(i * 2, frame[i], true);
  return buffer;
}

/** Mixes a multi-channel block to mono (tab audio is usually stereo). */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const length = channels[0].length;
  const out = new Float32Array(length);
  for (const channel of channels) {
    for (let i = 0; i < length; i++) out[i] += channel[i] / channels.length;
  }
  return out;
}

/** Root-mean-square level of a frame in [0, 1], for the popup's "we can hear you" meter. */
export function level(frame: Int16Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += (frame[i] / 0x8000) ** 2;
  return Math.sqrt(sum / frame.length);
}
