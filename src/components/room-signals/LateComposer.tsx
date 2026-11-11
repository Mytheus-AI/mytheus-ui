"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowCounterClockwise, Microphone, MicrophoneSlash, PaperPlaneTilt, PencilSimpleLine, Stop, Waveform } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CharCount, FieldMsg, textareaClass } from "@/components/ui/Form";
import type { LateContribution } from "@/lib/api/room-signals-types";
import { LATE_LIMITS, checkLateDraft, durationLabel, pickAudioMime } from "@/lib/room-signals";

/* Add your point after the meeting (the last word): write it, or record it.

   Write is a plain text box. Record uses the browser's MediaRecorder: a level meter while it
   listens (so you can see the mic hears you), a timer that stops by itself at 3 minutes, then a
   player to hear it back, Re-record, and an optional line so people can skim it. A browser with no
   MediaRecorder, or a microphone you said no to, says so and leaves Write ready.

   Send posts to the route handler (`/api/meetings/{id}/late-contributions`) with one
   Idempotency-Key per draft, so a retried send never posts twice. Nothing is lost on a failed
   send: the draft stays. */

type Mode = "write" | "record";
type Rec =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "denied" }
  | { kind: "unsupported" }
  | { kind: "recording"; startedAt: number }
  | { kind: "recorded"; blob: Blob; url: string; durationMs: number }
  | { kind: "error"; message: string };

