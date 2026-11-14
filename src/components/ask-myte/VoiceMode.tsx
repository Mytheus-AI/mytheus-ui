"use client";

import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { Microphone, Pause, PhoneDisconnect, Play, SpeakerHigh, SpeakerSimpleSlash } from "@phosphor-icons/react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { failureNote } from "@/lib/voice/catalog";
import { myteFillers, myteSpeaker, useVoiceSpeed } from "@/lib/voice/myte-voice";
import { FILLER_PHRASES, createFillerScheduler, type FillerAction } from "@/lib/voice/fillers";
import { createSegmenter, type Segmenter } from "@/lib/voice/stream-text";
import { TIMING_MARKS, createTurnTiming, formatMs, formatSummary, wantsVoiceDebug, type TurnSummary, type TurnTiming } from "@/lib/voice/turn-timing";
import type { SpeechStream } from "@/lib/voice/speaker";
import { failureCopy } from "@/lib/ask-myte/compose";
import { plainText, type Answer } from "@/lib/ask-myte/reducer";
import { firstNameOf, initialVoice, phaseWords, pickGreeting, plushFor, spaceEvent, voiceReducer } from "@/lib/ask-myte/voice-machine";
import { listenFailureNote, micErrorNote, transcribe, type RollingRecorder } from "@/lib/voice/listen";
import { MicError, openMic, type Mic } from "@/lib/voice/mic";
import { createVad, type Vad } from "@/lib/voice/vad";
import type { AskPage, AskScope } from "@/lib/ask-myte/types";
import { sourceKindLabel, sourceTitle } from "@/lib/ask-myte/citations";
import { AnswerText } from "./parts";
import type { AskMyteState } from "./useAskMyte";

/* Talk to Myte (ADR-0049 F6), loaded only when someone presses Talk. A large live plush in the
   middle reacts to the conversation. It greets the person first, in its own voice (the
   self-hosted Kokoro voice, ADR-0050), then listens: the microphone is recorded and
   voice-activity detection on its level (lib/voice/vad.ts) finds where speech starts (with a
   pre-roll, so the first syllable is kept) and ends (about 1.2 s of quiet, 30 s at most). The
   clip is transcribed by the server (POST /api/voice/transcribe, faster-whisper), so it works in
   every browser that can record, not only where the browser's own recognition works. The words
   go into the normal Ask Myte thread and the answer is spoken while it streams, with short
   fillers in its voice ("Got it.", "Checking your calendar.") covering the wait; then it listens
   again. It never records while it speaks; Space interrupts it, fillers included.

   Every turn is timed (lib/voice/turn-timing.ts): a one-line summary goes to the console, and
   `?voice-debug=1` shows the numbers in a small overlay.

   Keyboard: Space interrupts, sends what it is hearing, or pauses; Esc ends. Controls: pause,
   mute (answers are shown but not read aloud), end. */

const TICK_MS = 50;
const SLOW_TRANSCRIBE_MS = 5000;

/** One spoken turn, followed from the question to the last word said. */
type Turn = {
  n: number;
  /** the answer's key, once it starts streaming */
  key: string | null;
  /** false once interrupted, muted or ended: the text keeps streaming, nothing more is said */
  active: boolean;
  timing: TurnTiming;
  segmenter: Segmenter;
  stepSeen: boolean;
  textSeen: boolean;
  settled: boolean;
  logged: boolean;
};

const TIMING_LABEL: Record<(typeof TIMING_MARKS)[number], string> = {
  stt: "Transcript",
  step: "First step",
  text: "First text",
  audio: "First answer audio",
  done: "Done",
  filler: "First filler",
};

