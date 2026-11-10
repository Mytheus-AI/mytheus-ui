/**
 * The command palette's search: rank screens, actions, meetings, people, decisions and recent
 * items against what was typed. Pure, so the ranking is tested under `node --test`.
 *
 * Scoring, highest first: the whole label; the label's start; a word's start; every typed word
 * starting a word of the label; the label containing the text; every typed word somewhere in the
 * label or keywords; the letters in order (a loose match, only for two letters or more). Within a
 * group, ties go to the most recent item, then alphabetical. With nothing typed the palette shows
 * recent items, the actions and the screens, in that order.
 */

export type PaletteGroup = "recent" | "actions" | "meetings" | "people" | "decisions" | "pages";

export type PaletteEntry = {
  key: string;
  group: PaletteGroup;
  label: string;
  /** a quiet second line or trailing note ("Tomorrow, 10:00", "Raj's team") */
  hint?: string;
  href?: string;
  /** a client action instead of a link ("theme") */
  action?: string;
  /** extra words that match but are not shown */
  keywords?: string;
  /** ISO time used to break ties (newest first) */
  at?: string;
  /** an icon name the palette maps to a glyph */
  icon?: string;
};

export type RankedGroup = { group: PaletteGroup; entries: PaletteEntry[] };

export const GROUP_ORDER: PaletteGroup[] = ["recent", "actions", "meetings", "people", "decisions", "pages"];
export const GROUP_LABEL: Record<PaletteGroup, string> = {
  recent: "Recent",
  actions: "Actions",
  meetings: "Meetings",
  people: "People",
  decisions: "Decisions",
  pages: "Go to",
};

export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i += 1;
  return i === needle.length;
}

/** 0 means no match. */
export function scoreEntry(query: string, entry: PaletteEntry): number {
  const q = normalize(query);
  if (!q) return 1;
  const label = normalize(entry.label);
  const words = label.split(" ");
  const tokens = q.split(" ");
  const extra = `${label} ${normalize(entry.keywords ?? "")} ${normalize(entry.hint ?? "")}`;

  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (words.some((w) => w.startsWith(q))) return 60;
  if (tokens.every((t) => words.some((w) => w.startsWith(t)))) return 50;
  if (label.includes(q)) return 40;
  if (tokens.every((t) => extra.includes(t))) return 25;
  const compact = q.replace(/ /g, "");
  if (compact.length >= 2 && isSubsequence(compact, label.replace(/ /g, ""))) return 10;
  return 0;
}

function time(iso?: string): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Rank and group. `limit` caps each group (screens and actions are never long; meetings, people
 * and decisions can be). With an empty query only recent, actions and pages are shown.
 */
export function searchPalette(query: string, entries: readonly PaletteEntry[], limit = 6): RankedGroup[] {
  const empty = normalize(query) === "";
  const byGroup = new Map<PaletteGroup, { e: PaletteEntry; s: number }[]>();
  const seenHref = new Set<string>();
  for (const e of entries) {
    if (empty && !["recent", "actions", "pages"].includes(e.group)) continue;
    const s = scoreEntry(query, e);
    if (s <= 0) continue;
    const list = byGroup.get(e.group) ?? [];
    list.push({ e, s });
    byGroup.set(e.group, list);
  }
  const groups: { group: PaletteGroup; best: number; entries: PaletteEntry[] }[] = [];
  for (const group of GROUP_ORDER) {
    const list = byGroup.get(group);
    if (!list?.length) continue;
    list.sort((a, b) => b.s - a.s || time(b.e.at) - time(a.e.at) || a.e.label.localeCompare(b.e.label));
    // A recent item already listed under its own group with a query is not shown twice.
    const kept: PaletteEntry[] = [];
    for (const { e } of list) {
      const id = e.href ?? e.action ?? e.key;
      if (seenHref.has(id)) continue;
      seenHref.add(id);
      kept.push(e);
      if (kept.length >= limit) break;
    }
    if (kept.length) groups.push({ group, best: list[0].s, entries: kept });
  }
  if (!empty) groups.sort((a, b) => b.best - a.best || GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  return groups.map(({ group, entries: es }) => ({ group, entries: es }));
}

/* ---------------- recent items ---------------- */

export type RecentItem = { label: string; href: string; hint?: string; icon?: string };

/** Put `item` first, drop an older copy of the same link, keep at most `max`. */
export function pushRecent(list: readonly RecentItem[], item: RecentItem, max = 6): RecentItem[] {
  return [item, ...list.filter((r) => r.href !== item.href)].slice(0, max);
}

export function recentEntries(list: readonly RecentItem[]): PaletteEntry[] {
  return list.map((r) => ({ key: `recent:${r.href}`, group: "recent", label: r.label, hint: r.hint, href: r.href, icon: r.icon ?? "clock" }));
}
