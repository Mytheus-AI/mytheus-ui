"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  pickVoice,
  segmentAt,
  segmentSeconds,
  segmentStarts,
  voiceTone,
  voicesFor,
  wordAt,
  type BriefingPersonality,
  type BriefingSegment,
} from "@/lib/briefing";

/* Playback for one briefing, two engines behind one control surface:

   - `device`: the browser's own voice (Web Speech API, speechSynthesis). One utterance per
     segment, so pausing, skipping and changing speed never lose more than a sentence; word
     boundaries drive the highlighted word. Pause cancels and Play restarts the current segment
     (the browsers' own pause/resume is unreliable across voices).
   - `audio`: the server voice (TTS_PROVIDER connected): an <audio> element on a short-lived URL
     fetched on the first Play; the segment follows the playhead by length. A failed file falls
     back to the device voice.

   Either way the Media Session API names the briefing and wires play, pause, previous and next,
   so the lock screen and hardware keys control it too. Nothing plays until asked, except when the
   person turned auto-play on and the browser allows it (`blocked` says when it did not). */

export type Engine = "device" | "audio" | "none";

export interface SpeechOptions {
  segments: readonly Pick<BriefingSegment, "text">[];
  language: string;
  personality: BriefingPersonality | string;
  seed: string;
  title: string;
  agentName: string;
  preferredVoice: string | null;
  rate: number;
  /** The server voice: resolve a playable URL (null when it cannot be had). */
  audio: (() => Promise<string | null>) | null;
  onFirstPlay?: () => void;
}

export interface SpeechState {
  engine: Engine;
  playing: boolean;
  index: number;
  word: [number, number] | null;
  /** 0..1 of the whole briefing */
  progress: number;
  elapsed: number;
  total: number;
  /** auto-play was refused by the browser: show "Press play" */
  blocked: boolean;
  finished: boolean;
  voices: SpeechSynthesisVoice[];
  voice: SpeechSynthesisVoice | null;
  loading: boolean;
}

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

