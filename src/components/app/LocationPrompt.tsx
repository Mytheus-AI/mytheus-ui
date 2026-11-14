"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { GlobeHemisphereEast, X } from "@phosphor-icons/react";
import { locationState, saveLocation, type LocationState } from "@/app/actions/location";
import { Button } from "@/components/ui/Button";
import { LocationFields } from "@/components/app/LocationFields";
import { browserTimeZone } from "@/lib/timezone";
import { subdivisionsOf } from "@/lib/places";
import { canonicalZone } from "@/lib/zone-aliases";

/* "Where do you work?": a small card at the foot of the app for a member who has not said which
   country and state they work in, or whose saved time zone is still the UTC default while the
   browser says otherwise. One Save stores the country and state on their profile and, over the
   default, this browser's time zone, so quiet hours, the evening digest and the ops console's map
   of where members are all line up.

   - Shown after the page renders (a server action, never in the render path).
   - The X hides it for this sign-in: the dismissal is keyed to the Clerk session, so it comes back
     on the next sign-in until it is answered.
   - Hidden on Settings > Profile and Settings > Listening, where the same things are set; checked
     again on leaving them. */

const KEY = "mx-location-prompt-dismissed:";
const QUIET = ["/settings/profile", "/settings/listening"];

function dismissed(sessionId: string): boolean {
  try {
    return window.localStorage.getItem(KEY + sessionId) === "1";
  } catch {
    return false;
  }
}

const isUtc = (z: string | null) => z === "UTC" || z === "Etc/UTC";

export function LocationPrompt() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { sessionId, isSignedIn } = useAuth();
  const [state, setState] = useState<LocationState | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [subdivision, setSubdivision] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  // Check on the first page, and again on leaving a settings page where this is answered.
  const checkedAt = useRef<string | null>(null);

  useEffect(() => {
    if (QUIET.some((q) => pathname.startsWith(q))) {
      setOpen(false);
      checkedAt.current = "quiet";
      return;
    }
    if (!isSignedIn || !sessionId || dismissed(sessionId)) return;
    if (checkedAt.current !== null && checkedAt.current !== "quiet") return;
    checkedAt.current = pathname;
    const mine = browserTimeZone();
    let live = true;
    locationState(mine)
      .then((s) => {
        if (!live || !s) return;
        const needZone = isUtc(s.savedZone) && !isUtc(mine);
        setState(s);
        setZone(needZone ? canonicalZone(mine) : null);
        setCountry(s.country ?? s.suggestedCountry);
        setSubdivision(s.subdivision);
        setOpen(!s.country || needZone);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pathname, sessionId, isSignedIn]);

  if (!open || !state) return null;

  const needCountry = !state.country;
  const close = () => {
    setOpen(false);
    try {
      if (sessionId) window.localStorage.setItem(KEY + sessionId, "1");
    } catch {
      // Storage blocked: it simply comes back on the next page load.
    }
  };
  const save = async () => {
    if (!country) return setError("Choose your country.");
    if (subdivisionsOf(country).length && !subdivision) return setError("Choose your state.");
    setSaving(true);
    setError(null);
    const res = await saveLocation({ country, subdivision, timeZone: zone });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    setOpen(false);
    router.refresh();
  };

  return (
    <div role="region" aria-labelledby="where-you-work" className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-[560px] sm:bottom-6">
      <div className="rounded-card border border-line bg-surface p-4 shadow-warm-3 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-signal-soft text-signal-ink" aria-hidden>
            <GlobeHemisphereEast size={20} weight="fill" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="where-you-work" className="text-[16px] font-semibold text-ink">
              {needCountry ? "Where do you work?" : "Please save your time zone"}
            </h2>
            <p className="mt-0.5 text-[13.5px] leading-snug text-ink-3">
              {needCountry
                ? "Your country and state, so your team's map is right."
                : "Your Myte still reads your day in UTC, so quiet hours and your digest are off."}
              {zone ? (
                <>
                  {" "}
                  Saving also sets your time zone to <span className="font-semibold text-ink-2">{zone.replace(/_/g, " ")}</span>, from this browser.
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss until next sign-in"
            className="-mr-1.5 -mt-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors duration-150 hover:bg-bg-2 hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {needCountry ? (
          <div className="mt-4">
            <LocationFields
              idPrefix="prompt-location"
              countries={state.countries}
              country={country}
              subdivision={subdivision}
              onChange={(c, s) => {
                setCountry(c);
                setSubdivision(s);
                setError(null);
              }}
              disabled={saving}
            />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving" : needCountry ? "Save" : "Save time zone"}
          </Button>
          {error ? (
            <p role="alert" className="text-[13px] text-priority-high">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
