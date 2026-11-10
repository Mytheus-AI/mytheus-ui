"use client";

import { useEffect, useRef, useState } from "react";
import { emptySpotlight, msUntilSwitch, stepSpotlight } from "@/lib/realtime/spotlight";
import type { RoomTile } from "@/components/room/RoomGrid";

/* Who holds the floor, for the spotlight frame: a new speaker must speak for about 1.5 s before
   the frame moves to them (lib/realtime/spotlight.ts). Only other people's cameras count; you are
   never put in your own spotlight. */
export function useSpotlight(tiles: RoomTile[]): string | null {
  const speaking = tiles
    .filter((t) => t.speaking && t.micOn && !t.isLocal && (t.kind ?? "camera") === "camera")
    .map((t) => t.id);
  const key = speaking.join("|");
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const [state, setState] = useState(emptySpotlight);

  useEffect(() => {
    setState((s) => stepSpotlight(s, speakingRef.current, Date.now()));
  }, [key]);

  // A pending speaker takes the floor once they have held it long enough, even if nothing else
  // changes in between.
  useEffect(() => {
    const ms = msUntilSwitch(state, Date.now());
    if (ms === null) return;
    const id = window.setTimeout(() => setState((s) => stepSpotlight(s, speakingRef.current, Date.now())), ms + 20);
    return () => window.clearTimeout(id);
  }, [state]);

  return state.current;
}
