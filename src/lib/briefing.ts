/**
 * A briefing from your Myte ("Beyond the meeting", Layer 1): the pure rules the player, Home,
 * the after page, the settings and the tests share. No React, no browser globals at import time.
 *
 * - Where "open the moment" goes for each point (`momentHref`, `momentLabel`).
 * - Which device voice speaks it (`pickVoice`): the person's remembered voice when the device has
 *   it, else one chosen to match the persona (its language first, the better voices first, then
 *   stable per agent so the same agent always sounds the same), with the personality's pace and
 *   pitch (`voiceTone`).
 * - Where the playhead is: per-segment start fractions by length (`segmentStarts`) for the
 *   server-voice file, and the word being said (`wordAt`) for device speech.
 */

import type { components } from "./api/generated/core-api.ts";
import { defaultDoodleSeed, hashString, isDoodleSeed } from "./doodle.ts";

type Schemas = components["schemas"];
export type Briefing = Schemas["Briefing"];
export type BriefingSegment = Schemas["BriefingSegment"];
export type BriefingLink = Schemas["BriefingLink"];
export type BriefingSettings = Schemas["BriefingSettings"];
export type BriefingPreferences = Schemas["BriefingPreferences"];
export type MeetingBriefing = Schemas["MeetingBriefing"];
export type BriefingLatest = Schemas["BriefingLatest"];
export type BriefingPersonality = Schemas["BriefingAgent"]["personality"];

/** Playback speeds offered in the player and the settings. */
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export const LENGTHS = [
  { value: "short", label: "Short", description: "About 45 seconds: what needs you first" },
  { value: "standard", label: "Standard", description: "About 90 seconds: the whole picture" },
] as const;

/** Polling while the agent writes: every 2.5 s, for at most 3 minutes. */
export const POLL_MS = 2500;
export const POLL_LIMIT_MS = 180_000;

export function isWriting(b: Pick<Briefing, "status"> | null | undefined): boolean {
  return b?.status === "pending" || b?.status === "composing";
}

export function speedLabel(rate: number): string {
  return `${Number.isInteger(rate) ? rate.toFixed(0) : String(rate)}x`;
}

/** The nearest offered speed (a stored 1.1 shows as 1x). */
export function nearestSpeed(rate: number | null | undefined): number {
  const r = typeof rate === "number" && Number.isFinite(rate) ? rate : 1;
  return SPEEDS.reduce((best, s) => (Math.abs(s - r) < Math.abs(best - r) ? s : best), 1);
}

// --- open the moment --------------------------------------------------------------------------

export function momentHref(link: BriefingLink | null | undefined): string | null {
  if (!link) return null;
  const m = encodeURIComponent(link.meeting_id);
  if (typeof link.at_ms === "number" && link.at_ms >= 0) return `/meetings/${m}/transcript#t=${Math.floor(link.at_ms)}`;
  if (link.type === "decision" && link.id) return `/decisions/${encodeURIComponent(link.id)}`;
  if (link.type === "action") return "/work/tasks";
  if (link.type === "promise") return "/work/promises";
  return `/meetings/${m}`;
}

export function momentLabel(link: BriefingLink | null | undefined): string {
  if (!link) return "";
  if (typeof link.at_ms === "number" && link.at_ms >= 0) return "Open the moment";
  switch (link.type) {
    case "decision":
      return "Open the decision";
    case "action":
      return "Open the task";
    case "promise":
      return "Open your promises";
    default:
      return "Open the meeting";
  }
}

// --- voices -----------------------------------------------------------------------------------

/** The parts of a SpeechSynthesisVoice the choice reads (plain objects in tests). */
export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
  voiceURI?: string;
}

const GOOD = /(natural|neural|enhanced|premium|siri|google|online)/i;
const NOVELTY = /(whisper|bells|bad news|good news|bubbles|cellos|zarvox|trinoids|jester|organ|superstar|boing|albert|bahh|wobble|deranged|hysterical|pipe organ|fred|junior|ralph)/i;

function langOf(code: string | null | undefined): string {
  return (code ?? "").toLowerCase().split(/[-_]/)[0] ?? "";
}

/** The voices that can speak `language`, best first. Novelty voices are never offered. */
export function voicesFor<T extends VoiceLike>(voices: readonly T[], language: string): T[] {
  const want = langOf(language) || "en";
  return voices
    .filter((v) => langOf(v.lang) === want && !NOVELTY.test(v.name))
    .sort((a, b) => Number(GOOD.test(b.name)) - Number(GOOD.test(a.name)) || a.name.localeCompare(b.name));
}

