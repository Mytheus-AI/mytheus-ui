/**
 * Talk to Myte (ADR-0049 F6): the voice mode's state machine. The plush listens (browser speech
 * recognition), thinks while the answer's steps run, speaks the answer in its own voice, then
 * listens again. A pause of about 1.2 seconds after you stop talking sends what it heard.
 *
 * The component owns the browser engines and feeds their events in here; this decides what
 * happens next and what the plush shows. Pure, tested in tests/ask-myte-voice.test.ts.
 */

export type VoicePhase = "idle" | "listening" | "thinking" | "speaking" | "paused" | "ended";

export interface VoiceState {
  phase: VoicePhase;
  /** what it heard this turn (interim words included) */
  heard: string;
  /** ms of the last words heard, for the silence timer */
  heardAt: number;
  /** the answer is not read aloud; it listens again as soon as the answer is done */
  muted: boolean;
  /** what was running when the person paused */
  resumeTo: "listening" | "speaking" | null;
  /** increments when a question is sent, so the component sends each one once */
  turn: number;
  /** the question sent this turn */
  sent: string | null;
  error: string | null;
}

export type VoiceEvent =
  | { type: "start" }
  | { type: "heard"; text: string; at: number }
  | { type: "tick"; at: number }
  | { type: "send-now" }
  | { type: "answer-done"; spoken: boolean }
  | { type: "answer-failed"; message: string }
  | { type: "spoken" }
  | { type: "interrupt" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "mute"; muted: boolean }
  | { type: "mic-error"; message: string }
  | { type: "end" };

export const SILENCE_MS = 1200;

export const initialVoice: VoiceState = { phase: "idle", heard: "", heardAt: 0, muted: false, resumeTo: null, turn: 0, sent: null, error: null };

const send = (s: VoiceState): VoiceState => {
  const q = s.heard.trim();
  if (!q) return s;
  return { ...s, phase: "thinking", sent: q, turn: s.turn + 1, heard: "", heardAt: 0, error: null };
};

export function voiceReducer(s: VoiceState, e: VoiceEvent): VoiceState {
  if (s.phase === "ended" && e.type !== "start") return s;
  switch (e.type) {
    case "start":
      return { ...initialVoice, muted: s.muted, turn: s.turn, phase: "listening" };
    case "heard":
      if (s.phase !== "listening") return s;
      return { ...s, heard: e.text, heardAt: e.at, error: null };
    case "tick":
      // A quiet pause after real words sends them.
      if (s.phase === "listening" && s.heard.trim() && s.heardAt && e.at - s.heardAt >= SILENCE_MS) return send(s);
      return s;
    case "send-now":
      return s.phase === "listening" ? send(s) : s;
    case "answer-done":
      if (s.phase !== "thinking") return s;
      return { ...s, phase: e.spoken && !s.muted ? "speaking" : "listening" };
    case "answer-failed":
      if (s.phase !== "thinking") return s;
      return { ...s, phase: "listening", error: e.message };
    case "spoken":
      return s.phase === "speaking" ? { ...s, phase: "listening" } : s;
    case "interrupt":
      // Talking over it (or Space) while it speaks: it stops and listens.
      return s.phase === "speaking" ? { ...s, phase: "listening" } : s;
    case "pause":
      if (s.phase === "listening" || s.phase === "speaking") return { ...s, phase: "paused", resumeTo: s.phase, heard: s.phase === "listening" ? s.heard : "" };
      return s;
    case "resume":
      return s.phase === "paused" ? { ...s, phase: s.resumeTo === "speaking" ? "speaking" : "listening", resumeTo: null } : s;
    case "mute":
      return { ...s, muted: e.muted, phase: e.muted && s.phase === "speaking" ? "listening" : s.phase };
    case "mic-error":
      return { ...s, phase: "paused", resumeTo: "listening", error: e.message };
    case "end":
      return { ...s, phase: "ended", heard: "", resumeTo: null };
    default:
      return s;
  }
}

/** What Space does in each phase: listen, send what it heard, or stop it talking. */
export function spaceEvent(s: VoiceState): VoiceEvent | null {
  switch (s.phase) {
    case "idle":
    case "paused":
      return s.phase === "idle" ? { type: "start" } : { type: "resume" };
    case "listening":
      return s.heard.trim() ? { type: "send-now" } : { type: "pause" };
    case "speaking":
      return { type: "interrupt" };
    default:
      return null;
  }
}

/** The plush's state for each phase (PlushLive: idle, listening, thinking, speaking, happy). */
export function plushFor(phase: VoicePhase): "idle" | "listening" | "thinking" | "speaking" {
  if (phase === "listening") return "listening";
  if (phase === "thinking") return "thinking";
  if (phase === "speaking") return "speaking";
  return "idle";
}

/** The status line, in the Myte's name ("Pip is listening"). */
export function phaseWords(phase: VoicePhase, name: string): string {
  switch (phase) {
    case "listening":
      return `${name} is listening`;
    case "thinking":
      return `${name} is looking`;
    case "speaking":
      return `${name} is speaking`;
    case "paused":
      return "Paused";
    case "ended":
      return "Ended";
    default:
      return `Press Space or Start to talk to ${name}`;
  }
}

/** A mic level from analyser bytes (0..255 time-domain samples): RMS, eased into 0..1. */
export function levelFrom(samples: ArrayLike<number>): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / samples.length);
  return Math.min(1, Math.max(0, rms * 3.2));
}
