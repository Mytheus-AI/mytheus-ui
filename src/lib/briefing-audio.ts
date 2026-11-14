/**
 * Which voice a briefing plays in, and waiting for its recording (mytheus-backend PR #39 renders
 * the whole briefing quickly after it is written).
 *
 * - `ready`: the recorded file plays: one file, no gaps.
 * - `pending`: the player says "Preparing your briefing's voice…" and asks again every
 *   `AUDIO_POLL_MS` (2 s) for up to `AUDIO_WAIT_MS` (20 s). Ready in time: the file. Failed or
 *   still not ready: the Myte speaks it live (every segment rendered ahead, so no waits).
 * - `none` / `failed`: live straight away.
 *
 * Pure (polling and sleeping are injected), tested in tests/briefing-audio.test.ts.
 */

export type AudioStatus = "none" | "pending" | "ready" | "failed";
export type AudioPlan = "file" | "wait" | "live";

export const AUDIO_POLL_MS = 2000;
export const AUDIO_WAIT_MS = 20_000;

export function audioPlan(status: AudioStatus | null | undefined): AudioPlan {
  if (status === "ready") return "file";
  if (status === "pending") return "wait";
  return "live";
}

export type WaitOutcome = "ready" | "failed" | "timeout" | "cancelled";

/**
 * Ask for the briefing's audio status every `pollMs` until it is ready or failed, or `waitMs` has
 * passed. A poll that fails (network) counts as still pending.
 */
export async function waitForAudio(opts: {
  poll: () => Promise<AudioStatus | null>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  signal?: AbortSignal;
  pollMs?: number;
  waitMs?: number;
}): Promise<WaitOutcome> {
  const pollMs = opts.pollMs ?? AUDIO_POLL_MS;
  const waitMs = opts.waitMs ?? AUDIO_WAIT_MS;
  const began = opts.now();
  for (;;) {
    if (opts.signal?.aborted) return "cancelled";
    if (opts.now() - began >= waitMs) return "timeout";
    await opts.sleep(pollMs);
    if (opts.signal?.aborted) return "cancelled";
    const status = await opts.poll().catch(() => null);
    if (opts.signal?.aborted) return "cancelled";
    if (status === "ready") return "ready";
    if (status === "failed" || status === "none") return "failed";
  }
}
