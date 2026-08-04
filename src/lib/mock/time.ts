"use client";

import { useEffect, useState } from "react";

/* Every date in the landing demos is derived from "now", never baked in.
   The demos read as a meeting happening right this minute, so a hard-coded
   "August 12" launch goes stale the moment the month turns — and reads as
   plainly wrong once that date is in the past.

   Hydration: the landing page is statically prerendered, so a module-scope
   `new Date()` would bake the BUILD date into the served HTML and mismatch
   the browser's render. `useLandingTime` renders a fixed reference on the
   server pass and swaps the real value in on mount. Every consumer keeps
   its dates off-screen at first paint (LiveCapture starts at step 0,
   Statement's answer card and Steps' Remember stage are both still
   off-scene), so the swap is never visible. */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function addMonths(d: Date, n: number) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

/** Sat/Sun → the following Monday. Demo launches and meetings sit on weekdays. */
function weekday(d: Date) {
  const day = d.getDay();
  if (day === 6) return addDays(d, 2);
  if (day === 0) return addDays(d, 1);
  return d;
}

const long = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
const short = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

export type LandingTime = {
  /** the launch date the room is locking, about a week out — "August 12" */
  launchLong: string;
  /** the same date, short — "Aug 12" */
  launchShort: string;
  /** the same date, as it is spoken aloud — "12th" */
  launchOrdinal: string;
  /** where the launch lands once QA needs its two extra days — "August 14" */
  movedLong: string;
  /** when the previous quarter's planning call happened — "Apr 6" */
  prevPlanningDate: string;
  /** when this quarter's planning call happened — "Jul 6" */
  thisPlanningDate: string;
};

export function landingTime(now: Date): LandingTime {
  const launch = weekday(addDays(now, 8));
  const moved = weekday(addDays(launch, 2));

  return {
    launchLong: long(launch),
    launchShort: short(launch),
    launchOrdinal: ordinal(launch.getDate()),
    movedLong: long(moved),
    prevPlanningDate: short(weekday(addMonths(now, -4))),
    thisPlanningDate: short(weekday(addMonths(now, -1))),
  };
}

/* Any fixed date. This value is never user-visible — see the hydration note. */
const SSR_REFERENCE = new Date(2026, 0, 5);

export function useLandingTime(): LandingTime {
  const [t, setT] = useState(() => landingTime(SSR_REFERENCE));
  useEffect(() => setT(landingTime(new Date())), []);
  return t;
}
