/**
 * Talk to Myte (ADR-0049 F6): the voice mode's state machine. When it opens the Myte greets the
 * person in its own voice, then listens. The microphone is recorded and voice-activity detection
 * (`lib/voice/vad.ts`) decides when someone starts and stops talking; the clip is transcribed by
 * the server, sent as the question, the answer is spoken, and it listens again. Half-duplex: it
 * never records while it speaks; Space (or the button) interrupts it and listens.
 *
 * The component owns the browser engines and feeds their events in here; this decides what
 * happens next and what the plush shows. Pure, tested in tests/ask-myte-voice.test.ts.
 */

export type VoicePhase = "idle" | "greeting" | "listening" | "transcribing" | "thinking" | "speaking" | "paused" | "ended";

export interface VoiceState {
  phase: VoicePhase;
  /** the person is talking right now (an utterance is being recorded) */
  talking: boolean;
  /** the answer is not read aloud; it listens again as soon as the answer is done */
  muted: boolean;
  /** what was running when the person paused */
  resumeTo: "listening" | "speaking" | null;
  /** increments when a question is sent, so the component sends each one once */
  turn: number;
  /** the question sent this turn (the words it heard) */
  sent: string | null;
  /** increments for each clip to transcribe, so the component sends each one once */
  clip: number;
  /** a quiet note ("I didn't catch that") */
  note: string | null;
  error: string | null;
}

export type VoiceEvent =
  | { type: "start"; greet?: boolean }
  | { type: "greeted" }
  | { type: "speech-start" }
  | { type: "speech-end" }
  | { type: "speech-discard" }
  | { type: "send-now" }
  | { type: "transcript"; text: string }
  | { type: "transcribe-failed"; message: string; fatal?: boolean }
  | { type: "answer-done"; spoken: boolean }
  | { type: "answer-failed"; message: string }
  | { type: "spoken" }
  | { type: "interrupt" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "mute"; muted: boolean }
  | { type: "mic-error"; message: string }
  | { type: "end" };

/** ms of quiet after speech that ends an utterance (the VAD's `silenceMs`) */
export const SILENCE_MS = 1200;
export const NOT_CAUGHT = "I didn't catch that. Try again?";

export const initialVoice: VoiceState = { phase: "idle", talking: false, muted: false, resumeTo: null, turn: 0, sent: null, clip: 0, note: null, error: null };

export function voiceReducer(s: VoiceState, e: VoiceEvent): VoiceState {
  if (s.phase === "ended" && e.type !== "start") return s;
  switch (e.type) {
    case "start":
      return { ...initialVoice, muted: s.muted, turn: s.turn, clip: s.clip, phase: e.greet && !s.muted ? "greeting" : "listening" };
    case "greeted":
      return s.phase === "greeting" ? { ...s, phase: "listening" } : s;
    case "speech-start":
      return s.phase === "listening" ? { ...s, talking: true, note: null, error: null } : s;
    case "speech-discard":
      return s.phase === "listening" ? { ...s, talking: false } : s;
    case "speech-end":
    case "send-now":
      // The utterance is over: the clip goes to be transcribed.
      if (s.phase !== "listening" || !s.talking) return s;
      return { ...s, phase: "transcribing", talking: false, clip: s.clip + 1, note: null, error: null };
    case "transcript": {
      if (s.phase !== "transcribing") return s;
      const q = e.text.trim();
      if (!q) return { ...s, phase: "listening", note: NOT_CAUGHT };
      return { ...s, phase: "thinking", sent: q, turn: s.turn + 1, note: null, error: null };
    }
    case "transcribe-failed":
      if (s.phase !== "transcribing") return s;
      return e.fatal ? { ...s, phase: "paused", resumeTo: "listening", error: e.message } : { ...s, phase: "listening", error: e.message };
    case "answer-done":
      if (s.phase !== "thinking") return s;
      return { ...s, phase: e.spoken && !s.muted ? "speaking" : "listening" };
    case "answer-failed":
      if (s.phase !== "thinking") return s;
      return { ...s, phase: "listening", error: e.message };
    case "spoken":
      return s.phase === "speaking" ? { ...s, phase: "listening" } : s;
    case "interrupt":
      // Space (or the button) while it speaks or greets: it stops and listens.
      return s.phase === "speaking" || s.phase === "greeting" ? { ...s, phase: "listening" } : s;
    case "pause":
      if (s.phase === "listening" || s.phase === "speaking") return { ...s, phase: "paused", resumeTo: s.phase, talking: false };
      if (s.phase === "greeting") return { ...s, phase: "paused", resumeTo: "listening" };
      return s;
    case "resume":
      return s.phase === "paused" ? { ...s, phase: s.resumeTo === "speaking" ? "speaking" : "listening", resumeTo: null, error: null } : s;
    case "mute":
      return { ...s, muted: e.muted, phase: e.muted && (s.phase === "speaking" || s.phase === "greeting") ? "listening" : s.phase };
    case "mic-error":
      return { ...s, phase: "paused", resumeTo: "listening", talking: false, error: e.message };
    case "end":
      return { ...s, phase: "ended", talking: false, resumeTo: null };
    default:
      return s;
  }
}

