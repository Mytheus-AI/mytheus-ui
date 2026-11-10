/**
 * Where a captured call came from, and how that is stored without a backend schema change.
 *
 * core-api's meetings have no `source` column yet, so a captured meeting's title carries it as
 * a prefix: "Google Meet: Weekly product sync". `capturedTitle` writes it, `parseCapturedTitle`
 * reads it back for the /capture page. When core-api gains `meetings.source` (proposed in the
 * capture work's report), the route sends the field as well and the prefix can go.
 *
 * Pure and dependency-free: covered by `tests/capture.test.ts` under `node --test`.
 */

export const CAPTURE_SOURCES = ["meet", "teams", "zoom"] as const;
export type CaptureSource = (typeof CAPTURE_SOURCES)[number];

export const CAPTURE_SOURCE_LABELS: Record<CaptureSource, string> = {
  meet: "Google Meet",
  teams: "Microsoft Teams",
  zoom: "Zoom",
};

export const MAX_CAPTURE_TITLE = 120;

export function isCaptureSource(value: unknown): value is CaptureSource {
  return typeof value === "string" && (CAPTURE_SOURCES as readonly string[]).includes(value);
}

/** Printable, single-line, trimmed, at most `MAX_CAPTURE_TITLE` characters. */
/** Control, zero-width and bidirectional-override characters: never part of a title. */
function invisible(code: number): boolean {
  return (
    code < 0x20 ||
    (code >= 0x7f && code <= 0x9f) ||
    (code >= 0x200b && code <= 0x200f) ||
    (code >= 0x2028 && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

export function cleanCaptureTitle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const visible = Array.from(raw, (ch) => (invisible(ch.codePointAt(0) ?? 0) ? " " : ch)).join("");
  return visible.replace(/\s+/g, " ").trim().slice(0, MAX_CAPTURE_TITLE).trim();
}

export function capturedTitle(source: CaptureSource, title: string): string {
  return `${CAPTURE_SOURCE_LABELS[source]}: ${cleanCaptureTitle(title) || "Call"}`;
}

export function parseCapturedTitle(
  title: string | null | undefined,
): { source: CaptureSource; title: string } | null {
  if (!title) return null;
  for (const source of CAPTURE_SOURCES) {
    const prefix = `${CAPTURE_SOURCE_LABELS[source]}: `;
    if (title.startsWith(prefix)) return { source, title: title.slice(prefix.length) || "Call" };
  }
  return null;
}
