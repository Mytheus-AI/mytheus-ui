"use client";

/**
 * The app's one Myte voice (ADR-0050 D4): the shared speaker, wired to `POST /api/voice/speech`
 * (our route, which forwards to core-api with the session's own token) and to Web Audio, and the
 * hooks components use. Starting to speak anywhere stops whatever was speaking.
 *
 * There is no device-voice fallback anywhere: on a failure the caller shows `failureNote` and the
 * words stay on screen.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createSpeaker, type FetchChunk, type Speaker, type SpeakerSnapshot, type SpeakRequest } from "./speaker";
import { createFillerBank, type FillerBank } from "./filler-bank";
import { createWebAudioOut } from "./web-audio";
import { DEFAULT_SPEED, SPEED_STEPS, nearestStep, SPEED_KEY } from "./speed";

let shared: Speaker | null = null;
let fillers: FillerBank | null = null;

const fetchSpeech: FetchChunk = (body, signal) =>
  fetch("/api/voice/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });

export function myteSpeaker(): Speaker {
  if (shared) return shared;
  shared = createSpeaker({ fetchChunk: fetchSpeech, out: createWebAudioOut });
  return shared;
}

/** Talk mode's fillers ("Got it.") in the person's voice, kept for the visit. */
export function myteFillers(): FillerBank {
  fillers ??= createFillerBank({ fetchChunk: fetchSpeech, decode: (data) => myteSpeaker().decode(data) });
  return fillers;
}

/** The person chose another voice: fillers rendered in the old one are dropped. */
export function forgetFillers(): void {
  fillers?.clear();
}

const SERVER_SNAPSHOT: SpeakerSnapshot = { status: "idle", key: null, error: null, chunk: 0, chunks: 0 };

/** The shared speaker's state, and its controls. */
export function useMyteSpeaker() {
  const snapshot = useSyncExternalStore(
    (fn) => myteSpeaker().subscribe(fn),
    () => myteSpeaker().getSnapshot(),
    () => SERVER_SNAPSHOT,
  );
  const speak = useCallback((req: SpeakRequest) => myteSpeaker().speak(req), []);
  const stop = useCallback((key?: string) => myteSpeaker().stop(key), []);
  const pause = useCallback(() => myteSpeaker().pause(), []);
  const resume = useCallback(() => myteSpeaker().resume(), []);
  const level = useCallback(() => myteSpeaker().level(), []);
  return { snapshot, speak, stop, pause, resume, level };
}

/* ---------------- speed, kept on this device ---------------- */

function readSpeed(): number {
  try {
    const v = Number(window.localStorage.getItem(SPEED_KEY));
    return Number.isFinite(v) && v > 0 ? nearestStep(v) : DEFAULT_SPEED;
  } catch {
    return DEFAULT_SPEED;
  }
}

const speedListeners = new Set<(v: number) => void>();

/** How fast the Myte speaks (0.8 to 1.2), remembered on this device. */
export function useVoiceSpeed(): [number, (v: number) => void] {
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);
  useEffect(() => {
    setSpeedState(readSpeed());
    const onChange = (v: number) => setSpeedState(v);
    const onStorage = (e: StorageEvent) => e.key === SPEED_KEY && setSpeedState(readSpeed());
    speedListeners.add(onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      speedListeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const setSpeed = useCallback((v: number) => {
    const step = nearestStep(v);
    try {
      window.localStorage.setItem(SPEED_KEY, String(step));
    } catch {
      // Private mode: it still applies for this visit.
    }
    myteSpeaker().setSpeed(step);
    speedListeners.forEach((l) => l(step));
  }, []);
  return [speed, setSpeed];
}

export { SPEED_STEPS };
