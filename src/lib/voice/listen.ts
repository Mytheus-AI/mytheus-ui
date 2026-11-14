/**
 * Listening through the server (mytheus-backend PR #39): record the microphone with
 * `MediaRecorder`, send each clip to `POST /api/voice/transcribe` (our route, which forwards to
 * the self-hosted faster-whisper through the gateway), get the words back. This works in every
 * browser that can record, unlike the browser's own `SpeechRecognition`, which only works
 * reliably in Chrome and Safari.
 *
 * - `pickRecorderMime`: Opus in WebM, then Opus in Ogg, then MP4 (Safari), whatever records.
 * - `uploadType`: the clip's Content-Type as the server takes it (codecs dropped).
 * - `createRollingRecorder`: a pre-roll without slicing files. Two recorders run staggered by
 *   half the rotation while nobody talks, each restarted every `rotateMs` (2 s); when speech
 *   starts the older one is kept, so the clip begins 1 to 2 s before the onset (never cut off
 *   mid-syllable) and is still one complete, valid file.
 * - `transcribe` and `listenFailureNote`: the call and its failures in plain words.
 *
 * Pure (the recorder and the network are injected), tested in tests/voice-listen.test.ts.
 */

export const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"] as const;
export const UPLOAD_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];
export const MAX_CLIP_BYTES = 10 * 1024 * 1024;

/** The first recording format this browser supports; "" lets the browser choose; null: it cannot record. */
export function pickRecorderMime(isTypeSupported: ((t: string) => boolean) | null | undefined): string | null {
  if (!isTypeSupported) return null;
  for (const t of MIME_CANDIDATES) {
    try {
      if (isTypeSupported(t)) return t;
    } catch {
      // a browser that throws on an unknown type: try the next
    }
  }
  return "";
}

/** The Content-Type the server takes for a clip of this type, or null when it takes none. */
export function uploadType(mime: string | null | undefined): UploadType | null {
  const base = (mime ?? "").split(";")[0]!.trim().toLowerCase();
  if ((UPLOAD_TYPES as readonly string[]).includes(base)) return base as UploadType;
  if (base === "audio/x-m4a" || base === "audio/aac" || base === "audio/m4a") return "audio/mp4";
  if (base === "video/webm") return "audio/webm";
  if (base === "audio/x-wav" || base === "audio/wave") return "audio/wav";
  return null;
}

/* ---------------- the rolling recorder ---------------- */

/** One running recording. */
export interface Take {
  readonly startedAt: number;
  /** stop and hand back the whole clip (null if it recorded nothing) */
  stop(): Promise<Blob | null>;
  /** stop and throw the audio away */
  discard(): void;
}

export interface RollingRecorder {
  /** start recording in the background (listening began) */
  arm(): void;
  /** call regularly (every level reading): rotates the idle recorders */
  tick(): void;
  /** speech started: keep the oldest recording, drop the rest */
  begin(): void;
  /** speech ended: the clip from the kept recording */
  finish(): Promise<Blob | null>;
  /** stop everything, keep nothing */
  cancel(): void;
  /** ms of audio before now that a clip begun now would hold */
  preRollMs(): number;
  readonly armed: boolean;
}

export const ROTATE_MS = 2000;

export function createRollingRecorder(opts: { open: () => Take; now: () => number; rotateMs?: number }): RollingRecorder {
  const rotate = opts.rotateMs ?? ROTATE_MS;
  let takes: Take[] = [];
  let kept: Take | null = null;
  let armed = false;
  let armedAt = 0;

  const dropAll = () => {
    takes.forEach((t) => t.discard());
    takes = [];
  };

  return {
    arm() {
      dropAll();
      kept?.discard();
      kept = null;
      armed = true;
      armedAt = opts.now();
      takes = [opts.open()];
    },
    tick() {
      if (!armed || kept) return;
      const now = opts.now();
      // The second recorder starts half a rotation after the first.
      if (takes.length === 1 && now - armedAt >= rotate / 2) takes.push(opts.open());
      takes = takes.map((t) => {
        if (now - t.startedAt < rotate) return t;
        t.discard();
        return opts.open();
      });
    },
    begin() {
      if (!armed || kept || !takes.length) return;
      const oldest = takes.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
      takes.filter((t) => t !== oldest).forEach((t) => t.discard());
      takes = [];
      kept = oldest;
    },
    async finish() {
      const t = kept;
      kept = null;
      armed = false;
      dropAll();
      return t ? t.stop() : null;
    },
    cancel() {
      armed = false;
      kept?.discard();
      kept = null;
      dropAll();
    },
    preRollMs() {
      const now = opts.now();
      const t = kept ?? (takes.length ? takes.reduce((a, b) => (b.startedAt < a.startedAt ? b : a)) : null);
      return t ? now - t.startedAt : 0;
    },
    get armed() {
      return armed;
    },
  };
}

