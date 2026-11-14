"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { failureNote } from "@/lib/voice/catalog";
import { myteSpeaker, useMyteSpeaker, useVoiceSpeed } from "@/lib/voice/myte-voice";
import { canRecord, listenFailureNote, micErrorNote, transcribe, type Take } from "@/lib/voice/listen";
import { MicError, openMic, type Mic } from "@/lib/voice/mic";
import { createVad } from "@/lib/voice/vad";

const KEY = "ask:";

/* Voice for Ask Myte, both ways.

   - `useMyteVoice`: read an answer aloud in the Myte's own voice (ADR-0050: the self-hosted
     Kokoro voice through the shared speaker, the same voice its briefings use). Markdown and
     citation markers are left out of what it says. When the voice is unavailable, `failed` names
     the answer and a quiet note; the text stays and no other voice is used.
   - `useSpeechInput`: dictate a question. The microphone is recorded and the clip transcribed by
     the server (`POST /api/voice/transcribe`), so it works in every browser that can record. It
     stops by itself after a pause of 2 s once you have spoken (or after 8 s of nothing), or when
     you press the mic again / let go of it. `supported` is false where the browser cannot
     record, and the mic button is then not shown.
   - `primeTalk`: call it inside the click that opens Talk mode, so the greeting can be heard. */

/** Unlock the Myte's audio inside a click (autoplay rules): creates and resumes the shared AudioContext. */
export function primeTalk(): void {
  myteSpeaker().unlock();
}

const DICTATE_SILENCE_MS = 2000;
const DICTATE_NOTHING_MS = 8000;
const DICTATE_MAX_MS = 60_000;

const browserCanRecord = () => canRecord(window as unknown as Parameters<typeof canRecord>[0]);

export function useMyteVoice() {
  const { snapshot, speak: say, stop: hush } = useMyteSpeaker();
  const [speed] = useVoiceSpeed();
  const mine = snapshot.key?.startsWith(KEY) ? snapshot.key.slice(KEY.length) : null;
  const speakingKey = mine && (snapshot.status === "loading" || snapshot.status === "speaking" || snapshot.status === "paused") ? mine : null;
  const failed = mine && snapshot.status === "error" && snapshot.error ? { key: mine, note: failureNote(snapshot.error) } : null;

  // Leaving the conversation stops its voice.
  useEffect(() => () => hush(), [hush]);

  const stop = useCallback(() => {
    const k = myteSpeaker().getSnapshot().key;
    if (k?.startsWith(KEY)) hush();
  }, [hush]);

  const speak = useCallback(
    (key: string, text: string) => {
      if (!text.trim()) return;
      void say({ key: `${KEY}${key}`, text, speed });
    },
    [say, speed],
  );

  return { supported: true, speakingKey, speak, stop, failed };
}

type Dictation = { mic: Mic | null; take: Take | null; stopping: boolean; timer: number; ctrl: AbortController };

export function useSpeechInput(onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const cb = useRef(onText);
  cb.current = onText;
  const session = useRef<Dictation | null>(null);

  useEffect(() => {
    setSupported(browserCanRecord());
    return () => {
      const s = session.current;
      session.current = null;
      if (s) {
        window.clearInterval(s.timer);
        s.ctrl.abort();
        s.take?.discard();
        s.mic?.close();
      }
    };
  }, []);

  const finish = useCallback(async (send: boolean) => {
    const s = session.current;
    if (!s || s.stopping) return;
    s.stopping = true;
    window.clearInterval(s.timer);
    setListening(false);
    // Still opening the microphone: `start` stops it as soon as it opens.
    if (!s.take || !s.mic) return;
    let clip: Blob | null = null;
    if (send) clip = await s.take.stop();
    else s.take.discard();
    s.mic.close();
    if (!clip || !clip.size) {
      if (session.current === s) session.current = null;
      if (send) setNote("I didn't hear anything. Press the mic and try again.");
      return;
    }
    setBusy(true);
    const res = await transcribe(clip, { language: document.documentElement.lang, signal: s.ctrl.signal });
    if (session.current !== s) return;
    session.current = null;
    setBusy(false);
    if (res.ok) {
      if (res.text) cb.current(res.text, true);
      else setNote("I didn't catch that. Press the mic and try again.");
    } else if (res.reason !== "aborted") setNote(listenFailureNote(res.reason));
  }, []);

  const begin = useCallback(async () => {
    if (session.current) return;
    setNote(null);
    const s: Dictation = { mic: null, take: null, stopping: false, timer: 0, ctrl: new AbortController() };
    session.current = s;
    setListening(true);
    let mic: Mic;
    try {
      mic = await openMic();
    } catch (err) {
      if (session.current === s) session.current = null;
      setListening(false);
      setNote(micErrorNote(err instanceof MicError ? err.kind : null).replace(/,? then press Resume\.$/, "."));
      return;
    }
    if (session.current !== s) {
      mic.close();
      return;
    }
    s.mic = mic;
    s.take = mic.take();
    if (s.stopping) {
      // Let go before the microphone opened: nothing was said yet.
      s.take.discard();
      mic.close();
      session.current = null;
      return;
    }
    const vad = createVad({ silenceMs: DICTATE_SILENCE_MS, maxMs: DICTATE_MAX_MS });
    const began = Date.now();
    vad.reset(began);
    let heard = false;
    s.timer = window.setInterval(() => {
      const now = Date.now();
      const ev = vad.push(mic.level(), now);
      if (ev === "start") heard = true;
      if (ev === "end" || ev === "cap") void finish(true);
      else if (!heard && !vad.speaking && now - began > DICTATE_NOTHING_MS) void finish(true);
    }, 50);
  }, [finish]);

  const start = useCallback(() => void begin(), [begin]);
  const stop = useCallback(() => void finish(true), [finish]);

  return { supported, listening, busy, note, start, stop };
}

/** Whether voice mode (ADR-0049 F6) can run here: the browser can record the microphone (the
    words are heard by the server). False on the server and until mounted, so the Talk button
    never flashes in where it can't work. */
export function useCanTalk(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => setCan(browserCanRecord()), []);
  return can;
}
