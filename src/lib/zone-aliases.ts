/* Older IANA zone names that browsers still report (Chromium's ICU says Asia/Calcutta for India),
   mapped to the current name. Small on purpose: client code imports this, never the full zone
   table in ops-zones.ts. */

export const ZONE_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "Asia/Dacca": "Asia/Dhaka",
  "Asia/Thimbu": "Asia/Thimphu",
  "Australia/ACT": "Australia/Sydney",
  "US/Eastern": "America/New_York",
  "US/Central": "America/Chicago",
  "US/Mountain": "America/Denver",
  "US/Pacific": "America/Los_Angeles",
};

/** The current name for a zone: Asia/Calcutta becomes Asia/Kolkata; anything else is unchanged. */
export function canonicalZone(zone: string): string {
  return ZONE_ALIASES[zone] ?? zone;
}
