"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { failureNote } from "@/lib/voice/catalog";
import { myteSpeaker, useMyteSpeaker, useVoiceSpeed } from "@/lib/voice/myte-voice";

const KEY = "ask:";

/* Voice for Ask Myte, both ways.

   - `useMyteVoice`: read an answer aloud in the Myte's own voice (ADR-0050: the self-hosted
     Kokoro voice through the shared speaker, the same voice its briefings use). Markdown and
     citation markers are left out of what it says. When the voice is unavailable, `failed` names
     the answer and a quiet note; the text stays and no other voice is used.
   - `useSpeechInput`: dictate a question (Web Speech API recognition). `supported` is false where
     the browser has none, and the mic button is then not shown at all. */

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
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

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

export function useSpeechInput(onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => {
    setSupported(recognitionCtor() !== null);
    return () => rec.current?.abort();
  }, []);

  const start = useCallback(() => {
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
      cb.current((finalText + interim).trim(), interim === "");
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
    };
    r.onerror = () => {
      rec.current = null;
      setListening(false);
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      rec.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  return { supported, listening, start, stop };
}

/** Whether voice mode (ADR-0049 F6) can run here: the browser has speech recognition. False on
    the server and until mounted, so the Talk button never flashes in where it can't work. */
export function useCanTalk(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => setCan(recognitionCtor() !== null), []);
  return can;
}
