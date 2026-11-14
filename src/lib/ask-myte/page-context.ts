/**
 * The page the ⌘J sheet opened on (ADR-0047 D1, D8 `page`): a meeting, a decision or a person,
 * read from the path and the titles the page already handed the topbar breadcrumb (`<Crumb>`).
 * The sheet shows it as a scope chip ("This meeting: Weekly sync") and sends it upstream, so
 * "what are the open questions?" means this meeting.
 *
 * Pure, tested in tests/ask-myte-page-context.test.ts.
 */

import type { AskPage, AskScope } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsePageContext(
  pathname: string | null | undefined,
  crumbs: { label?: string | null; parent?: string | null } = {},
): AskPage | null {
  if (!pathname) return null;
  const parts = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
  const clean = (t: string | null | undefined) => (t && t.trim() ? t.trim().slice(0, 200) : null);

  if (parts[0] === "meetings" && parts[1] && UUID.test(parts[1])) {
    if (parts[2] === "decisions" && parts[3] && UUID.test(parts[3])) {
      return { kind: "decision", id: parts[3], title: clean(crumbs.label) };
    }
    // The meeting's layout names it as the breadcrumb's parent step on every page under it.
    if (parts[2] === "room" || parts[2] === "join") return null;
    return { kind: "meeting", id: parts[1], title: clean(crumbs.parent) };
  }
  if (parts[0] === "people" && parts[1] && UUID.test(parts[1])) {
    return { kind: "person", id: parts[1], title: clean(crumbs.label) };
  }
  return null;
}

/** The scope a page implies: this meeting, this person, or everything (a decision page keeps
    everything in scope and names the decision as the page instead). */
export function scopeForPage(page: AskPage | null): AskScope | null {
  if (!page?.id) return null;
  if (page.kind === "meeting") return { kind: "meeting", meeting_id: page.id, person_id: null, as_of: null, label: page.title };
  if (page.kind === "person") return { kind: "person", meeting_id: null, person_id: page.id, as_of: null, label: page.title };
  return null;
}

/** "This meeting: Weekly sync", "This decision", "Maya Chen". */
export function pageChipLabel(page: AskPage): string {
  const noun = page.kind === "meeting" ? "This meeting" : page.kind === "decision" ? "This decision" : "This person";
  return page.title ? `${noun}: ${page.title}` : noun;
}

/** The words a scope chip shows. */
export function scopeLabel(scope: AskScope, locale = "en-US"): string {
  switch (scope.kind) {
    case "meeting":
      return scope.label ? `Meeting: ${scope.label}` : "A meeting";
    case "person":
      return scope.label ? `Person: ${scope.label}` : "A person";
    case "as_of": {
      if (!scope.as_of) return "As of a date";
      const d = new Date(`${scope.as_of.slice(0, 10)}T12:00:00Z`);
      return Number.isNaN(d.getTime())
        ? "As of a date"
        : `As of ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d)}`;
    }
    default:
      return "All of Mytheus";
  }
}

/** A scope safe to send: ids that are UUIDs, a real date, and nothing the UI added. */
export function cleanScope(scope: AskScope | null | undefined): Omit<AskScope, "label"> {
  const kind = scope?.kind;
  if (kind === "meeting" && scope?.meeting_id && UUID.test(scope.meeting_id)) return { kind, meeting_id: scope.meeting_id, person_id: null, as_of: null };
  if (kind === "person" && scope?.person_id && UUID.test(scope.person_id)) return { kind, meeting_id: null, person_id: scope.person_id, as_of: null };
  if (kind === "as_of" && scope?.as_of && /^\d{4}-\d{2}-\d{2}$/.test(scope.as_of) && !Number.isNaN(Date.parse(scope.as_of)))
    return { kind, meeting_id: null, person_id: null, as_of: scope.as_of };
  return { kind: "all", meeting_id: null, person_id: null, as_of: null };
}

/** A page safe to send. */
export function cleanPage(page: AskPage | null | undefined): AskPage | null {
  if (!page?.kind || !page.id || !UUID.test(page.id)) return null;
  if (page.kind !== "meeting" && page.kind !== "decision" && page.kind !== "person") return null;
  return { kind: page.kind, id: page.id, title: typeof page.title === "string" ? page.title.slice(0, 200) : null };
}
