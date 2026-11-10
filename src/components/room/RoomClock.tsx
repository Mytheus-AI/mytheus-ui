"use client";

import { useEffect, useState } from "react";
import { Clock } from "@phosphor-icons/react";
import { elapsedSeconds, formatClock, spokenElapsed } from "@/lib/realtime/meeting-clock";

/* The clock pill on the stage: the MEETING's time, counted from when the call first opened
   (`meeting_rooms.started_at`, stamped server-side by the first join), so everyone in the meeting
   sees the same time (polish program, Phase 0). Until the server's start is known it counts from
   when you opened the room, and its label says so.

   Its own component so the once-a-second tick re-renders only this label, never the stage. It
   renders nothing until mounted, so the server and the client agree on the first paint. The
   visible digits are hidden from screen readers (a value changing every second is noise); the
   label carries a calm "12 minutes in" instead. */

export function RoomClock({ startedAt }: { startedAt: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  useEffect(() => {
    setOpenedAt(Date.now());
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null || openedAt === null) return <div className="timer-pill" aria-hidden />;
  const meeting = elapsedSeconds(startedAt, now);
  const seconds = meeting ?? Math.max(0, Math.floor((now - openedAt) / 1000));
  const label = meeting === null ? `Time since you joined, ${spokenElapsed(seconds)}` : `Meeting time, ${spokenElapsed(seconds)}`;
  return (
    <div className="timer-pill" role="img" aria-label={label} title={meeting === null ? "Since you joined" : "Meeting time"}>
      <Clock size={16} aria-hidden />
      <span aria-hidden>{formatClock(seconds)}</span>
    </div>
  );
}
