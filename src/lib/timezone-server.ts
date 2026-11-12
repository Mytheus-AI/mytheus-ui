import { cookies } from "next/headers";
import { FALLBACK_TZ, TZ_COOKIE, validTimeZone } from "@/lib/timezone";

/** The signed-in viewer's IANA zone for server rendering (see `timezone.ts`). */
export function viewerTimeZone(): string {
  try {
    return validTimeZone(cookies().get(TZ_COOKIE)?.value) ?? FALLBACK_TZ;
  } catch {
    // Outside a request (build-time rendering): no cookie to read.
    return FALLBACK_TZ;
  }
}

/** An en-US formatter in the viewer's zone. Call it inside a request (a server component or
 *  action), never at module scope: the zone is per viewer. */
export function zonedFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: viewerTimeZone() });
}
