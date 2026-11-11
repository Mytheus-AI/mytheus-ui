/**
 * Off the record and live caption translation, as pure reducers (polish program wave 3).
 *
 * OFF THE RECORD. core-api owns the state; realtime-gateway forwards it ("off-record", to
 * everyone, and to each socket right after it joins). The room only renders it. Who may do what:
 * the host or the meeting's creator takes the meeting off the record and back; anyone else asks
 * ("off-record-request"), and the host either grants it (a start naming who asked) or answers
 * "Not now" ("off-record-answer"). While it runs nothing is transcribed, captioned, indexed or
 * kept, and every agent pauses: the server enforces it, this file only says so.
 *
 * LIVE TRANSLATION. A viewer picks a caption language; finals then arrive translated
 * ("caption-translation", only to the sockets that chose that language) and replace their line.
 * Interims stay in the language they were spoken in. A translation for another language, or one
 * that arrives after the viewer switched, is ignored. A budget refusal or an unavailable model is a
 * calm notice; the captions carry on in the original language.
 */

export interface OffRecordWire {
  active?: boolean;
  segmentId?: string | null;
  startedAt?: string | null;
  startedBy?: string | null;
  requestedBy?: string | null;
  endedAt?: string | null;
  endedBy?: string | null;
  totalMs?: number | null;
  byUserId?: string | null;
  at?: string;
}

export interface OffRecordState {
  /** Whether the server has told this screen anything yet. */
  known: boolean;
  active: boolean;
  segmentId: string | null;
  /** When the running segment began (ISO), or null. */
  since: string | null;
  startedBy: string | null;
  requestedBy: string | null;
  /** The last change: who made it and when (for the "Back on the record" notice). */
  lastChange: { active: boolean; by: string | null; at: string } | null;
}

export const initialOffRecord: OffRecordState = {
  known: false,
  active: false,
  segmentId: null,
  since: null,
  startedBy: null,
  requestedBy: null,
  lastChange: null,
};

export function applyOffRecord(prev: OffRecordState, p: OffRecordWire): OffRecordState {
  if (typeof p?.active !== "boolean") return prev;
  const changed = !prev.known || prev.active !== p.active || prev.segmentId !== (p.segmentId ?? null);
  return {
    known: true,
    active: p.active,
    segmentId: p.active ? (p.segmentId ?? null) : null,
    since: p.active ? (p.startedAt ?? prev.since ?? p.at ?? null) : null,
    startedBy: p.active ? (p.startedBy ?? null) : null,
    requestedBy: p.active ? (p.requestedBy ?? null) : null,
    lastChange:
      changed && prev.known
        ? { active: p.active, by: p.byUserId ?? (p.active ? p.startedBy ?? null : p.endedBy ?? null), at: p.at ?? "" }
        : prev.lastChange,
  };
}

export interface OffRecordRequest {
  userId: string;
  at: string;
}

/** Requests the host has not answered yet, newest last, one per person. */
export type OffRecordRequests = OffRecordRequest[];

export function applyRequest(prev: OffRecordRequests, p: { userId?: string; at?: string }): OffRecordRequests {
  if (typeof p?.userId !== "string" || !p.userId) return prev;
  return [...prev.filter((r) => r.userId !== p.userId), { userId: p.userId, at: p.at ?? new Date().toISOString() }];
}

/** The host answered (or granted it by going off the record): the request is settled. */
export function settleRequest(prev: OffRecordRequests, userId: string | null | undefined): OffRecordRequests {
  return userId ? prev.filter((r) => r.userId !== userId) : prev;
}

/** "since 12:04", in the viewer's clock. */
export function sinceLabel(iso: string | null, locale?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

/** "4 min", "under a minute", "1 h 12 min": the length of a gap, for people. */
export function gapLength(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 60_000) return "under a minute";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ------------------------------------------------------------------ live translation

/** The languages a viewer can read captions in (the gateway accepts exactly these codes). */
export const CAPTION_LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ar", name: "Arabic", native: "العربية" },
] as const;

export type CaptionLanguage = (typeof CAPTION_LANGUAGES)[number]["code"];

export function isCaptionLanguage(v: unknown): v is CaptionLanguage {
  return typeof v === "string" && CAPTION_LANGUAGES.some((l) => l.code === v);
}

export function languageName(code: string | null): string {
  if (!code) return "Original";
  return CAPTION_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export interface CaptionTranslationWire {
  chunkId?: string;
  language?: string;
  status?: string;
  text?: string;
}

export type TranslationNotice = "budget_denied" | "unavailable" | null;

export interface TranslationState {
  /** The language this viewer chose, or null for the original. */
  language: CaptionLanguage | null;
  /** chunkId -> translated text, for the chosen language only. */
  byChunk: Record<string, string>;
  /** A calm notice when translation could not run (the original stays on screen). */
  notice: TranslationNotice;
}

export const initialTranslation: TranslationState = { language: null, byChunk: {}, notice: null };

/** At most this many translated lines are kept; captions only show the tail anyway. */
const KEEP = 400;

export function chooseLanguage(prev: TranslationState, language: CaptionLanguage | null): TranslationState {
  if (prev.language === language) return prev;
  return { language, byChunk: {}, notice: null };
}

export function applyTranslation(prev: TranslationState, p: CaptionTranslationWire): TranslationState {
  if (!prev.language || p?.language !== prev.language || typeof p.chunkId !== "string" || !p.chunkId) return prev;
  if (p.status === "translated") {
    const text = typeof p.text === "string" ? p.text.trim() : "";
    if (!text) return prev;
    const entries = Object.entries(prev.byChunk);
    const kept = entries.length >= KEEP ? Object.fromEntries(entries.slice(entries.length - KEEP + 1)) : prev.byChunk;
    return { ...prev, byChunk: { ...kept, [p.chunkId]: text }, notice: null };
  }
  if (p.status === "budget_denied" || p.status === "unavailable") {
    return prev.notice === p.status ? prev : { ...prev, notice: p.status };
  }
  return prev;
}

export const CAPTION_LANGUAGE_KEY = "mytheus.caption-language";

/** The language this viewer last chose (a per-browser convenience), or null. */
export function readSavedLanguage(): CaptionLanguage | null {
  try {
    const raw = localStorage.getItem(CAPTION_LANGUAGE_KEY);
    return isCaptionLanguage(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveLanguage(language: CaptionLanguage | null): void {
  try {
    if (language) localStorage.setItem(CAPTION_LANGUAGE_KEY, language);
    else localStorage.removeItem(CAPTION_LANGUAGE_KEY);
  } catch {
    // Storage blocked: the choice holds for this visit.
  }
}
