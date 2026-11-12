"use client";

import type { RefObject } from "react";
import { Plush } from "@/components/plush/Plush";
import { PlushLive, type PlushState } from "@/components/plush/PlushLive";

/* An agent's face: its plush felt character (lib/plush.ts), drawn from the agent's existing
   avatar seed. People wear the same kind of character through Avatar and Doodle.

   The name is historical: agents wore glass orbs for a day, and every agent surface already
   renders this component, so it stayed as the one place that picks between the two plush forms:

   - still (the default): a picture from the shared renderer, for the small spots (sidebar, lists,
     chips, pickers).
   - live: PlushLive, its own canvas, for the large spots (the agent page, the briefing player,
     the agent's tile and panel in the meeting room). `state` says what the agent is doing.
     At most four run at once; the rest, and anyone who prefers reduced motion, see the still.

   Either way it fills its parent (the existing round frame) on a transparent background. */

export type OrbState = PlushState;

export function AgentOrb({
  seed,
  mode = "still",
  state = "idle",
  size,
  label,
  className = "",
  followInput,
  celebrate,
  level,
  speaker,
}: {
  seed: string;
  mode?: "live" | "still";
  /** live only: what the agent is doing right now */
  state?: OrbState;
  /** the frame's size in CSS pixels; picks the still's resolution */
  size: number;
  /** accessible name, e.g. "Samar's agent"; omit when a visible name sits beside it */
  label?: string;
  className?: string;
  /** live only: a text field (or an element holding some) whose caret the eyes follow */
  followInput?: RefObject<HTMLElement | null> | string;
  /** live only: change this number to make it celebrate */
  celebrate?: number;
  /** live only: a real audio level, 0..1, or a function that reads one */
  level?: number | null | (() => number | null | undefined);
  /** live only: while listening, the element of whoever is speaking */
  speaker?: RefObject<HTMLElement | null> | string | null;
}) {
  const box = `block h-full w-full ${className}`;
  if (mode === "live") {
    return <PlushLive seed={seed} state={state} size={size} label={label} className={box} followInput={followInput} celebrate={celebrate} level={level} speaker={speaker} />;
  }
  return <Plush seed={seed} size={size} title={label} className={box} />;
}
