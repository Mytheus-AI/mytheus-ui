"use server";

import { fetchListeningPreferences } from "@/lib/api/listening";

/**
 * The time zone the signed-in member saved (`listening_preferences.time_zone`), for the
 * save-your-time-zone prompt. `UTC` is also the column's default, so it usually means "never set".
 * Null when it cannot be read: the prompt then stays hidden rather than nag on a guess.
 */
export async function savedTimeZone(): Promise<string | null> {
  const res = await fetchListeningPreferences();
  return res.ok && typeof res.data.time_zone === "string" ? res.data.time_zone : null;
}
