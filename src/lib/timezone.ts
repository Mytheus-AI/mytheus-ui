/* The viewer's time zone, shared by the server and the browser.

   Server components run on a host whose clock is UTC, so a formatter without `timeZone` shows a
   meeting booked for 11 PM in Kolkata as 5:30 PM. The browser records its own IANA zone in the
   `mytheus_tz` cookie (`TimeZoneSync`, mounted in the app layout), and server code reads it with
   `viewerTimeZone()` in `timezone-server.ts`. Both sides format with the same zone, so the first
   render is already right and hydration agrees. */

export const TZ_COOKIE = "mytheus_tz";

/** The zone when nothing better is known (first visit, before the cookie exists). */
export const FALLBACK_TZ = "UTC";

/** `value` if it is a zone this runtime's Intl accepts, otherwise null. */
export function validTimeZone(value: string | null | undefined): string | null {
  if (!value || value.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

/** The browser's own zone (client only). */
export function browserTimeZone(): string {
  try {
    return validTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? FALLBACK_TZ;
  } catch {
    return FALLBACK_TZ;
  }
}
