/* The topbar breadcrumb's steps, from the path alone. Only detail pages have one; a top-level
   page returns null and the topbar shows no title. The last step's label is the page's own
   (`<Crumb>`) when it gave one, else a plain noun. A meeting's pages also get the meeting's title
   for its step from `parent` (the meeting layout's `<Crumb level="parent">`), so the trail reads
   Meetings, Weekly sync, Transcript. Pure, so it is tested. */

export type CrumbStep = { label: string; href?: string };

const ID = "[^/]+";

export function breadcrumbFor(pathname: string | null, current: string | null = null, parent: string | null = null): CrumbStep[] | null {
  if (!pathname) return null;
  const p = pathname.replace(/\/+$/, "");
  let m: RegExpMatchArray | null;
  const meetings: CrumbStep = { label: "Meetings", href: "/meetings" };

  if ((m = p.match(new RegExp(`^/meetings/(${ID})/decisions/${ID}$`))))
    return [meetings, { label: parent || "Meeting", href: `/meetings/${m[1]}` }, { label: current || "Decision" }];
  if ((m = p.match(new RegExp(`^/meetings/(${ID})/(transcript|catch-up|collaborations|record)$`)))) {
    const leaf = { transcript: "Transcript", "catch-up": "Catch-up", collaborations: "Agent collaboration", record: "What is recorded" }[m[2] as "transcript"];
    return [meetings, { label: parent || "Meeting", href: `/meetings/${m[1]}` }, { label: current || leaf }];
  }
  if (new RegExp(`^/meetings/(?!new$)${ID}$`).test(p)) return [meetings, { label: current || parent || "Meeting" }];
  if (new RegExp(`^/people/${ID}$`).test(p)) return [{ label: "People", href: "/people" }, { label: current || "Person" }];
  if (new RegExp(`^/settings/integrations/callback/${ID}$`).test(p))
    return [{ label: "Integrations", href: "/settings/integrations" }, { label: current || "Connecting" }];
  return null;
}