/** What Space does in each phase: listen, send what it is hearing, or stop it talking. */
export function spaceEvent(s: VoiceState): VoiceEvent | null {
  switch (s.phase) {
    case "idle":
      return { type: "start" };
    case "paused":
      return { type: "resume" };
    case "listening":
      return s.talking ? { type: "send-now" } : { type: "pause" };
    case "speaking":
    case "greeting":
      return { type: "interrupt" };
    default:
      return null;
  }
}

/** Whether the microphone should be recording in this state (half-duplex). */
export function recording(s: Pick<VoiceState, "phase">): boolean {
  return s.phase === "listening";
}

/** The plush's state for each phase (PlushLive: idle, listening, thinking, speaking, happy). */
export function plushFor(phase: VoicePhase): "idle" | "listening" | "thinking" | "speaking" {
  if (phase === "listening") return "listening";
  if (phase === "thinking" || phase === "transcribing") return "thinking";
  if (phase === "speaking" || phase === "greeting") return "speaking";
  return "idle";
}

/** The status line, in the Myte's name ("Pip is listening"). */
export function phaseWords(phase: VoicePhase, name: string): string {
  switch (phase) {
    case "greeting":
    case "speaking":
      return `${name} is speaking`;
    case "listening":
      return `${name} is listening`;
    case "transcribing":
    case "thinking":
      return "Thinking…";
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

/* ---------------- the greeting ---------------- */

/** The first word of a display name ("Sushan Adhikari" -> "Sushan"), or "" for an email or nothing. */
export function firstNameOf(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n || n.includes("@")) return "";
  return n.split(/\s+/)[0]!.slice(0, 40);
}

/** The Myte's opening line, in character: its name and the person's first name, one of four. */
export function greetingLines(myte: string, first: string): string[] {
  const hi = first ? `Hi ${first}` : "Hi";
  const hey = first ? `Hey ${first}` : "Hey there";
  const hello = first ? `Hello ${first}` : "Hello";
  return [
    `${hi}, it's ${myte}. What can I find for you?`,
    `${hey}, ${myte} here. What's on your mind?`,
    `${hello}, it's ${myte}. What would you like to know?`,
    `${hi}! ${myte} here. Ask me anything about your work.`,
  ];
}

/** One greeting, chosen by `random` (0..1), never the same as `last` when there is a choice. */
export function pickGreeting(myte: string, first: string, random: () => number = Math.random, last?: string | null): string {
  const lines = greetingLines(myte, first);
  const pool = lines.filter((l) => l !== last);
  const from = pool.length ? pool : lines;
  return from[Math.min(from.length - 1, Math.floor(random() * from.length))]!;
}
