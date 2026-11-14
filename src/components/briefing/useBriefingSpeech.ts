"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { segmentAt, segmentSeconds, segmentStarts, wordAt, type BriefingSegment } from "@/lib/briefing";
import { failureNote, type VoiceFailure } from "@/lib/voice/catalog";
import { myteSpeaker, useMyteSpeaker } from "@/lib/voice/myte-voice";

/* Playback for one briefing, in the Myte's own voice (ADR-0050), two engines behind one control
   surface:

   - `audio`: the briefing's recorded file (core-api rendered it with the same voice): an <audio>
     element on a short-lived URL fetched on the first Play; the segment follows the playhead by
     length. A file that fails to load is spoken live instead.
   - `voice`: the shared Myte speaker (`POST /api/voice/speech`), one segment at a time, so
     pausing, skipping and changing speed never lose more than a sentence. Every segment is
     rendered ahead as soon as the player is shown (`speaker.warm`, three at a time, in order), so
     playback never waits between parts. The highlighted word follows the speaker's playhead.

   While the recording is still being made (`preparing`), Play waits for it (the player polls)
   and starts the file the moment it is ready; if it never is, the Myte speaks it live.

   There is no device voice. When the voice server is unavailable the player says so quietly
   (`note`) and the whole briefing stays written out below.

   Either way the Media Session API names the briefing and wires play, pause, previous and next,
   so the lock screen and hardware keys control it too. Nothing plays until asked, except when the
   person turned auto-play on and the browser allows it (`blocked` says when it did not). */

export type Engine = "voice" | "audio";

export interface SpeechOptions {
  segments: readonly Pick<BriefingSegment, "text">[];
  language: string;
  title: string;
  agentName: string;
  /** 0.75..2; the live voice renders 0.7..1.4 and plays faster steps a little quicker */
  rate: number;
  /** The recorded file: resolve a playable URL (null when it cannot be had). */
  audio: (() => Promise<string | null>) | null;
  /** a stable id for this briefing (the speaker's key) */
  id: string;
  /** the recording is still being made: Play waits for it */
  preparing?: boolean;
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
  loading: boolean;
  /** the recording is still being made */
  preparing: boolean;
  /** Play was pressed while preparing: it starts as soon as the voice is ready */
  waiting: boolean;
  /** a quiet note when the voice could not speak (the text stays) */
  note: string | null;
  /** the speaker's live output level, for the face */
  level: () => number;
}

