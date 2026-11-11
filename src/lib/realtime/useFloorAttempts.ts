"use client";

import { useEffect, useRef } from "react";
import { initialFloor, stepFloor, type FloorAttempt, type FloorState } from "./floor-attempt";

/**
 * Runs the floor-attempt state machine (`floor-attempt.ts`) against the room's live signals and
 * hands each attempt to `send` (the gateway's private `floor-attempt`). Steps on every change and on
 * a 250 ms tick (the "still talking 1.2 s later" check needs time to pass). Does nothing until the
 * meeting link is joined.
 */
export function useFloorAttempts({
  enabled,
  micOn,
  speaking,
  otherSpeakerId,
  send,
}: {
  enabled: boolean;
  micOn: boolean;
  speaking: boolean;
  otherSpeakerId: string | null;
  send: (a: FloorAttempt) => void;
}) {
  const state = useRef<FloorState>(initialFloor(micOn));
  const input = useRef({ micOn, speaking, otherSpeakerId });
  input.current = { micOn, speaking, otherSpeakerId };
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (!enabled) return;
    const step = () => {
      const r = stepFloor(state.current, { now: Date.now(), ...input.current });
      state.current = r.state;
      if (r.attempt) sendRef.current(r.attempt);
    };
    step();
    const id = window.setInterval(step, 250);
    return () => window.clearInterval(id);
  }, [enabled, micOn, speaking, otherSpeakerId]);
}
