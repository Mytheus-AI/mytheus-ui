"use client";

import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { Microphone, Pause, PhoneDisconnect, Play, SpeakerHigh, SpeakerSimpleSlash } from "@phosphor-icons/react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { failureNote } from "@/lib/voice/catalog";
import { myteSpeaker, useVoiceSpeed } from "@/lib/voice/myte-voice";
import { failureCopy } from "@/lib/ask-myte/compose";
import { plainText, type Answer } from "@/lib/ask-myte/reducer";
import { initialVoice, levelFrom, phaseWords, plushFor, spaceEvent, voiceReducer } from "@/lib/ask-myte/voice-machine";
import type { AskPage, AskScope } from "@/lib/ask-myte/types";
import { sourceKindLabel, sourceTitle } from "@/lib/ask-myte/citations";
import { AnswerText } from "./parts";
import type { AskMyteState } from "./useAskMyte";

/* Talk to Myte (ADR-0049 F6), loaded only when someone presses Talk. A large live plush in the
   middle reacts to the conversation: it listens with the microphone's level (Web Audio analyser),
   thinks while the answer's steps run, and speaks the answer in its own voice (the self-hosted
   Kokoro voice, ADR-0050) with a level read from that voice's audio, then listens again. A pause of about 1.2 s after you stop talking sends what it heard. The words
   heard and the answer, with its citations, are on screen and in live regions; the turns are the
   same thread as typing.

   Keyboard: Space talks, sends what it heard, or stops it speaking; Esc ends. Controls: pause,
   mute (answers are shown but not read aloud), end. */

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function recognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceMode({
  conv,
  persona,
  scope,
  page,
  isAdmin,
  onClose,
  size = 200,
}: {
  conv: AskMyteState;
  persona: { name: string; seed: string; personality: string | null };
  scope: AskScope;
  page: AskPage | null;
  isAdmin: boolean;
  onClose: () => void;
  size?: number;
}) {
  const uid = useId();
  const [s, dispatch] = useReducer(voiceReducer, initialVoice);
  const [openSource, setOpenSource] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const rec = useRef<Recognition | null>(null);
  const level = useRef(0);
  const audio = useRef<{ ctx: AudioContext; analyser: AnalyserNode; stream: MediaStream; buf: Uint8Array<ArrayBuffer> } | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [speed] = useVoiceSpeed();
  const spokenKey = useRef<string | null>(null);
  const sentTurn = useRef(0);
  const answerKey = useRef<string | null>(null);
  const settledKey = useRef<string | null>(null);
  const phaseRef = useRef(s.phase);
  phaseRef.current = s.phase;

  /* ---------------- the microphone level ---------------- */
  const startMeter = useCallback(async () => {
    if (audio.current || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audio.current = { ctx, analyser, stream, buf: new Uint8Array(new ArrayBuffer(analyser.fftSize)) };
    } catch {
      // No meter (permission is asked again by recognition, which reports its own error).
    }
  }, []);

  const stopMeter = useCallback(() => {
    const a = audio.current;
    audio.current = null;
    a?.stream.getTracks().forEach((t) => t.stop());
    void a?.ctx.close().catch(() => {});
  }, []);

  // One loop reads the level: the mic while listening, the words while speaking (eased down).
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const a = audio.current;
      if (phaseRef.current === "listening" && a) {
        a.analyser.getByteTimeDomainData(a.buf);
        level.current = level.current * 0.6 + levelFrom(a.buf) * 0.4;
      } else if (phaseRef.current === "speaking") {
        // The Myte's own voice, read from the speaker's analyser.
        level.current = myteSpeaker().level();
      } else level.current *= 0.85;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------------- listening ---------------- */
  const stopListening = useCallback(() => {
    const r = rec.current;
    rec.current = null;
    if (r) {
      r.onend = null;
      try {
        r.abort();
      } catch {
        // already stopped
      }
    }
  }, []);

  const startListening = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = document.documentElement.lang || navigator.language || "en-US";
    r.interimResults = true;
    r.continuous = true;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      dispatch({ type: "heard", text: `${finalText}${interim}`.replace(/\s+/g, " ").trim(), at: Date.now() });
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") dispatch({ type: "mic-error", message: "Your browser blocked the microphone. Allow it for this site, then press Resume." });
      else if (e.error === "audio-capture") dispatch({ type: "mic-error", message: "No microphone was found." });
    };
    // Recognition stops itself after a while of quiet: start it again while still listening.
    r.onend = () => {
      rec.current = null;
      if (phaseRef.current === "listening") window.setTimeout(() => phaseRef.current === "listening" && startListening(), 120);
    };
    rec.current = r;
    try {
      r.start();
    } catch {
      rec.current = null;
    }
  }, []);

  useEffect(() => {
    if (s.phase === "listening") {
      void startMeter();
      startListening();
    } else stopListening();
  }, [s.phase, startListening, stopListening, startMeter]);

  // The silence timer.
  useEffect(() => {
    if (s.phase !== "listening") return;
    const t = window.setInterval(() => dispatch({ type: "tick", at: Date.now() }), 150);
    return () => window.clearInterval(t);
  }, [s.phase]);

  /* ---------------- sending and the answer ---------------- */
  useEffect(() => {
    if (s.phase === "thinking" && s.sent && s.turn > sentTurn.current) {
      sentTurn.current = s.turn;
      answerKey.current = null;
      settledKey.current = null;
      conv.send(s.sent, scope, page);
    }
  }, [s.phase, s.sent, s.turn, conv, scope, page]);

  const lastAnswer = useMemo(() => [...conv.messages].reverse().find((m): m is Answer => m.role === "myte") ?? null, [conv.messages]);

  useEffect(() => {
    if (s.phase !== "thinking" || !lastAnswer) return;
    if (lastAnswer.status === "streaming") {
      answerKey.current = lastAnswer.key;
      return;
    }
    if (answerKey.current !== lastAnswer.key || settledKey.current === lastAnswer.key) return;
    settledKey.current = lastAnswer.key;
    if (lastAnswer.status === "done") dispatch({ type: "answer-done", spoken: !!plainText(lastAnswer.text) });
    else {
      const copy = lastAnswer.error ? failureCopy(lastAnswer.error.reason, { name: persona.name, message: lastAnswer.error.message, isAdmin }) : failureCopy("stopped", { name: persona.name });
      dispatch({ type: "answer-failed", message: copy.title });
    }
  }, [s.phase, lastAnswer, persona.name, isAdmin]);

  /* ---------------- speaking ---------------- */
  // The answer in the Myte's own voice (ADR-0050), through the shared speaker. Pause holds the
  // sound where it is and Resume carries on; interrupting, muting or ending stops it. If the voice
  // is unavailable it says so quietly and listens again; the answer stays on screen.
  useEffect(() => {
    const speaker = myteSpeaker();
    const key = lastAnswer ? `talk:${lastAnswer.key}` : null;
    const owns = () => key !== null && speaker.getSnapshot().key === key;
    if (s.phase === "speaking" && lastAnswer && key) {
      if (owns() && speaker.getSnapshot().status === "paused") {
        speaker.resume();
        return;
      }
      if (spokenKey.current === key && owns()) return;
      spokenKey.current = key;
      setVoiceNote(null);
      void speaker.speak({ key, text: lastAnswer.text, speed }).then((outcome) => {
        if (spokenKey.current !== key) return;
        if (outcome === "error") setVoiceNote(failureNote(speaker.getSnapshot().error ?? "voice_failed"));
        if (outcome !== "stopped") dispatch({ type: "spoken" });
      });
    } else if (s.phase === "paused") {
      if (owns()) speaker.pause();
    } else if (owns()) {
      spokenKey.current = null;
      speaker.stop(key ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the phase and the answer only
  }, [s.phase, lastAnswer?.key]);

  /* ---------------- start, end, keys ---------------- */
  useEffect(() => {
    dispatch({ type: "start" });
    // Opening voice mode is a gesture: it lets the answers be heard later.
    myteSpeaker().unlock();
    const t = window.setTimeout(() => root.current?.querySelector<HTMLElement>("[data-voice-primary]")?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      stopListening();
      stopMeter();
      if (myteSpeaker().getSnapshot().key?.startsWith("talk:")) myteSpeaker().stop();
    };
  }, [stopListening, stopMeter]);

  const end = useCallback(() => {
    dispatch({ type: "end" });
    if (conv.streaming) conv.stop();
    onClose();
  }, [conv, onClose]);

  // Esc ends from anywhere while it is open (focus may sit on the page after a control changes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = document.activeElement;
      if (el && el !== document.body && !root.current?.contains(el)) return;
      e.preventDefault();
      end();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [end]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      end();
      return;
    }
    if (e.key === "Tab" && root.current) {
      const items = Array.from(root.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"));
      if (items.length) {
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (e.key === " " && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLAnchorElement)) {
      e.preventDefault();
      const ev = spaceEvent(s);
      if (ev) dispatch(ev);
    }
  };

  const plush = plushFor(s.phase);
  const words = phaseWords(s.phase, persona.name);
  const answer = lastAnswer;
  const showAnswer = answer && (answer.text || answer.status === "streaming") && s.turn > 0;

  const primary =
    s.phase === "listening"
      ? s.heard.trim()
        ? { label: "Send now", icon: Microphone, ev: { type: "send-now" } as const }
        : { label: "Pause", icon: Pause, ev: { type: "pause" } as const }
      : s.phase === "speaking"
        ? { label: "Stop speaking", icon: Microphone, ev: { type: "interrupt" } as const }
        : s.phase === "paused"
          ? { label: "Resume", icon: Play, ev: { type: "resume" } as const }
          : s.phase === "idle" || s.phase === "ended"
            ? { label: "Start talking", icon: Microphone, ev: { type: "start" } as const }
            : { label: "Looking", icon: Pause, ev: null };

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${uid}-t`}
      aria-describedby={`${uid}-k`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="absolute inset-0 z-40 flex flex-col overflow-y-auto bg-bg outline-none"
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-4 pb-6 pt-6 sm:px-6 sm:pt-10">
        <h2 id={`${uid}-t`} className="sr-only">
          Talking with {persona.name}
        </h2>
        <span
          className="relative grid shrink-0 place-items-center rounded-full bg-surface ring-1 ring-line"
          style={{ width: size + 24, height: size + 24 }}
        >
          <span className="block" style={{ width: size, height: size }}>
            <AgentOrb seed={persona.seed} mode="live" state={plush} size={size} label={`${persona.name}, your Myte`} level={() => level.current} />
          </span>
        </span>
        <p className="display mt-5 text-center text-[24px] text-ink" aria-live="polite">
          {words}
        </p>
        <p id={`${uid}-k`} className="mt-1 hidden text-center text-[13.5px] text-ink-3 sm:block">
          Space to talk, send or interrupt. Esc to end.
        </p>

        <div className="mt-6 min-h-[56px] w-full">
          {s.phase === "listening" || s.heard ? (
            <p className="text-center text-[18px] leading-relaxed text-ink" aria-live="polite">
              <span className="sr-only">You said: </span>
              {s.heard || <span className="text-ink-3">Go ahead, I&apos;m listening.</span>}
            </p>
          ) : s.sent && s.phase !== "idle" ? (
            <p className="text-center text-[16px] leading-relaxed text-ink-3">
              <span className="sr-only">You asked: </span>&ldquo;{s.sent}&rdquo;
            </p>
          ) : null}
          {voiceNote && !s.error ? (
            <p className="mt-3 text-center text-[14px] text-ink-3" role="status">
              {voiceNote}
            </p>
          ) : null}
          {s.error ? (
            <p className="mt-3 rounded-ctl bg-priority-medium-soft px-3.5 py-2.5 text-center text-[14px] text-ink" role="alert">
              {s.error}
            </p>
          ) : null}
        </div>

        {showAnswer && answer ? (
          <section aria-label={`${persona.name}'s answer`} className="mt-4 w-full rounded-card border border-line bg-surface p-4 sm:p-5" data-ask-column="">
            <div aria-live="polite" aria-atomic="false">
              <AnswerText text={answer.text} sources={answer.sources} onOpen={(n) => setOpenSource(n)} streaming={answer.status === "streaming"} />
            </div>
            {answer.sources.length ? (
              <ol className="mt-3 space-y-1 border-t border-line pt-3" aria-label="Sources">
                {answer.sources.slice(0, 6).map((src) => (
                  <li key={src.n} className={`flex gap-2 rounded-ctl px-1.5 py-1 text-[13.5px] ${openSource === src.n ? "bg-signal-soft text-ink" : "text-ink-3"}`}>
                    <span className="font-semibold tabular-nums text-signal-ink">{src.n}</span>
                    <span className="min-w-0 truncate">
                      {sourceKindLabel(src)}, {sourceTitle(src)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="sticky bottom-0 flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-line bg-bg px-4 py-4">
        <button
          type="button"
          onClick={() => dispatch({ type: "mute", muted: !s.muted })}
          aria-pressed={s.muted}
          aria-label={s.muted ? "Read answers aloud" : "Mute: show answers without reading them"}
          title={s.muted ? "Unmute" : "Mute"}
          className={`grid h-12 w-12 place-items-center rounded-full border transition-colors ${s.muted ? "border-pill bg-pill text-pill-on" : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"}`}
        >
          {s.muted ? <SpeakerSimpleSlash size={20} aria-hidden /> : <SpeakerHigh size={20} aria-hidden />}
        </button>
        <button
          type="button"
          data-voice-primary=""
          onClick={() => primary.ev && dispatch(primary.ev)}
          aria-disabled={!primary.ev || undefined}
          className="inline-flex h-14 min-w-[168px] items-center justify-center gap-2 rounded-full bg-pill px-6 text-[16px] font-semibold text-pill-on transition-colors hover:bg-pill-2 aria-disabled:opacity-60"
        >
          <primary.icon size={20} weight="fill" aria-hidden />
          {primary.label}
        </button>
        <button
          type="button"
          onClick={end}
          aria-label="End the conversation"
          title="End (Esc)"
          className="grid h-12 w-12 place-items-center rounded-full border border-[color:color-mix(in_srgb,var(--priority-high)_45%,var(--line))] bg-surface text-priority-high transition-colors hover:bg-priority-high-soft"
        >
          <PhoneDisconnect size={20} weight="fill" aria-hidden />
        </button>
      </div>
    </div>
  );
}
