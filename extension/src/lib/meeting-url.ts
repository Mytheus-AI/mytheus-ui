/**
 * Which tabs hold a meeting Mytheus Capture can record, and what to call it.
 *
 * Pure and dependency-free so `node --test` covers it. The background worker, the popup and
 * the content script all decide "is this a meeting tab" through `detectMeeting`, so the three
 * can never disagree.
 *
 * - Google Meet: `meet.google.com/abc-defg-hij`, or `meet.google.com/meet/abc-defg-hij` when several
 *   Google accounts are signed in (`?authuser=3`). The landing page and `/new` are not calls.
 * - Microsoft Teams (web): `teams.microsoft.com`, `teams.live.com` and the newer
 *   `teams.cloud.microsoft`. Teams runs calls inside its single-page app without a call URL, so
 *   any Teams page is offered; `inCall` is true only when the URL shows a meeting join.
 * - Zoom web client: `app.zoom.us/wc/...` and company vanity hosts (`acme.zoom.us/wc/...`).
 */

export type MeetingSource = "meet" | "teams" | "zoom";

export interface DetectedMeeting {
  source: MeetingSource;
  /** Product name for people: "Google Meet", "Microsoft Teams", "Zoom". */
  label: string;
  /** True when the URL itself shows a call is open (false for a Teams page we cannot tell). */
  inCall: boolean;
  /** The meeting code or number when the URL carries one ("abc-defg-hij", "84512345678"). */
  code: string | null;
}

export const SOURCE_LABELS: Record<MeetingSource, string> = {
  meet: "Google Meet",
  teams: "Microsoft Teams",
  zoom: "Zoom",
};

const MEET_CODE = /^\/(?:_?meet\/)?([a-z]{3}-[a-z]{4}-[a-z]{3})(?:\/|$)/;
const ZOOM_WC = /^\/wc\/(?:join\/)?(\d{9,12})(?:\/|$)/;
const TEAMS_HOSTS = new Set(["teams.microsoft.com", "teams.live.com", "teams.cloud.microsoft"]);

function parse(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

export function detectMeeting(url: string | undefined | null): DetectedMeeting | null {
  if (!url) return null;
  const u = parse(url);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  const path = u.pathname;

  if (host === "meet.google.com") {
    const m = MEET_CODE.exec(path);
    return m ? { source: "meet", label: SOURCE_LABELS.meet, inCall: true, code: m[1] } : null;
  }

  if (TEAMS_HOSTS.has(host)) {
    const joining = /meetup-join|\/meet\/|\/l\/meet/i.test(path + u.hash);
    return { source: "teams", label: SOURCE_LABELS.teams, inCall: joining, code: null };
  }

  if (host === "zoom.us" || host.endsWith(".zoom.us")) {
    if (!path.startsWith("/wc/")) return null;
    const m = ZOOM_WC.exec(path);
    return { source: "zoom", label: SOURCE_LABELS.zoom, inCall: true, code: m ? m[1] : null };
  }

  return null;
}

const TITLE_NOISE: RegExp[] = [
  /^meet\s*[-:|]\s*/i,
  /\s*[-|]\s*google meet$/i,
  /\s*\|\s*microsoft teams$/i,
  /^microsoft teams\s*[-|]?\s*/i,
  /\s*[-|]\s*zoom$/i,
  /^zoom\s*(meeting)?\s*[-|]?\s*/i,
  /^\(\d+\)\s*/, // unread counters such as "(3) Chat | Microsoft Teams"
];

const GENERIC_TITLES = new Set([
  "",
  "meet",
  "google meet",
  "microsoft teams",
  "teams",
  "zoom",
  "zoom meeting",
  "meeting",
  "chat",
  "calendar",
  "activity",
]);

/**
 * A meeting title from the tab title, or "" when the tab only shows the product name or the
 * meeting code (the user then names the call in the popup).
 */
export function titleFromTab(tabTitle: string | undefined | null, meeting: DetectedMeeting): string {
  let title = (tabTitle ?? "").replace(/\s+/g, " ").trim();
  for (let pass = 0; pass < 2; pass++) {
    for (const pattern of TITLE_NOISE) title = title.replace(pattern, "").trim();
  }
  if (meeting.code && title.toLowerCase() === meeting.code.toLowerCase()) return "";
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(title) || /^\d{9,12}$/.test(title)) return "";
  if (GENERIC_TITLES.has(title.toLowerCase())) return "";
  return title.slice(0, 120);
}

/** A browser tab as far as choosing the meeting tab needs it (a subset of `chrome.tabs.Tab`). */
export interface TabCandidate {
  id?: number;
  url?: string;
  title?: string;
  active?: boolean;
  audible?: boolean;
  /** True for the active tab of the last-focused normal browser window. */
  focused?: boolean;
}

/**
 * The tab the popup should capture. The popup used to read "the active tab of the current
 * window", which is the popup itself whenever the browser shows the action popup as its own
 * window (some Chromium browsers do), so a live call read as "Open a call to capture it".
 * Preference, among tabs that hold a meeting: the focused window's active tab, then any active
 * tab, then one playing sound, then the first. Null when no tab holds a meeting.
 */
export function pickMeetingTab<T extends TabCandidate>(tabs: readonly T[]): T | null {
  const meetings = tabs.filter((t) => detectMeeting(t.url) !== null);
  return (
    meetings.find((t) => t.focused) ??
    meetings.find((t) => t.active) ??
    meetings.find((t) => t.audible) ??
    meetings[0] ??
    null
  );
}

/** Match patterns for the meeting hosts, for `chrome.tabs.query({ url })`. Kept in step with the
 * manifest's content-script matches in `scripts/build.mjs`. */
export const MEETING_URL_PATTERNS: string[] = [
  "https://meet.google.com/*",
  "https://teams.microsoft.com/*",
  "https://teams.live.com/*",
  "https://teams.cloud.microsoft/*",
  "https://*.zoom.us/wc/*",
];
