import type { Briefing, BriefingSettings } from "../../src/lib/briefing";

/* A briefing as core-api serves it (after the pricing review), and the person's settings. */

const M = "7c39080a-f566-4672-aa31-0aec460f4975";

export const BRIEFING: Briefing = {
  id: "b1d61777-9309-4beb-b9c2-4e1e27ef29ca",
  trigger: "meeting_end",
  status: "ready",
  reason: null,
  meeting_id: M,
  meeting_title: "Pricing review",
  length: "standard",
  language: "en",
  agent: { name: "Juniper", seed: null, personality: "friendly" },
  segments: [
    { id: "s1", kind: "opening", text: "Hi Maya, it's Juniper. Here's your catch-up from the pricing review.", link: null },
    {
      id: "s2",
      kind: "changed",
      text: "The base price goes up 8% from January. That's settled.",
      link: { type: "decision", meeting_id: M, id: "d0c5a7e3-0c88-4bb5-8b2d-0b0a4c2d1e11", at_ms: 61000 },
    },
    {
      id: "s3",
      kind: "waiting",
      text: "Raj asked you for an update on the vendor comparison, and it's due tomorrow.",
      link: { type: "action", meeting_id: M, id: "a0c5a7e3-0c88-4bb5-8b2d-0b0a4c2d1e12", at_ms: 90000 },
    },
    {
      id: "s4",
      kind: "promise",
      text: "You said you'd share the draft terms with legal by Friday.",
      link: { type: "promise", meeting_id: M, id: "c0c5a7e3-0c88-4bb5-8b2d-0b0a4c2d1e13", at_ms: null },
    },
    {
      id: "s5",
      kind: "question",
      text: "Priya asked whether legal needs to review the terms. I've carried it to Thursday's follow-up.",
      link: { type: "question", meeting_id: M, id: null, at_ms: null },
    },
    { id: "s6", kind: "closing", text: "Vendor comparison first, and you're in good shape.", link: null },
  ],
  word_count: 82,
  duration_s: 33,
  audio: { status: "none", voice: null },
  prompt_version: "briefing@v1",
  created_at: "2026-11-11T10:02:00Z",
  ready_at: "2026-11-11T10:02:09Z",
  listened_at: null,
};

export const WRITING: Briefing = { ...BRIEFING, id: "b2", status: "composing", segments: [], word_count: 0, duration_s: 0 };
export const EMPTY: Briefing = { ...BRIEFING, id: "b3", status: "empty", segments: [] };
export const FAILED: Briefing = { ...BRIEFING, id: "b4", status: "unavailable", reason: "budget", segments: [] };

export const SETTINGS: BriefingSettings = {
  enabled: true,
  auto_play: false,
  length: "standard",
  language: "en",
  voice: null,
  server_voice: null,
  rate: 1,
  server_voice_connected: false,
  server_voices: [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm and clear" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Deep and steady" },
  ],
  languages: [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "hi", name: "Hindi" },
  ],
};
