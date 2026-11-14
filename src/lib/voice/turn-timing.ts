/**
 * Talk mode's latency telemetry: how long each step of a spoken turn took, measured from the end
 * of the person's speech (the moment voice-activity detection closed the clip, which is about
 * `SILENCE_MS` after their last word, or at once when they press Send now).
 *
 *   stt     transcript received
 *   step    first `step` event
 *   text    first `delta` (answer text)
 *   audio   first answer audio playing
 *   done    the stream's `done`
 *   filler  the first filler's first sound
 *
 * Each mark is kept once (the first time). Pure, tested in tests/voice-turn-timing.test.ts.
 */

export type TimingMark = "stt" | "step" | "text" | "audio" | "done" | "filler";
export const TIMING_MARKS: readonly TimingMark[] = ["stt", "step", "text", "audio", "done", "filler"];

export type TurnSummary = { turn: number } & Record<TimingMark, number | null>;

export interface TurnTiming {
  readonly turn: number;
  mark(name: TimingMark, at: number): void;
  has(name: TimingMark): boolean;
  summary(): TurnSummary;
}

export function createTurnTiming(turn: number, speechEndAt: number): TurnTiming {
  const marks = new Map<TimingMark, number>();
  return {
    turn,
    mark(name, at) {
      if (!marks.has(name)) marks.set(name, Math.max(0, Math.round(at - speechEndAt)));
    },
    has: (name) => marks.has(name),
    summary() {
      const out = { turn } as TurnSummary;
      for (const m of TIMING_MARKS) out[m] = marks.get(m) ?? null;
      return out;
    },
  };
}

const LABEL: Record<TimingMark, string> = { stt: "stt", step: "step", text: "text", audio: "audio", done: "done", filler: "filler" };

/** "1.24 s", or "-" when it never happened. */
export function formatMs(ms: number | null): string {
  if (ms === null) return "-";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

/** The one-line summary logged per turn. */
export function formatSummary(s: TurnSummary): string {
  return `[talk] turn ${s.turn} from end of speech: ${TIMING_MARKS.map((m) => `${LABEL[m]} ${formatMs(s[m])}`).join(", ")}`;
}

/** Whether the page asked for the timing overlay (`?voice-debug=1`). */
export function wantsVoiceDebug(search: string): boolean {
  return new URLSearchParams(search).get("voice-debug") === "1";
}
