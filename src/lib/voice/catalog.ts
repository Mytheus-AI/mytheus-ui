/**
 * The Myte's voice (ADR-0050): the catalogue core-api offers, the person's choice, the failure
 * reasons the speech route reports, and the copy for each.
 *
 * Pure, tested in tests/voice-catalog.test.ts.
 */

export type VoiceAccent = "American" | "British";
export type VoiceGender = "female" | "male";

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  accent: VoiceAccent;
  gender: VoiceGender;
}

/** `GET /api/v1/voice/voices` and `PUT /api/v1/voice/preference`. */
export interface VoiceCatalog {
  connected: boolean;
  voices: VoiceOption[];
  /** what the person picked; null means "match my Myte's personality" */
  chosen: string | null;
  /** the voice the Myte speaks with now (the choice, or the personality's default) */
  selected: string | null;
}

/** A voice id as Kokoro names them (`af_heart`). Anything else is never forwarded. */
export const VOICE_ID = /^[a-z]{2}_[a-z0-9]{1,40}$/;

export function asVoiceId(v: unknown): string | null {
  return typeof v === "string" && VOICE_ID.test(v) ? v : null;
}

/** A catalogue read from the wire, with anything malformed dropped rather than trusted. */
export function normalizeCatalog(raw: unknown): VoiceCatalog {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const voices: VoiceOption[] = [];
  for (const v of Array.isArray(r.voices) ? r.voices : []) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const id = asVoiceId(o.id);
    if (!id || voices.some((x) => x.id === id)) continue;
    voices.push({
      id,
      name: typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 40) : id,
      description: typeof o.description === "string" ? o.description.trim().slice(0, 140) : "",
      accent: o.accent === "British" ? "British" : "American",
      gender: o.gender === "male" ? "male" : "female",
    });
  }
  const known = (v: unknown) => {
    const id = asVoiceId(v);
    return id && voices.some((x) => x.id === id) ? id : null;
  };
  return { connected: r.connected === true, voices, chosen: known(r.chosen), selected: known(r.selected) };
}

/** The line a voice says when previewed. */
export function previewLine(myteName: string): string {
  const name = myteName.trim() || "your Myte";
  return `Hi, I'm ${name}. I'll keep track of what matters to you.`;
}

export function genderLabel(g: VoiceGender): string {
  return g === "male" ? "Male" : "Female";
}

/* ---------------- failures ---------------- */

export type VoiceFailure = "voice_not_connected" | "rate_limited" | "signed_out" | "invalid" | "blocked" | "voice_failed";

const FAILURES: readonly VoiceFailure[] = ["voice_not_connected", "rate_limited", "signed_out", "invalid", "blocked", "voice_failed"];

export function asFailure(v: unknown): VoiceFailure {
  return typeof v === "string" && (FAILURES as readonly string[]).includes(v) ? (v as VoiceFailure) : "voice_failed";
}

/** What the speech route answers for a failed upstream call: the status and a `{reason}`. */
export function speechFailure(status: number, body: unknown): { status: number; reason: VoiceFailure } {
  const reason = body && typeof body === "object" ? (body as { reason?: unknown }).reason : undefined;
  if (status === 401 || status === 403) return { status: 401, reason: "signed_out" };
  if (status === 429) return { status: 429, reason: "rate_limited" };
  if (status === 400 || status === 422) return { status: 422, reason: "invalid" };
  if (status === 503 || reason === "voice_not_connected") return { status: 503, reason: "voice_not_connected" };
  return { status: 502, reason: "voice_failed" };
}

/** The quiet note shown beside the words, which always stay on screen. */
export function failureNote(reason: VoiceFailure): string {
  switch (reason) {
    case "rate_limited":
      return "Your Myte has spoken a lot this minute. Try again shortly.";
    case "signed_out":
      return "Your session expired. Sign in again to hear it.";
    case "blocked":
      return "Your browser held the sound back. Press play to listen.";
    default:
      return "Voice is unavailable right now";
  }
}

/* ---------------- the body the speech route accepts ---------------- */

export const SPEED_MIN = 0.7;
export const SPEED_MAX = 1.4;

export interface SpeechBody {
  text: string;
  voice?: string;
  speed: number;
  language: string;
}

/** Check what the browser sent: text 1..1500 characters, a known-shaped voice, speed 0.7..1.4. */
export function checkSpeechBody(raw: unknown): { ok: true; body: SpeechBody } | { ok: false } {
  if (!raw || typeof raw !== "object") return { ok: false };
  const r = raw as Record<string, unknown>;
  const text = typeof r.text === "string" ? r.text.trim() : "";
  if (!text || text.length > 1500) return { ok: false };
  const body: SpeechBody = { text, speed: 1, language: "en" };
  if (r.voice !== undefined && r.voice !== null) {
    const v = asVoiceId(r.voice);
    if (!v) return { ok: false };
    body.voice = v;
  }
  if (typeof r.speed === "number" && Number.isFinite(r.speed)) body.speed = Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(r.speed * 100) / 100));
  if (typeof r.language === "string" && /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(r.language)) body.language = r.language.slice(0, 2);
  return { ok: true, body };
}