export function useBriefingSpeech(opts: SpeechOptions) {
  const { segments, rate } = opts;
  const starts = useMemo(() => segmentStarts(segments), [segments]);
  // The file plays when there is one and it has not failed; otherwise the live voice.
  const [fileBroken, setFileBroken] = useState(false);
  const engine: Engine = opts.audio && !fileBroken ? "audio" : "voice";
  const preparing = !!opts.preparing && !opts.audio;
  const [waiting, setWaiting] = useState(false);
  const wantPlay = useRef(false);
  const [filePlaying, setFilePlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [word, setWord] = useState<[number, number] | null>(null);
  const [fraction, setFraction] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<VoiceFailure | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const started = useRef(false);
  const indexRef = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const { snapshot, level } = useMyteSpeaker();

  const keyPrefix = `briefing:${opts.id}:`;
  const mine = snapshot.key?.startsWith(keyPrefix) ?? false;
  const voicePlaying = engine === "voice" && mine && (snapshot.status === "speaking" || snapshot.status === "loading");
  const playing = engine === "audio" ? filePlaying : voicePlaying;
  const playingRef = useRef(false);
  playingRef.current = playing;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const total = useMemo(() => segments.reduce((sum, s) => sum + segmentSeconds(s.text, rate), 0), [segments, rate]);

  const firstPlay = useCallback(() => {
    if (!started.current) {
      started.current = true;
      optsRef.current.onFirstPlay?.();
    }
  }, []);

  // --- live voice ------------------------------------------------------------------------------

  const speakFrom = useCallback(
    (i: number) => {
      const seg = optsRef.current.segments[i];
      if (!seg) return;
      setIndex(i);
      setWord(null);
      setFraction(starts[i] ?? 0);
      setFinished(false);
      setFailure(null);
      setBlocked(false);
      const r = optsRef.current.rate;
      void myteSpeaker()
        .speak({ key: `${keyPrefix}${i}`, text: seg.text, speed: Math.min(1.4, Math.max(0.7, r)), language: optsRef.current.language })
        .then((outcome) => {
          if (outcome === "ended") {
            const next = i + 1;
            if (next < optsRef.current.segments.length) speakFrom(next);
            else {
              setWord(null);
              setFraction(1);
              setFinished(true);
            }
          } else if (outcome === "error") {
            const err = myteSpeaker().getSnapshot().error;
            if (err === "blocked") setBlocked(true);
            else setFailure(err ?? "voice_failed");
          }
        });
    },
    [keyPrefix, starts],
  );

  // The word being said, from the speaker's playhead through the segment.
  useEffect(() => {
    if (!voicePlaying) return;
    let raf = 0;
    const tick = () => {
      const pos = myteSpeaker().position();
      const i = indexRef.current;
      const seg = optsRef.current.segments[i];
      if (pos && seg) {
        const at = Math.floor(pos.fraction * seg.text.length);
        setWord(wordAt(seg.text, Math.min(seg.text.length - 1, at)));
        const a = starts[i] ?? 0;
        const b = starts[i + 1] ?? 1;
        setFraction(a + (b - a) * pos.fraction);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [voicePlaying, starts]);

  // --- recorded file ---------------------------------------------------------------------------

  const ensureAudio = useCallback(async (): Promise<HTMLAudioElement | null> => {
    if (audioEl.current) return audioEl.current;
    const resolve = optsRef.current.audio;
    if (!resolve) return null;
    setLoading(true);
    const url = await resolve();
    setLoading(false);
    if (!url) {
      setFileBroken(true);
      return null;
    }
    const el = new Audio(url);
    el.preload = "auto";
    el.playbackRate = optsRef.current.rate;
    el.addEventListener("play", () => setFilePlaying(true));
    el.addEventListener("pause", () => setFilePlaying(false));
    el.addEventListener("timeupdate", () => {
      const f = el.duration > 0 ? el.currentTime / el.duration : 0;
      setFraction(f);
      setIndex(segmentAt(starts, f));
    });
    el.addEventListener("ended", () => {
      setFilePlaying(false);
      setFraction(1);
      setFinished(true);
    });
    el.addEventListener("error", () => {
      // An expired or unreachable file: the Myte speaks it live instead.
      audioEl.current = null;
      setFilePlaying(false);
      setFileBroken(true);
    });
    audioEl.current = el;
    return el;
  }, [starts]);

  // --- controls --------------------------------------------------------------------------------

  const play = useCallback(
    async (from?: number) => {
      if (preparing) {
        // Wait for the recording; the effect below starts it (or the live voice).
        wantPlay.current = true;
        setWaiting(true);
        return;
      }
      firstPlay();
      const at = from ?? (finished ? 0 : indexRef.current);
      if (engine === "audio") {
        // A file playing stops any other voice in the app.
        myteSpeaker().stop();
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
      const snap = myteSpeaker().getSnapshot();
      if (from === undefined && snap.status === "paused" && snap.key === `${keyPrefix}${at}`) {
        myteSpeaker().resume();
        return;
      }
      speakFrom(at);
    },
    [engine, ensureAudio, finished, firstPlay, keyPrefix, preparing, speakFrom, starts],
  );

  // The recording became ready (or will not be): play what was asked for.
  useEffect(() => {
    if (preparing || !wantPlay.current) return;
    wantPlay.current = false;
    setWaiting(false);
    void play();
  }, [preparing, play]);

  // The live voice: render every segment ahead, in order, three at a time.
  const liveSpeed = Math.min(1.4, Math.max(0.7, rate));
  useEffect(() => {
    if (engine !== "voice" || preparing || !segments.length) return;
    return myteSpeaker().warm(
      segments.map((seg) => seg.text),
      { speed: liveSpeed, language: opts.language, concurrency: 3 },
    );
  }, [engine, preparing, segments, liveSpeed, opts.language]);

  const pause = useCallback(() => {
    if (wantPlay.current) {
      wantPlay.current = false;
      setWaiting(false);
      return;
    }
    if (audioEl.current && engine === "audio") {
      audioEl.current.pause();
      return;
    }
    myteSpeaker().stop();
  }, [engine]);

  const toggle = useCallback(() => (playingRef.current || wantPlay.current ? pause() : void play()), [pause, play]);

  const seek = useCallback(
    (i: number) => {
      const n = optsRef.current.segments.length;
      const to = Math.min(Math.max(i, 0), Math.max(0, n - 1));
      setIndex(to);
      setWord(null);
      setFinished(false);
      setFraction(starts[to] ?? 0);
      if (engine === "audio" && audioEl.current) {
        const el = audioEl.current;
        el.currentTime = (starts[to] ?? 0) * (el.duration || 0);
        return;
      }
      if (playingRef.current) speakFrom(to);
    },
    [engine, speakFrom, starts],
  );

  const next = useCallback(() => seek(indexRef.current + 1), [seek]);
  const prev = useCallback(() => seek(indexRef.current - 1), [seek]);

  // Speed applies at once: the file's rate, or the current sentence again.
  const lastRate = useRef(rate);
  useEffect(() => {
    if (audioEl.current) audioEl.current.playbackRate = rate;
    const changed = lastRate.current !== rate;
    lastRate.current = rate;
    if (changed && playingRef.current && engine === "voice") speakFrom(indexRef.current);
  }, [rate, engine, speakFrom]);

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

  // Another voice starting in the app pauses the file.
  useEffect(() => {
    if (snapshot.status !== "idle" && !mine && audioEl.current && !audioEl.current.paused) audioEl.current.pause();
  }, [snapshot.status, mine]);

  // Leaving the page stops the voice.
  useEffect(() => {
    const prefix = keyPrefix;
    return () => {
      const k = myteSpeaker().getSnapshot().key;
      if (k?.startsWith(prefix)) myteSpeaker().stop();
      audioEl.current?.pause();
    };
  }, [keyPrefix]);

  const state: SpeechState = {
    engine,
    playing,
    index,
    word: engine === "voice" ? word : null,
    progress: fraction,
    elapsed: total * fraction,
    total,
    blocked,
    finished,
    loading,
    preparing,
    waiting,
    note: failure ? failureNote(failure) : null,
    level,
  };
  return { state, play, pause, toggle, seek, next, prev };
}