export function useBriefingSpeech(opts: SpeechOptions) {
  const { segments, language, personality, seed, preferredVoice, rate } = opts;
  const starts = useMemo(() => segmentStarts(segments), [segments]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [engine, setEngine] = useState<Engine>(opts.audio ? "audio" : "device");
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [word, setWord] = useState<[number, number] | null>(null);
  const [fraction, setFraction] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const started = useRef(false);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // The device's voices arrive late in some browsers (voiceschanged).
  useEffect(() => {
    const s = synth();
    if (!s) {
      if (!opts.audio) setEngine("none");
      return;
    }
    const load = () => setVoices(s.getVoices());
    load();
    s.addEventListener?.("voiceschanged", load);
    return () => s.removeEventListener?.("voiceschanged", load);
  }, [opts.audio]);

  const voice = useMemo(
    () => pickVoice(voices, { language, seed, preferred: preferredVoice }) ?? null,
    [voices, language, seed, preferredVoice],
  );
  const languageVoices = useMemo(() => voicesFor(voices, language), [voices, language]);
  const tone = voiceTone(personality);

  const total = useMemo(() => segments.reduce((sum, s) => sum + segmentSeconds(s.text, rate * tone.rate), 0), [segments, rate, tone.rate]);

  const firstPlay = useCallback(() => {
    if (!started.current) {
      started.current = true;
      optsRef.current.onFirstPlay?.();
    }
  }, []);

  // --- device engine ---------------------------------------------------------------------------

  const speak = useCallback(
    (i: number) => {
      const s = synth();
      const seg = optsRef.current.segments[i];
      if (!s || !seg) return;
      generation.current += 1;
      const mine = generation.current;
      s.cancel();
      const u = new SpeechSynthesisUtterance(seg.text);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = language;
      }
      u.rate = Math.min(4, Math.max(0.3, rate * tone.rate));
      u.pitch = tone.pitch;
      u.onstart = () => {
        if (mine !== generation.current) return;
        setBlocked(false);
        setPlaying(true);
      };
      u.onboundary = (e) => {
        if (mine !== generation.current || e.name !== "word") return;
        const w = wordAt(seg.text, e.charIndex);
        setWord(w);
        const a = starts[i] ?? 0;
        const b = starts[i + 1] ?? 1;
        setFraction(a + (b - a) * ((w?.[1] ?? e.charIndex) / Math.max(1, seg.text.length)));
      };
      u.onend = () => {
        if (mine !== generation.current) return;
        const next = i + 1;
        if (next < optsRef.current.segments.length) {
          setIndex(next);
          setWord(null);
          speak(next);
        } else {
          setPlaying(false);
          setWord(null);
          setFraction(1);
          setFinished(true);
        }
      };
      u.onerror = (e) => {
        if (mine !== generation.current) return;
        if (e.error === "interrupted" || e.error === "canceled") return;
        setPlaying(false);
        if (e.error === "not-allowed") setBlocked(true);
      };
      setIndex(i);
      setWord(null);
      setFraction(starts[i] ?? 0);
      setFinished(false);
      s.speak(u);
    },
    [voice, language, rate, tone.rate, tone.pitch, starts],
  );

  // --- audio engine ----------------------------------------------------------------------------

  const ensureAudio = useCallback(async (): Promise<HTMLAudioElement | null> => {
    if (audioEl.current) return audioEl.current;
    const resolve = optsRef.current.audio;
    if (!resolve) return null;
    setLoading(true);
    const url = await resolve();
    setLoading(false);
    if (!url) {
      setEngine(synth() ? "device" : "none");
      return null;
    }
    const el = new Audio(url);
    el.preload = "auto";
    el.playbackRate = rate;
    el.addEventListener("play", () => setPlaying(true));
    el.addEventListener("pause", () => setPlaying(false));
    el.addEventListener("timeupdate", () => {
      const f = el.duration > 0 ? el.currentTime / el.duration : 0;
      setFraction(f);
      setIndex(segmentAt(starts, f));
    });
    el.addEventListener("ended", () => {
      setPlaying(false);
      setFraction(1);
      setFinished(true);
    });
    el.addEventListener("error", () => {
      // An expired or unreachable file: the device reads it instead.
      audioEl.current = null;
      setPlaying(false);
      setEngine(synth() ? "device" : "none");
    });
    audioEl.current = el;
    return el;
  }, [rate, starts]);

  // --- controls --------------------------------------------------------------------------------

  const play = useCallback(
    async (from?: number) => {
      firstPlay();
      const at = from ?? (finished ? 0 : indexRef.current);
      if (engine === "audio") {
        const el = await ensureAudio();
        if (el) {
          if (from !== undefined || finished) {
            const seek = () => {
              el.currentTime = (starts[at] ?? 0) * (el.duration || 0);
            };
            if (el.readyState >= 1) seek();
            else el.addEventListener("loadedmetadata", seek, { once: true });
          }
          setFinished(false);
          try {
            await el.play();
            setBlocked(false);
          } catch {
            setBlocked(true);
          }
          return;
        }
      }
      if (synth()) speak(at);
    },
    [engine, ensureAudio, finished, firstPlay, speak, starts],
  );

  const pause = useCallback(() => {
    if (audioEl.current && engine === "audio") {
      audioEl.current.pause();
      return;
    }
    generation.current += 1;
    synth()?.cancel();
    setPlaying(false);
  }, [engine]);

  const toggle = useCallback(() => (playingRef.current ? pause() : void play()), [pause, play]);

  const seek = useCallback(
    (i: number) => {
      const n = optsRef.current.segments.length;
      const to = Math.min(Math.max(i, 0), Math.max(0, n - 1));
      setIndex(to);
      setWord(null);
      setFinished(false);
      if (engine === "audio" && audioEl.current) {
        const el = audioEl.current;
        el.currentTime = (starts[to] ?? 0) * (el.duration || 0);
        setFraction(starts[to] ?? 0);
        return;
      }
      setFraction(starts[to] ?? 0);
      if (playingRef.current) speak(to);
    },
    [engine, speak, starts],
  );

  const next = useCallback(() => seek(indexRef.current + 1), [seek]);
  const prev = useCallback(() => seek(indexRef.current - 1), [seek]);

  // Speed and voice changes apply at once: the file's rate, or the current sentence again.
  useEffect(() => {
    if (audioEl.current) audioEl.current.playbackRate = rate;
  }, [rate]);
  const lastVoice = useRef<string | null>(null);
  const lastRate = useRef(rate);
  useEffect(() => {
    const changed = lastVoice.current !== (voice?.name ?? null) || lastRate.current !== rate;
    lastVoice.current = voice?.name ?? null;
    lastRate.current = rate;
    if (changed && playingRef.current && engine === "device") speak(indexRef.current);
  }, [voice, rate, engine, speak]);

  // Lock screen and hardware keys (Media Session API).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.metadata = new MediaMetadata({ title: opts.title, artist: opts.agentName, album: "Mytheus briefing" });
      ms.setActionHandler("play", () => void play());
      ms.setActionHandler("pause", () => pause());
      ms.setActionHandler("previoustrack", () => prev());
      ms.setActionHandler("nexttrack", () => next());
    } catch {
      // Not every action is supported everywhere.
    }
    return () => {
      for (const a of ["play", "pause", "previoustrack", "nexttrack"] as const) {
        try {
          ms.setActionHandler(a, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, [opts.title, opts.agentName, play, pause, prev, next]);

  // Leaving the page stops the voice.
  useEffect(
    () => () => {
      generation.current += 1;
      synth()?.cancel();
      audioEl.current?.pause();
    },
    [],
  );

  const state: SpeechState = {
    engine,
    playing,
    index,
    word,
    progress: fraction,
    elapsed: total * fraction,
    total,
    blocked,
    finished,
    voices: languageVoices,
    voice,
    loading,
  };
  return { state, play, pause, toggle, seek, next, prev };
}
