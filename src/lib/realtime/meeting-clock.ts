/**
 * The meeting's own clock (polish program, Phase 0). The stage clock used to count from when YOU
 * opened the room, so two people in one meeting saw two different times. It now counts from
 * `meeting_rooms.started_at`, which meeting-service stamps once, when the first person is let into
 * the call; every client shows the same time. Until that is known it counts from this tab's join
 * and says so.
 *
 * Pure.
 */

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Whole seconds since `startIso`, never negative (a slightly fast server clock reads 0). */
export function elapsedSeconds(startIso: string | null | undefined, nowMs: number): number | null {
  if (!startIso) return null;
  const start = Date.parse(startIso);
  if (!Number.isFinite(start)) return null;
  return Math.max(0, Math.floor((nowMs - start) / 1000));
}

/** h:mm:ss under ten hours as 00:00:00, the stage pill's form. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** m:ss (or h:mm:ss), the form the Activity feed and the transcript use. */
export function formatOffset(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** A screen-reader phrase: "12 minutes in", "1 hour 4 minutes in". */
export function spokenElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 1) return "just started";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  const parts = [h > 0 ? `${h} hour${h === 1 ? "" : "s"}` : null, rest > 0 ? `${rest} minute${rest === 1 ? "" : "s"}` : null];
  return `${parts.filter(Boolean).join(" ")} in`;
}
