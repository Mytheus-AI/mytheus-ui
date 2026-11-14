import { ZONE_ALIASES, ZONES } from "./ops-zones.ts";
import { countryName, subdivisionName } from "./places.ts";

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
  /** Time zones behind a time-zone placement (older services). */
  zones: string[];
  /** States, largest first, when members set them. */
  states?: { name: string; count: number }[];
}

const NOT_SET = new Set(["UTC", "Etc/UTC", "Etc/UCT", "UCT", "GMT", "Etc/GMT", "Etc/Universal", "Universal", "Zulu", "Etc/Zulu"]);

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

/** The middle of a country's time zones (median latitude and longitude), for a country nobody in
    it has saved a zone for. One zone: that zone's city. */
function countryPoint(cc: string): [number, number] | null {
  const pts = Object.values(ZONES).filter((z) => z[2] === cc);
  if (!pts.length) return null;
  const mid = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
  return [mid(pts.map((p) => p[0])), mid(pts.map((p) => p[1]))];
}

/**
 * Members placed by the country and state they set (`member_places`). A country's hub sits at the
 * city of the time zone its members saved most, else in the middle of its zones; its states are
 * listed largest first. Members with no country are "not set", with anyone not counted at all.
 */
export function placesFromCountries(
  rows: { country: string | null; subdivision: string | null; members: number }[],
  zones: { time_zone: string; members: number }[],
  totalMembers: number,
): { places: MemberPlace[]; notSet: number; placed: number } {
  const byZone = new Map<string, { zone: string; n: number }>();
  for (const z of zones) {
    const name = ZONE_ALIASES[z.time_zone] ?? z.time_zone;
    const hit = ZONES[name];
    if (!hit) continue;
    const best = byZone.get(hit[2]);
    if (!best || z.members > best.n) byZone.set(hit[2], { zone: name, n: z.members });
  }
  const byCountry = new Map<string, { count: number; states: Map<string, number> }>();
  let counted = 0;
  let notSet = 0;
  for (const r of rows) {
    const n = Number(r.members) || 0;
    counted += n;
    if (!r.country || !/^[A-Z]{2}$/.test(r.country)) {
      notSet += n;
      continue;
    }
    const c = byCountry.get(r.country) ?? { count: 0, states: new Map<string, number>() };
    c.count += n;
    if (r.subdivision) c.states.set(r.subdivision, (c.states.get(r.subdivision) ?? 0) + n);
    byCountry.set(r.country, c);
  }
  notSet += Math.max(0, totalMembers - counted);

  const places: MemberPlace[] = [];
  Array.from(byCountry.entries()).forEach(([cc, c]) => {
    const fromZone = byZone.get(cc);
    const point = fromZone ? ([ZONES[fromZone.zone][0], ZONES[fromZone.zone][1]] as [number, number]) : countryPoint(cc);
    if (!point) {
      notSet += c.count;
      return;
    }
    places.push({
      key: cc,
      label: countryName(cc),
      short: cc,
      lat: point[0],
      lon: point[1],
      count: c.count,
      zones: [],
      states: Array.from(c.states.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => ({ name: subdivisionName(code) ?? code, count })),
    });
  });
  places.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { places, notSet, placed: places.reduce((s, p) => s + p.count, 0) };
}
