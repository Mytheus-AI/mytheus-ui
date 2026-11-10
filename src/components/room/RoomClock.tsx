"use client";

import { useEffect, useState } from "react";
import { Clock } from "@phosphor-icons/react";

/* The clock pill on the stage: time since you opened the room. Lives in its own component so the
   once-a-second tick re-renders only this label, never the video stage. Starts at zero on both
   server and client so hydration matches. */

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export function RoomClock() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const s = seconds % 60;
  return (
    <div className="timer-pill">
      <Clock size={16} aria-hidden />
      <span role="timer" aria-label="Time in the room">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  );
}
