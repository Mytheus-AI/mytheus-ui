import { mockMeetings, mockSearchIndex, type SearchResult } from "@/lib/mock/data";

/* Search records: the existing search index, joined to its meeting so each result can show a date
   and the people who were in the room. Same data source as before; nothing is invented. */

export type SearchRecord = SearchResult & {
  meetingTitle: string;
  startTime: string | null;
  people: string[];
};

const meetingById = new Map(mockMeetings.map((m) => [m.id, m]));

export const RECORDS: SearchRecord[] = mockSearchIndex.map((r) => {
  const m = meetingById.get(r.meetingId);
  return {
    ...r,
    meetingTitle: m?.title ?? "Meeting",
    startTime: m?.startTime ?? null,
    people: m?.participants ?? [],
  };
});

export const TYPE_LABEL: Record<SearchResult["type"], string> = {
  meeting: "Meeting",
  decision: "Decision",
  action: "Action",
};

export const TYPE_PLURAL: Record<SearchResult["type"], string> = {
  meeting: "Meetings",
  decision: "Decisions",
  action: "Actions",
};

const STOPWORDS = new Set(
  (
    "a an and are as at be but by can could did do does for from had has have how i in is it its " +
    "me my of on or our should so than that the their then there these they this to was we were " +
    "what when where which who why will with would you your about discussed decide decided happened " +
    "tell show find give any all"
  ).split(" "),
);

export function termsOf(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Terms for a natural-language question: drop filler words, lightly stem the rest. */
export function questionTerms(question: string): string[] {
  return termsOf(question.replace(/[^a-z0-9\s%$.~-]/gi, " "))
    .map((t) => t.replace(/^[.\-~]+|[.\-~]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, "") : t));
}

export function haystack(r: SearchRecord): string {
  return `${r.title} ${r.snippet} ${r.meetingTitle} ${r.people.join(" ")} ${TYPE_LABEL[r.type]}`.toLowerCase();
}

/** Rough relevance: title hits weigh most, then repeated body hits, then the meeting name. */
export function score(r: SearchRecord, terms: string[]): number {
  const title = r.title.toLowerCase();
  const text = r.snippet.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (title.includes(t)) s += 3;
    s += Math.min(text.split(t).length - 1, 3);
    if (r.meetingTitle.toLowerCase().includes(t)) s += 1;
  }
  return s;
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatDate(iso: string | null): string | null {
  return iso ? dateFmt.format(new Date(iso)) : null;
}
