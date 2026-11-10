"use client";

import { useEffect, useState } from "react";
import { SPEAKING_PAUSE_MS } from "@/lib/realtime/calm";

/* True while you are speaking (LiveKit's local speaking state) and for a short pause after, so a
   suggestion never lands under your eyes mid-sentence (polish program, Phase 1). LiveKit flips
   `isSpeaking` off between words; the pause also smooths that out. */
export function useSpeakingHold(speaking: boolean, pauseMs = SPEAKING_PAUSE_MS): boolean {
  const [holding, setHolding] = useState(speaking);
  useEffect(() => {
    if (speaking) {
      setHolding(true);
      return;
    }
    const id = window.setTimeout(() => setHolding(false), pauseMs);
    return () => window.clearTimeout(id);
  }, [speaking, pauseMs]);
  return holding;
}
