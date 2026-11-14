"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickVoice, voiceTone } from "@/lib/briefing";
import { plainText } from "@/lib/ask-myte/reducer";

/* Voice for Ask Myte, both ways, with the browser's own speech engines.

   - `useMyteVoice`: read an answer aloud in the Myte's own voice, the same pick its briefings use
     (`pickVoice` keyed on its seed, `voiceTone` from its personality), so it sounds like itself
     everywhere. Citation markers are left out of what it says.
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

export function useMyteVoice(seed: string, personality: string | null | undefined) {
  const [supported, setSupported] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const voices = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => {
      voices.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingKey(null);
  }, []);

  const speak = useCallback(
    (key: string, text: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const words = plainText(text);
      if (!words) return;
      const language = document.documentElement.lang || navigator.language || "en";
      const voice = pickVoice(voices.current, { language, seed });
      const tone = voiceTone(personality);
      // One utterance per paragraph keeps long answers from being cut off by some engines.
      const parts = words.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
      setSpeakingKey(key);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? language;
        u.rate = tone.rate;
        u.pitch = tone.pitch;
        if (i === parts.length - 1) {
          u.onend = () => setSpeakingKey((k) => (k === key ? null : k));
          u.onerror = () => setSpeakingKey((k) => (k === key ? null : k));
        }
        synth.speak(u);
      });
    },
    [supported, seed, personality],
  );

  return { supported, speakingKey, speak, stop };
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