/** A `Take` over a real `MediaRecorder` on the stream (browser only). */
export function mediaRecorderTake(stream: MediaStream, mime: string, now: () => number = () => Date.now()): Take {
  const rec = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48_000 }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const startedAt = now();
  rec.start();
  return {
    startedAt,
    stop: () =>
      new Promise<Blob | null>((resolve) => {
        if (rec.state === "inactive") return resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType || mime }) : null);
        rec.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType || mime }) : null);
        try {
          rec.stop();
        } catch {
          resolve(null);
        }
      }),
    discard() {
      rec.ondataavailable = null;
      rec.onstop = null;
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {
        // already stopped
      }
    },
  };
}

/* ---------------- the call ---------------- */

export type ListenFailure = "listening_not_connected" | "rate_limited" | "too_long" | "unsupported" | "signed_out" | "listening_failed" | "aborted";

export type TranscribeResult = { ok: true; text: string } | { ok: false; reason: ListenFailure };

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: Blob; signal?: AbortSignal; cache?: RequestCache }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const REASONS: readonly ListenFailure[] = ["listening_not_connected", "rate_limited", "too_long", "unsupported", "signed_out", "listening_failed"];

export function listenFailureFor(status: number, body: unknown): ListenFailure {
  const reason = body && typeof body === "object" && "reason" in body ? (body as { reason: unknown }).reason : null;
  if (typeof reason === "string" && (REASONS as readonly string[]).includes(reason)) return reason as ListenFailure;
  if (status === 401) return "signed_out";
  if (status === 413) return "too_long";
  if (status === 415) return "unsupported";
  if (status === 429) return "rate_limited";
  if (status === 503) return "listening_not_connected";
  return "listening_failed";
}

/** The app's language for the transcriber ("en" unless the page says otherwise). */
export function listenLanguage(lang: string | null | undefined): string {
  const two = (lang ?? "").slice(0, 2).toLowerCase();
  return /^[a-z]{2}$/.test(two) ? two : "en";
}

export async function transcribe(clip: Blob, opts: { language?: string; signal?: AbortSignal; fetch?: FetchLike } = {}): Promise<TranscribeResult> {
  const type = uploadType(clip.type);
  if (!type) return { ok: false, reason: "unsupported" };
  if (clip.size > MAX_CLIP_BYTES) return { ok: false, reason: "too_long" };
  const f = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await f(`/api/voice/transcribe?language=${encodeURIComponent(listenLanguage(opts.language))}`, {
      method: "POST",
      headers: { "Content-Type": type, Accept: "application/json" },
      body: clip,
      signal: opts.signal,
      cache: "no-store",
    });
  } catch {
    if (opts.signal?.aborted) return { ok: false, reason: "aborted" };
    return { ok: false, reason: "listening_not_connected" };
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, reason: listenFailureFor(res.status, body) };
  const text = body && typeof body === "object" && typeof (body as { text?: unknown }).text === "string" ? (body as { text: string }).text : "";
  return { ok: true, text: text.replace(/\s+/g, " ").trim() };
}

/** What to tell the person, in plain words. */
export function listenFailureNote(reason: ListenFailure): string {
  switch (reason) {
    case "listening_not_connected":
      return "Listening is unavailable right now. You can still type your question.";
    case "rate_limited":
      return "That was a lot of talking in a short time. Wait a few seconds and try again.";
    case "too_long":
      return "That was too long to catch in one go. Try a shorter question.";
    case "unsupported":
      return "This browser records in a format that can't be heard. Try typing instead.";
    case "signed_out":
      return "You were signed out. Sign in again to talk.";
    case "aborted":
      return "";
    default:
      return "Something went wrong hearing that. Try saying it again.";
  }
}

/** The microphone could not be opened: why, and what to do, from the `getUserMedia` error's name. */
export function micErrorNote(name: string | null | undefined): string {
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return "Your browser blocked the microphone. Click the lock or site icon next to the address, allow the microphone for this site, then press Resume.";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "No microphone was found. Plug one in or pick one in your system's sound settings, then press Resume.";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "Another app is using the microphone. Close it, then press Resume.";
    case "unsupported":
      return "This browser can't record from the microphone. Try typing instead.";
    default:
      return "The microphone couldn't be started. Check it is connected and allowed for this site, then press Resume.";
  }
}

/** Whether this browser can listen this way (a microphone API and a recorder). */
export function canRecord(w: { MediaRecorder?: unknown; navigator?: { mediaDevices?: { getUserMedia?: unknown } } } | undefined): boolean {
  return !!w && typeof w.MediaRecorder === "function" && typeof w.navigator?.mediaDevices?.getUserMedia === "function";
}
