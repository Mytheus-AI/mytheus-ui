import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FRAME_SAMPLES,
  PcmEncoder,
  floatToInt16,
  level,
  toLittleEndianBytes,
  toMono,
} from "../src/lib/pcm.ts";

function blocks(total: number, size: number, fill: (i: number) => number): Float32Array[] {
  const out: Float32Array[] = [];
  for (let start = 0; start < total; start += size) {
    const n = Math.min(size, total - start);
    out.push(Float32Array.from({ length: n }, (_, k) => fill(start + k)));
  }
  return out;
}

test("int16 conversion clamps and keeps the full range", () => {
  assert.equal(floatToInt16(0), 0);
  assert.equal(floatToInt16(1), 32767);
  assert.equal(floatToInt16(-1), -32768);
  assert.equal(floatToInt16(2.5), 32767);
  assert.equal(floatToInt16(-7), -32768);
  assert.equal(floatToInt16(Number.NaN), 0);
});

test("48 kHz in 128-sample worklet blocks becomes exact 50 ms frames of 16 kHz", () => {
  const encoder = new PcmEncoder(48000);
  const frames: Int16Array[] = [];
  for (const block of blocks(48000, 128, () => 0.5)) frames.push(...encoder.push(block));
  // one second of input is exactly 16000 output samples: 20 frames of 800, nothing dropped
  assert.equal(FRAME_SAMPLES, 800);
  assert.equal(frames.length, 20);
  assert.ok(frames.every((f) => f.length === 800));
  assert.ok(frames.every((f) => f.every((s) => s === floatToInt16(0.5))));
  assert.equal(encoder.flush(), null);
});

test("44.1 kHz (a non-integer ratio) keeps the sample count across block boundaries", () => {
  const encoder = new PcmEncoder(44100, 160);
  let samples = 0;
  for (const block of blocks(44100 * 2, 128, () => -0.25)) {
    for (const frame of encoder.push(block)) samples += frame.length;
  }
  const tail = encoder.flush();
  samples += tail ? tail.length : 0;
  assert.ok(Math.abs(samples - 32000) <= 1, `got ${samples} samples for 2 s`);
});

test("block size does not change the output (state carries across pushes)", () => {
  const signal = (i: number) => Math.sin(i / 7) * 0.8;
  const run = (size: number) => {
    const encoder = new PcmEncoder(48000, 160);
    const out: number[] = [];
    for (const block of blocks(9600, size, signal)) for (const f of encoder.push(block)) out.push(...f);
    return out;
  };
  assert.deepEqual(run(128), run(1000));
  assert.deepEqual(run(128), run(9600));
});

test("box averaging takes the energy out of tones above the 8 kHz Nyquist", () => {
  const encoder = new PcmEncoder(48000, 1600);
  // 12 kHz at 48 kHz: four samples per period, each 3-sample average lands near zero
  const frames = encoder.push(Float32Array.from({ length: 4800 }, (_, i) => Math.sin((Math.PI / 2) * i)));
  assert.equal(frames.length, 1);
  assert.ok(level(frames[0]) < 0.35, `residual level ${level(frames[0])}`);
});

test("rates below 16 kHz and bad frame sizes are refused", () => {
  assert.throws(() => new PcmEncoder(8000));
  assert.throws(() => new PcmEncoder(48000, 0));
});

test("the wire bytes are little-endian int16", () => {
  const bytes = new Uint8Array(toLittleEndianBytes(Int16Array.from([1, -2, 0x1234])));
  assert.deepEqual([...bytes], [0x01, 0x00, 0xfe, 0xff, 0x34, 0x12]);
});

test("stereo tab audio is mixed to mono", () => {
  const mono = toMono([Float32Array.from([1, 0.5]), Float32Array.from([0, -0.5])]);
  assert.deepEqual([...mono], [0.5, 0]);
  const single = Float32Array.from([0.1]);
  assert.equal(toMono([single]), single);
  assert.equal(toMono([]).length, 0);
});