/**
 * The voice for this briefing: the remembered one when the device has it for this language, else
 * a stable pick for this agent among the best voices of the language (so two people's Mytes tend
 * to sound different, and one agent never changes its voice between briefings).
 */
export function pickVoice<T extends VoiceLike>(
  voices: readonly T[],
  opts: { language: string; seed: string; preferred?: string | null },
): T | null {
  const usable = voicesFor(voices, opts.language);
  if (usable.length === 0) return null;
  if (opts.preferred) {
    const chosen = usable.find((v) => v.name === opts.preferred || v.voiceURI === opts.preferred);
    if (chosen) return chosen;
  }
  const best = usable.filter((v) => GOOD.test(v.name));
  const pool = best.length > 0 ? best : usable;
  return pool[hashString(`voice:${opts.seed}`) % pool.length] ?? null;
}

/** Pace and pitch for the persona (ADR-0038 presets), multiplied with the person's speed. */
export function voiceTone(personality: BriefingPersonality | string | null | undefined): { rate: number; pitch: number } {
  switch (personality) {
    case "concise":
      return { rate: 1.08, pitch: 1 };
    case "direct":
      return { rate: 1.05, pitch: 0.94 };
    case "detailed":
      return { rate: 0.96, pitch: 1 };
    case "friendly":
      return { rate: 1, pitch: 1.08 };
    default:
      return { rate: 1, pitch: 1 };
  }
}

/** The agent's doodle seed, or the default drawn from its person (never the person's own face). */
export function agentSeed(seed: string | null | undefined, ownerId: string): string {
  return isDoodleSeed(seed) ? seed : defaultDoodleSeed(`agent:${ownerId || "someone"}`);
}

// --- the playhead -----------------------------------------------------------------------------

/** Where each segment starts, as a fraction of the whole (by characters spoken), plus 1 at the end. */
export function segmentStarts(segments: readonly Pick<BriefingSegment, "text">[]): number[] {
  const lengths = segments.map((s) => Math.max(1, s.text.length + 2));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const out: number[] = [];
  let at = 0;
  for (const n of lengths) {
    out.push(at / total);
    at += n;
  }
  out.push(1);
  return out;
}

/** The segment playing at `fraction` (0..1) of the whole. */
export function segmentAt(starts: readonly number[], fraction: number): number {
  const f = Math.min(Math.max(fraction, 0), 0.999999);
  for (let i = starts.length - 2; i >= 0; i -= 1) {
    if (f >= (starts[i] ?? 0)) return i;
  }
  return 0;
}

/** The [start, end) of the word at `charIndex` (a speech boundary event), or null. */
export function wordAt(text: string, charIndex: number): [number, number] | null {
  if (charIndex < 0 || charIndex >= text.length) return null;
  let start = charIndex;
  while (start > 0 && !/\s/.test(text[start - 1] ?? "")) start -= 1;
  let end = charIndex;
  while (end < text.length && !/\s/.test(text[end] ?? "")) end += 1;
  return end > start ? [start, end] : null;
}

/** "1:32" for 92 seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Seconds a segment takes at 150 words a minute, at `rate`. */
export function segmentSeconds(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (words * 60) / 150 / Math.max(0.25, rate);
}

// --- copy -------------------------------------------------------------------------------------

/** The line under the agent's name: what this briefing covers. */
export function coverLine(b: Pick<Briefing, "meeting_title" | "trigger">): string {
  if (b.meeting_title) return `After ${b.meeting_title}`;
  return b.trigger === "on_demand" ? "Since your last briefing" : "Your latest meetings";
}

export function unavailableCopy(reason: Briefing["reason"]): string {
  switch (reason) {
    case "budget":
      return "Your workspace has used its agent budget for now, so this briefing was not written. An admin can raise the budget.";
    case "timeout":
      return "Your Myte could not be reached in time. Nothing was lost; ask again.";
    default:
      return "Something went wrong while it was being written. Nothing was lost; ask again.";
  }
}

export const KIND_LABEL: Record<BriefingSegment["kind"], string> = {
  opening: "Hello",
  changed: "What changed",
  waiting: "Waiting on you",
  promise: "Your promise",
  question: "Still open",
  closing: "That's all",
};