export default function VoiceMode({
  conv,
  persona,
  firstName = "",
  scope,
  page,
  isAdmin,
  onClose,
  size = 200,
}: {
  conv: AskMyteState;
  persona: { name: string; seed: string; personality: string | null };
  firstName?: string;
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
  const meter = useRef<HTMLSpanElement>(null);
  const level = useRef(0);
  const mic = useRef<Mic | null>(null);
  const micOpening = useRef<Promise<Mic | null> | null>(null);
  const vad = useRef<Vad>(createVad());
  const rec = useRef<RollingRecorder | null>(null);
  const handledClip = useRef(0);
  const transcribing = useRef<AbortController | null>(null);
  const [slow, setSlow] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [greeting] = useState(() => pickGreeting(persona.name, firstNameOf(firstName)));
  const [speed] = useVoiceSpeed();
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const spokenKey = useRef<string | null>(null);
  const sentTurn = useRef(0);
  const turnRef = useRef<Turn | null>(null);
  const talkStream = useRef<SpeechStream | null>(null);
  const [sched] = useState(() => createFillerScheduler({ ready: (p) => myteFillers().ready(p, speedRef.current) }));
  const pendingTiming = useRef<TurnTiming | null>(null);
  const [fillerOn, setFillerOn] = useState<string | null>(null);
  const [timings, setTimings] = useState<TurnSummary | null>(null);
  const [debug, setDebug] = useState(false);
  const warmed = useRef(false);
  const phaseRef = useRef(s.phase);
  phaseRef.current = s.phase;
  const mounted = useRef(true);

  /* ---------------- the microphone ---------------- */
  const ensureMic = useCallback((): Promise<Mic | null> => {
    if (mic.current) return Promise.resolve(mic.current);
    micOpening.current ??= openMic()
      .then((m) => {
        if (!mounted.current) {
          m.close();
          return null;
        }
        mic.current = m;
        return m;
      })
      .catch((err: unknown) => {
        micOpening.current = null;
        if (mounted.current) dispatch({ type: "mic-error", message: micErrorNote(err instanceof MicError ? err.kind : null) });
        return null;
      });
    return micOpening.current;
  }, []);

  const closeMic = useCallback(() => {
    rec.current?.cancel();
    rec.current = null;
    mic.current?.close();
    mic.current = null;
    micOpening.current = null;
  }, []);

  /** Render the fillers in this voice (once per visit; the bank keeps them). */
  const warmFillers = useCallback(() => {
    if (warmed.current || !mounted.current) return;
    warmed.current = true;
    myteFillers().warm(FILLER_PHRASES, { speed: speedRef.current, language: "en" });
  }, []);

  // One loop: the level for the plush and the meter, and voice-activity detection while listening.
  useEffect(() => {
    const t = window.setInterval(() => {
      const phase = phaseRef.current;
      const m = mic.current;
      if (phase === "listening" && m) {
        const now = Date.now();
        const lv = m.level();
        level.current = level.current * 0.5 + lv * 0.5;
        if (!rec.current) {
          // Listening (again): recording starts in the background, the detector starts over.
          rec.current = m.rolling();
          rec.current.arm();
          vad.current.reset(now);
        }
        const r = rec.current;
        r.tick();
        const ev = vad.current.push(lv, now);
        if (ev === "start") {
          r.begin();
          dispatch({ type: "speech-start" });
        } else if (ev === "end" || ev === "cap") dispatch({ type: "speech-end" });
        else if (ev === "discard") {
          // A cough or a bump: nothing to send; keep listening.
          r.arm();
          dispatch({ type: "speech-discard" });
        }
      } else if (phase === "speaking" || phase === "greeting" || phase === "thinking") {
        // While thinking this is a filler's level: the plush thinks with its speaking mouth.
        level.current = myteSpeaker().level();
      } else level.current *= 0.8;
      if (meter.current) meter.current.style.transform = `scaleX(${Math.min(1, level.current * 1.6).toFixed(3)})`;
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, []);

  // Half-duplex: recording runs only while listening; leaving it any other way drops the audio.
  useEffect(() => {
    if (s.phase === "listening") void ensureMic();
    else if (s.phase !== "transcribing") {
      rec.current?.cancel();
      rec.current = null;
    }
  }, [s.phase, ensureMic]);

  /* ---------------- transcribing ---------------- */
  useEffect(() => {
    if (s.phase !== "transcribing" || s.clip <= handledClip.current) return;
    handledClip.current = s.clip;
    // The end of speech: the turn's clock starts here.
    const timing = createTurnTiming(s.turn + 1, performance.now());
    pendingTiming.current = timing;
    const r = rec.current;
    rec.current = null;
    vad.current.finish(Date.now());
    const ctrl = new AbortController();
    transcribing.current = ctrl;
    setSlow(false);
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_TRANSCRIBE_MS);
    void (async () => {
      const clip = r ? await r.finish() : null;
      if (!clip || !clip.size) {
        if (!ctrl.signal.aborted) dispatch({ type: "transcript", text: "" });
        return;
      }
      const res = await transcribe(clip, { language: document.documentElement.lang, signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      if (res.ok) {
        timing.mark("stt", performance.now());
        dispatch({ type: "transcript", text: res.text });
      }
      else if (res.reason !== "aborted")
        dispatch({ type: "transcribe-failed", message: listenFailureNote(res.reason), fatal: res.reason === "listening_not_connected" || res.reason === "signed_out" || res.reason === "unsupported" });
    })().finally(() => {
      window.clearTimeout(slowTimer);
      if (transcribing.current === ctrl) transcribing.current = null;
      setSlow(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per clip
  }, [s.phase, s.clip]);

  /* ---------------- sending, fillers and the streamed answer ---------------- */
  // A turn: the question goes, an acknowledgment plays at once ("Got it."), a step filler covers
  // the look-up ("Checking your calendar."), and the answer is spoken while it streams: the text
  // is cut into units as it arrives (lib/voice/stream-text.ts) and pushed into one speech stream,
  // which plays them in order and cuts a filler for the first one. Interrupting, muting or ending
  // stops the stream; the words keep streaming on screen.
  const stopTalk = useCallback(() => {
    const t = turnRef.current;
    if (t) t.active = false;
    sched.end();
    const st = talkStream.current;
    talkStream.current = null;
    setFillerOn(null);
    if (st && myteSpeaker().getSnapshot().key === st.key) myteSpeaker().stop(st.key);
  }, [sched]);

  const report = useCallback((t: Turn) => {
    if (t.logged) return;
    t.logged = true;
    const sum = t.timing.summary();
    console.info(formatSummary(sum));
    if (mounted.current) setTimings(sum);
  }, []);

  const playFiller = useCallback(
    (action: FillerAction | null) => {
      const st = talkStream.current;
      const t = turnRef.current;
      if (!action || !st || !t?.active) return;
      const clip = myteFillers().get(action.phrase, speedRef.current);
      if (!clip) {
        playFiller(sched.ended(performance.now()));
        return;
      }
      void st.filler(clip, action.kind).then(() => {
        if (talkStream.current !== st) return;
        setFillerOn(null);
        playFiller(sched.ended(performance.now()));
      });
    },
    [sched],
  );

  useEffect(() => {
    if (s.phase === "thinking" && s.sent && s.turn > sentTurn.current) {
      sentTurn.current = s.turn;
      // A barge-in left the last answer streaming on screen: it stops for the new question.
      if (conv.streaming) conv.stop();
      stopTalk();
      const timing = pendingTiming.current ?? createTurnTiming(s.turn, performance.now());
      pendingTiming.current = null;
      const t: Turn = { n: s.turn, key: null, active: true, timing, segmenter: createSegmenter(), stepSeen: false, textSeen: false, settled: false, logged: false };
      turnRef.current = t;
      setTimings(timing.summary());
      conv.send(s.sent, scope, page);
      if (!s.muted) {
        const st = myteSpeaker().stream({
          key: `talk:turn-${s.turn}`,
          speed: speedRef.current,
          onFiller: (kind) => {
            timing.mark("filler", performance.now());
            setFillerOn(kind);
            setTimings(timing.summary());
          },
          onAnswer: () => {
            timing.mark("audio", performance.now());
            setFillerOn(null);
            setTimings(timing.summary());
            if (turnRef.current === t && t.active) dispatch({ type: "answer-audio" });
          },
        });
        talkStream.current = st;
        void st.done.then((outcome) => {
          if (talkStream.current === st) talkStream.current = null;
          if (!mounted.current || turnRef.current !== t) return;
          setFillerOn(null);
          if (outcome === "error") setVoiceNote(failureNote(myteSpeaker().getSnapshot().error ?? "voice_failed"));
          if (t.settled) report(t);
          if (outcome !== "stopped" && t.active) dispatch({ type: "spoken" });
        });
        playFiller(sched.begin(performance.now()));
      }
    }
  }, [s.phase, s.sent, s.turn, s.muted, conv, scope, page, stopTalk, playFiller, report, sched]);

  const lastAnswer = useMemo(() => [...conv.messages].reverse().find((m): m is Answer => m.role === "myte") ?? null, [conv.messages]);

  // Follow this turn's answer as it streams: steps feed the fillers, text feeds the voice.
  useEffect(() => {
    const t = turnRef.current;
    if (!t || !lastAnswer || t.settled) return;
    if (t.key === null) {
      // The answer of this turn is the one that starts streaming after the question went.
      if (lastAnswer.status !== "streaming") return;
      t.key = lastAnswer.key;
    }
    if (lastAnswer.key !== t.key) return;
    const now = performance.now();
    const st = talkStream.current;
    const running = lastAnswer.steps.find((x) => x.state === "running") ?? lastAnswer.steps[0];
    if (running && !t.stepSeen) {
      t.stepSeen = true;
      t.timing.mark("step", now);
      if (t.active) playFiller(sched.step(running.label, now));
    }
    if (lastAnswer.text && !t.textSeen) {
      t.textSeen = true;
      t.timing.mark("text", now);
      sched.text();
    }
    if (t.active && st && lastAnswer.text) for (const unit of t.segmenter.feed(lastAnswer.text)) st.push(unit);
    if (lastAnswer.status === "streaming") {
      setTimings(t.timing.summary());
      return;
    }
    t.settled = true;
    sched.end();
    if (lastAnswer.status === "done") {
      t.timing.mark("done", now);
      if (t.active && st) {
        for (const unit of t.segmenter.finish()) st.push(unit);
        st.end();
      }
      const spoken = !!plainText(lastAnswer.text) && !!talkStream.current && !s.muted;
      if (!talkStream.current) report(t);
      else setTimings(t.timing.summary());
      if (t.active) dispatch({ type: "answer-done", spoken });
    } else {
      report(t);
      if (t.active) {
        stopTalk();
        const copy = lastAnswer.error ? failureCopy(lastAnswer.error.reason, { name: persona.name, message: lastAnswer.error.message, isAdmin }) : failureCopy("stopped", { name: persona.name });
        dispatch({ type: "answer-failed", message: copy.title });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follows the answer; the rest is read live
  }, [lastAnswer]);

  // The slow-path line: about 4 s with nothing to say yet.
  useEffect(() => {
    if (s.phase !== "thinking" || s.muted) return;
    const timer = window.setInterval(() => playFiller(sched.tick(performance.now())), 200);
    return () => window.clearInterval(timer);
  }, [s.phase, s.muted, playFiller, sched]);

  /* ---------------- speaking ---------------- */
  // The greeting, in the Myte's own voice (ADR-0050), through the shared speaker; the answers go
  // through the turn's stream above. Pause holds the sound where it is and Resume carries on;
  // interrupting, muting or ending stops it. If the voice is unavailable it says so quietly and
  // listens; the words stay on screen.
  useEffect(() => {
    const speaker = myteSpeaker();
    const snap = speaker.getSnapshot();
    if (s.phase === "greeting") {
      if (spokenKey.current === "talk:greeting") return;
      spokenKey.current = "talk:greeting";
      setVoiceNote(null);
      void speaker.speak({ key: "talk:greeting", text: greeting, speed }).then((outcome) => {
        if (outcome === "error") setVoiceNote(failureNote(speaker.getSnapshot().error ?? "voice_failed"));
        if (outcome !== "stopped") dispatch({ type: "greeted" });
      });
      // Fillers render while the greeting plays (after its first words were asked for).
      window.setTimeout(() => warmFillers(), 400);
      return;
    }
    if (snap.key === "talk:greeting") speaker.stop("talk:greeting");
    const st = talkStream.current;
    const owns = st !== null && snap.key === st.key;
    if (s.phase === "paused") {
      if (owns) speaker.pause();
    } else if (s.phase === "speaking" || s.phase === "thinking") {
      if (owns && snap.status === "paused") speaker.resume();
    } else if (st) stopTalk();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the phase only
  }, [s.phase]);

  // Muting mid-turn stops the voice (fillers included); the answer still streams on screen.
  useEffect(() => {
    if (s.muted) stopTalk();
  }, [s.muted, stopTalk]);

  /* ---------------- start, end, keys ---------------- */
  useEffect(() => {
    mounted.current = true;
    // The tap on Talk unlocked the audio (primeTalk); this keeps it unlocked if it came another way.
    myteSpeaker().unlock();
    // The Myte speaks first; the microphone opens meanwhile, so asking permission overlaps the greeting.
    dispatch({ type: "start", greet: true });
    void ensureMic();
    setDebug(wantsVoiceDebug(window.location.search));
    const t = window.setTimeout(() => root.current?.querySelector<HTMLElement>("[data-voice-primary]")?.focus(), 30);
    // Without a greeting (muted, or the voice was slow) the fillers still get rendered.
    const w = window.setTimeout(() => warmFillers(), 2500);
    return () => {
      mounted.current = false;
      spokenKey.current = null;
      window.clearTimeout(t);
      window.clearTimeout(w);
      if (turnRef.current) turnRef.current.active = false;
      sched.end();
      talkStream.current = null;
      transcribing.current?.abort();
      closeMic();
      if (myteSpeaker().getSnapshot().key?.startsWith("talk:")) myteSpeaker().stop();
    };
  }, [ensureMic, closeMic, warmFillers, sched]);

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
      ? s.talking
        ? { label: "Send now", icon: Microphone, ev: { type: "send-now" } as const }
        : { label: "Pause", icon: Pause, ev: { type: "pause" } as const }
      : s.phase === "speaking" || s.phase === "greeting"
        ? { label: "Stop speaking", icon: Microphone, ev: { type: "interrupt" } as const }
        : s.phase === "paused"
          ? { label: "Resume", icon: Play, ev: { type: "resume" } as const }
          : s.phase === "idle" || s.phase === "ended"
            ? { label: "Start talking", icon: Microphone, ev: { type: "start" } as const }
            : s.phase === "thinking"
              ? { label: "Stop and listen", icon: Microphone, ev: { type: "interrupt" } as const }
              : { label: "Thinking", icon: Pause, ev: null };

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${uid}-t`}
      aria-describedby={`${uid}-k`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-filler={fillerOn ?? undefined}
      className="absolute inset-0 z-40 flex flex-col overflow-y-auto bg-bg outline-none"
    >
      {debug ? (
        <aside aria-label="Voice timing" className="pointer-events-none absolute left-3 top-3 z-10 rounded-ctl border border-line bg-surface/95 px-3 py-2 text-[12.5px] leading-5 text-ink-3 shadow-warm-1">
          <p className="font-semibold text-ink-2">Turn {timings?.turn ?? "-"}, from end of speech</p>
          <dl className="grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
            {TIMING_MARKS.map((m) => (
              <div key={m} className="contents">
                <dt>{TIMING_LABEL[m]}</dt>
                <dd className="text-right text-ink-2">{formatMs(timings?.[m] ?? null)}</dd>
              </div>
            ))}
          </dl>
        </aside>
      ) : null}
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
          Just talk. Space sends now or interrupts. Esc to end.
        </p>

        <div className="mt-6 min-h-[56px] w-full">
          {s.phase === "greeting" ? (
            <p className="text-center text-[18px] leading-relaxed text-ink">
              <span className="sr-only">{persona.name} said: </span>&ldquo;{greeting}&rdquo;
            </p>
          ) : s.phase === "listening" ? (
            <div className="flex flex-col items-center gap-2.5" aria-live="polite">
              <p className="text-center text-[18px] leading-relaxed text-ink">{s.talking ? "Hearing you…" : "Listening…"}</p>
              <span className="block h-1.5 w-40 overflow-hidden rounded-full bg-line" aria-hidden>
                <span ref={meter} className="block h-full w-full origin-left scale-x-0 rounded-full bg-signal-ink transition-transform duration-75 motion-reduce:transition-none" />
              </span>
              {!s.talking && !s.sent ? <p className="text-center text-[14px] text-ink-3">Just start talking. A short pause sends it.</p> : null}
            </div>
          ) : s.sent && s.phase !== "idle" && s.phase !== "transcribing" ? (
            <p className="text-center text-[16px] leading-relaxed text-ink-3">
              <span className="sr-only">You asked: </span>&ldquo;{s.sent}&rdquo;
            </p>
          ) : s.phase === "transcribing" && slow ? (
            <p className="text-center text-[14px] text-ink-3" role="status">
              Getting ready to listen. The first time takes a little longer.
            </p>
          ) : null}
          {s.note && !s.error ? (
            <p className="mt-3 text-center text-[14px] text-ink-3" role="status">
              {s.note}
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