function draftKey(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function LateComposer({
  meetingId,
  nudgeId,
  decisionId,
  atMs,
  onSent,
  onCancel,
  autoFocus = true,
  label = "Your point",
}: {
  meetingId: string;
  nudgeId?: string | null;
  decisionId?: string | null;
  atMs?: number | null;
  onSent: (c: LateContribution) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  label?: string;
}) {
  const uid = useId();
  const [mode, setMode] = useState<Mode>("write");
  const [body, setBody] = useState("");
  const [rec, setRec] = useState<Rec>({ kind: "idle" });
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ field: "body" | "audio" | "form"; message: string } | null>(null);
  const key = useRef(draftKey());
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const frame = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const stopTimer = useRef<number | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const tabs = useRef<Record<Mode, HTMLButtonElement | null>>({ write: null, record: null });

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  const teardown = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (stopTimer.current !== null) window.clearInterval(stopTimer.current);
    stopTimer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    setLevel(0);
  }, []);

  // Release the microphone and the object URL when the composer goes away.
  const recRef = useRef(rec);
  recRef.current = rec;
  useEffect(
    () => () => {
      try {
        if (recorder.current?.state === "recording") recorder.current.stop();
      } catch {
        // already stopped
      }
      teardown();
      const r = recRef.current;
      if (r.kind === "recorded") URL.revokeObjectURL(r.url);
    },
    [teardown],
  );

  const stop = useCallback(() => {
    const r = recorder.current;
    if (r && r.state === "recording") r.stop();
  }, []);

  const start = async () => {
    setError(null);
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRec({ kind: "unsupported" });
      return;
    }
    const mime = pickAudioMime((m) => window.MediaRecorder.isTypeSupported(m));
    if (!mime) {
      setRec({ kind: "unsupported" });
      return;
    }
    setRec({ kind: "asking" });
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setRec(name === "NotAllowedError" || name === "SecurityError" ? { kind: "denied" } : { kind: "error", message: "No microphone was found." });
      return;
    }
    stream.current = media;
    chunks.current = [];
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(media, { mimeType: mime.record, audioBitsPerSecond: 32_000 });
    } catch {
      teardown();
      setRec({ kind: "unsupported" });
      return;
    }
    recorder.current = mr;
    const startedAt = Date.now();
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    mr.onstop = () => {
      const durationMs = Math.min(LATE_LIMITS.audioMaxMs, Date.now() - startedAt);
      teardown();
      const blob = new Blob(chunks.current, { type: mime.send });
      if (blob.size === 0) {
        setRec({ kind: "error", message: "Nothing was recorded. Try again." });
        return;
      }
      setRec({ kind: "recorded", blob, url: URL.createObjectURL(blob), durationMs });
    };
    // The level meter: how loud the mic hears you, read from the stream itself.
    try {
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(media).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += ((data[i] - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // no meter, still records
    }
    setElapsed(0);
    stopTimer.current = window.setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(ms);
      if (ms >= LATE_LIMITS.audioMaxMs) stop();
    }, 250);
    mr.start(1000);
    setRec({ kind: "recording", startedAt });
  };

  const discard = () => {
    if (rec.kind === "recorded") URL.revokeObjectURL(rec.url);
    setRec({ kind: "idle" });
    setError(null);
  };

  const audio = rec.kind === "recorded" ? rec : null;
  const send = async () => {
    const checked = checkLateDraft({
      body,
      audio: mode === "record" && audio ? { bytes: audio.blob.size, durationMs: audio.durationMs, mime: audio.blob.type } : null,
    });
    if (!checked.ok) {
      setError({ field: mode === "record" && checked.field === "body" && !audio ? "audio" : checked.field, message: mode === "record" && !audio ? "Record your point first, or write it." : checked.message });
      if (checked.field === "body") textRef.current?.focus();
      return;
    }
    const form = new FormData();
    if (checked.body) form.set("body", checked.body);
    if (nudgeId) form.set("nudge_id", nudgeId);
    if (decisionId) form.set("decision_id", decisionId);
    if (atMs !== null && atMs !== undefined) form.set("at_ms", String(Math.max(0, Math.round(atMs))));
    if (mode === "record" && audio) {
      form.set("audio", audio.blob, "point");
      form.set("duration_ms", String(audio.durationMs));
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/late-contributions`, {
        method: "POST",
        body: form,
        headers: { "Idempotency-Key": key.current },
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; contribution: LateContribution }
        | { ok: false; message?: string; field?: "body" | "audio" }
        | null;
      if (res.ok && json && json.ok) {
        if (audio) URL.revokeObjectURL(audio.url);
        key.current = draftKey();
        onSent(json.contribution);
        return;
      }
      const message = (json && !json.ok && json.message) || "That couldn't be sent just now. Try again in a moment.";
      setError({ field: (json && !json.ok && json.field) || "form", message });
    } catch {
      setError({ field: "form", message: "You seem to be offline. Your point is still here; send it again when you are back." });
    } finally {
      setSending(false);
    }
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next: Mode = e.key === "Home" ? "write" : e.key === "End" ? "record" : mode === "write" ? "record" : "write";
    setMode(next);
    tabs.current[next]?.focus();
  };

  const recording = rec.kind === "recording";
  const bodyId = `${uid}-body`;
  const msgId = `${uid}-msg`;

  return (
    <div className="rounded-ctl border border-line bg-surface-2 p-3 sm:p-4">
      <div role="tablist" aria-label="How to add your point" className="inline-flex rounded-full border border-line-2 bg-surface p-0.5">
        {(["write", "record"] as const).map((m) => (
          <button
            key={m}
            ref={(el) => {
              tabs.current[m] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${m}`}
            aria-selected={mode === m}
            aria-controls={`${uid}-panel-${m}`}
            tabIndex={mode === m ? 0 : -1}
            disabled={recording}
            onKeyDown={onTabKey}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold ${
              mode === m ? "bg-pill text-pill-on" : "text-ink-2 hover:text-ink"
            }`}
          >
            {m === "write" ? <PencilSimpleLine size={15} aria-hidden /> : <Microphone size={15} aria-hidden />}
            {m === "write" ? "Write" : "Record"}
          </button>
        ))}
      </div>

      <div id={`${uid}-panel-${mode}`} role="tabpanel" aria-labelledby={`${uid}-tab-${mode}`} className="mt-3">
        {mode === "record" ? (
          <RecordPanel
            rec={rec}
            level={level}
            elapsedMs={elapsed}
            onStart={() => void start()}
            onStop={stop}
            onDiscard={discard}
            onWrite={() => {
              setMode("write");
              window.requestAnimationFrame(() => textRef.current?.focus());
            }}
          />
        ) : null}

        <label htmlFor={bodyId} className={`block text-[14px] font-semibold text-ink ${mode === "record" ? "mt-3" : ""}`}>
          {mode === "record" ? "A line so people can skim it (optional)" : label}
        </label>
        <textarea
          ref={textRef}
          id={bodyId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={mode === "record" ? 2 : 4}
          maxLength={LATE_LIMITS.bodyMax + 200}
          aria-invalid={error?.field === "body" || undefined}
          aria-describedby={msgId}
          placeholder={mode === "record" ? "The point in one line" : "What you wanted to say. It is added to the meeting, next to the moment."}
          className={`${textareaClass} mt-1.5 w-full`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
            if (e.key === "Escape" && onCancel) {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <div className="mt-1 flex items-start justify-between gap-3">
          <FieldMsg
            id={msgId}
            error={error && error.field !== "form" ? error.message : null}
            hint="Everyone who was in the meeting sees it, with your name. The host is told."
          />
          <CharCount n={body.trim().length} max={LATE_LIMITS.bodyMax} />
        </div>
      </div>

      {error?.field === "form" ? (
        <p role="alert" className="mt-2 text-[14px] font-medium text-priority-high">
          {error.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void send()} disabled={sending || recording} aria-busy={sending || undefined}>
          <PaperPlaneTilt size={15} aria-hidden />
          {sending ? "Adding your point" : "Add your point"}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RecordPanel({
  rec,
  level,
  elapsedMs,
  onStart,
  onStop,
  onDiscard,
  onWrite,
}: {
  rec: Rec;
  level: number;
  elapsedMs: number;
  onStart: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onWrite: () => void;
}) {
  if (rec.kind === "unsupported") {
    return (
      <p className="flex items-start gap-2 text-[14px] text-ink-2" role="status">
        <MicrophoneSlash size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
        <span>
          This browser can&rsquo;t record audio here.{" "}
          <button type="button" className="font-semibold text-ink underline underline-offset-4" onClick={onWrite}>
            Write your point instead
          </button>
          .
        </span>
      </p>
    );
  }
  if (rec.kind === "denied") {
    return (
      <div className="flex flex-wrap items-start gap-3" role="status">
        <MicrophoneSlash size={18} className="mt-0.5 shrink-0 text-priority-medium" aria-hidden />
        <p className="min-w-0 flex-1 text-[14px] text-ink-2">
          Mytheus can&rsquo;t use your microphone. Allow it in your browser&rsquo;s site settings, then try again, or write your point.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onStart}>
            Try again
          </Button>
          <Button size="sm" variant="ghost" onClick={onWrite}>
            Write instead
          </Button>
        </div>
      </div>
    );
  }
  if (rec.kind === "recording") {
    const left = Math.max(0, LATE_LIMITS.audioMaxMs - elapsedMs);
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="danger" onClick={onStop} autoFocus>
          <Stop size={15} weight="fill" aria-hidden />
          Stop recording
        </Button>
        <span className="inline-flex items-center gap-2 text-[14px] font-semibold tabular-nums text-ink" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-priority-high" />
          {durationLabel(elapsedMs)}
        </span>
        <span
          className="relative h-2 w-28 overflow-hidden rounded-full bg-bg-3"
          role="meter"
          aria-label="Microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
        >
          <i className="absolute inset-y-0 left-0 rounded-full bg-ok" style={{ width: `${Math.round(level * 100)}%` }} />
        </span>
        <span className="text-[13px] text-ink-3">{durationLabel(left)} left</span>
        <span className="sr-only" role="status">
          Recording. Press Stop recording when you are done.
        </span>
      </div>
    );
  }
  if (rec.kind === "recorded") {
    return (
      <div className="flex flex-col gap-2">
        <audio controls src={rec.url} className="w-full max-w-[420px]" aria-label="Your recorded point">
          <track kind="captions" />
        </audio>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-3">{durationLabel(rec.durationMs)} recorded. Hear it back, then add it.</span>
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            <ArrowCounterClockwise size={15} aria-hidden />
            Re-record
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="outline" onClick={onStart} disabled={rec.kind === "asking"}>
        <Waveform size={15} aria-hidden />
        {rec.kind === "asking" ? "Waiting for the microphone" : "Start recording"}
      </Button>
      <span className="text-[13px] text-ink-3">Up to 3 minutes. You can hear it before it is added.</span>
      {rec.kind === "error" ? (
        <p role="alert" className="w-full text-[14px] font-medium text-priority-high">
          {rec.message}
        </p>
      ) : null}
    </div>
  );
}
