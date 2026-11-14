"use server";

import { revalidatePath } from "next/cache";
import { ApiError, api } from "@/lib/api/client";
import { fetchListeningPreferences } from "@/lib/api/listening";
import { fetchMyProfile } from "@/lib/api/profile";
import { saveListeningPreferences } from "@/app/actions/listening";
import { ZONES } from "@/lib/ops-zones";
import { countryName, subdivisionsOf, type Place } from "@/lib/places";
import { validTimeZone } from "@/lib/timezone";
import { canonicalZone } from "@/lib/zone-aliases";

/* Where a member works (users.country, users.subdivision) and their time zone
   (listening_preferences.time_zone), read and saved together for the location prompt and the
   Location card in Settings > Profile. The country list and the country guessed from the
   browser's zone come from the IANA zone table, which stays on the server. */

export type LocationState = {
  country: string | null;
  subdivision: string | null;
  /** The saved time zone; UTC is also the default, so it usually means "never set". */
  savedZone: string | null;
  /** The country the browser's zone is in, to pre-select. */
  suggestedCountry: string | null;
  countries: Place[];
};

let COUNTRIES: Place[] | null = null;
function countries(): Place[] {
  COUNTRIES ??= Array.from(new Set(Object.values(ZONES).map((z) => z[2])))
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return COUNTRIES;
}

export async function locationState(browserZone: string | null): Promise<LocationState | null> {
  const [me, prefs] = await Promise.all([fetchMyProfile(), fetchListeningPreferences()]);
  if (!me) return null;
  const zone = browserZone ? ZONES[canonicalZone(browserZone)] : undefined;
  return {
    country: me.country,
    subdivision: me.subdivision,
    savedZone: prefs.ok ? prefs.data.time_zone : null,
    suggestedCountry: zone ? zone[2] : null,
    countries: countries(),
  };
}

export type SaveLocation = { ok: true } | { ok: false; message: string };

/**
 * Save where the caller works and, when their saved zone is still the UTC default, the browser's
 * time zone too, so one click settles both. The location is self only (the API refuses anyone
 * else); a state is kept only when it belongs to the chosen country's list.
 */
export async function saveLocation(input: { country: string; subdivision: string | null; timeZone: string | null }): Promise<SaveLocation> {
  const country = (input.country || "").toUpperCase();
  if (!countries().some((c) => c.code === country)) return { ok: false, message: "Choose your country." };
  const states = subdivisionsOf(country);
  const subdivision = input.subdivision && states.some((s) => s.code === input.subdivision) ? input.subdivision : null;
  if (states.length > 0 && !subdivision) return { ok: false, message: "Choose your state." };

  const me = await fetchMyProfile();
  if (!me) return { ok: false, message: "Your profile could not be found just now. Try again in a moment." };
  try {
    await api(`/users/${me.id}`, { method: "PATCH", body: { country, subdivision } });
  } catch (err) {
    if (err instanceof ApiError && err.isAuthFailure) return { ok: false, message: "Your session ended. Sign in again, then save." };
    return { ok: false, message: "Your location could not be saved just now. Try again in a moment." };
  }

  // The time zone, only over the default: a zone someone chose on purpose is theirs.
  const zone = input.timeZone ? validTimeZone(canonicalZone(input.timeZone)) : null;
  if (zone && zone !== "UTC") {
    const prefs = await fetchListeningPreferences();
    if (prefs.ok && (prefs.data.time_zone === "UTC" || prefs.data.time_zone === "Etc/UTC")) {
      // Best effort: the location is saved either way, and Settings > Listening can set the zone.
      await saveListeningPreferences({ ...prefs.data, time_zone: zone }).catch(() => null);
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
