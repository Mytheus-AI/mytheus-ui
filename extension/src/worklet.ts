/**
 * `pcm-encoder`: an AudioWorklet that turns one capture source into 16 kHz mono s16le frames on
 * the audio thread and posts each frame (as a transferred ArrayBuffer) to the offscreen page.
 * The resampling and framing live in `lib/pcm.ts`, which `node --test` covers.
 */

import { PcmEncoder, toLittleEndianBytes, toMono } from "./lib/pcm.ts";

// The AudioWorkletGlobalScope is not in TypeScript's DOM lib.
declare const sampleRate: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

class PcmEncoderProcessor extends AudioWorkletProcessor {
  private readonly encoder = new PcmEncoder(sampleRate);

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    if (input && input.length > 0) {
      for (const frame of this.encoder.push(toMono(input))) {
        const bytes = toLittleEndianBytes(frame);
        this.port.postMessage(bytes, [bytes]);
      }
    }
    return true; // keep running for the life of the capture
  }
}

registerProcessor("pcm-encoder", PcmEncoderProcessor);
