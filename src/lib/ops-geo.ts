import { ZONE_ALIASES, ZONES } from "./ops-zones.ts";

/* Where members are, from the time zone each one saved. Server-side only in practice (the zone
   table is about 19 KB and never needs to reach the browser): the overview groups zones into
   countries here and hands the client a handful of places.

   A zone is placed at its principal city from the IANA database (Asia/Kolkata at Kolkata), and a
   country's hub sits at the city of its most common zone. UTC is also the column's default, so
   UTC and its aliases count as "not set", together with members who have no saved preferences at
   all. Nothing finer than a time zone is known, and nothing here claims more. */

export interface MemberPlace {
  key: string;
  label: string;
  short: string;
  lon: number;
  lat: number;
  count: number;
  zones: string[];
}

const NOT_SET = new Set(["UTC", "Etc/UTC", "Etc/UCT", "UCT", "GMT", "Etc/GMT", "Etc/Universal", "Universal", "Zulu", "Etc/Zulu"]);

let names: Intl.DisplayNames | null = null;
function countryName(cc: string): string {
  try {
    names ??= new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(cc) ?? cc;
  } catch {
    return cc;
  }
}

export function memberPlaces(
  zones: { time_zone: string; members: number }[],
  totalMembers: number,
): { places: MemberPlace[]; notSet: number; placed: number } {
  const byCountry = new Map<string, { count: number; zones: Map<string, number> }>();
  let counted = 0;
  let notSet = 0;
  for (const z of zones) {
    const n = Number(z.members) || 0;
    counted += n;
    const name = ZONE_ALIASES[z.time_zone] ?? z.time_zone;
    const hit = NOT_SET.has(name) ? undefined : ZONES[name];
    if (!hit) {
      notSet += n;
      continue;
    }
    const c = byCountry.get(hit[2]) ?? { count: 0, zones: new Map<string, number>() };
    c.count += n;
    c.zones.set(name, (c.zones.get(name) ?? 0) + n);
    byCountry.set(hit[2], c);
  }
  // Members with no saved preferences have no row at all.
  notSet += Math.max(0, totalMembers - counted);

  const places = Array.from(byCountry.entries())
    .map(([cc, c]) => {
      const ordered = Array.from(c.zones.entries()).sort((a, b) => b[1] - a[1]);
      const [lat, lon] = ZONES[ordered[0][0]];
      return { key: cc, label: countryName(cc), short: cc, lon, lat, count: c.count, zones: ordered.map(([z]) => z) };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { places, notSet, placed: places.reduce((s, p) => s + p.count, 0) };
}
