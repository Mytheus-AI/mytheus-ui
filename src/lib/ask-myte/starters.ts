/**
 * Ask Myte's starter questions (the approved plan, "/ask, first visit"): six questions built from
 * the person's real week, not a fixed list. Each has a short hint drawn from the same data
 * ("4 tasks", "6 new decisions"), and each falls back to a plain question when its data could
 * not be read, so the empty page always offers six.
 *
 * Plus three page-aware starters for the sheet on a meeting, decision or person page.
 *
 * Pure, tested in tests/ask-myte-starters.test.ts.
 */

import type { AskPage } from "./types.ts";

export interface Starter {
  id: string;
  /** the question as shown and as sent */
  question: string;
  /** a quiet second line ("Tomorrow, 11:00 PM", "4 tasks") */
  hint: string;
}

export interface StarterInput {
  now: Date;
  timeZone: string;
  locale?: string;
  /** the next scheduled or live meeting, or null (none, or unreadable) */
  nextMeeting: { title: string; start: string | null; live?: boolean } | null;
  /** open tasks with their due dates (YYYY-MM-DD or ISO), or null when unreadable */
  openTasks: { due_date?: string | null }[] | null;
  /** open promises due soon, when known */
  openPromises?: number | null;
  /** recent confirmed decisions, newest first, or null when unreadable */
  decisions: { content: string; meeting_title?: string | null; created_at: string }[] | null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "YYYY-MM-DD" for an instant in a zone. */
export function dayIn(at: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/** Monday of the week holding `day` (YYYY-MM-DD), and the Sunday after it. */
export function weekOf(day: string): { start: string; end: string } {
  const d = new Date(`${day}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  const start = new Date(d.getTime() - dow * 86_400_000);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** "Today, 3:00 PM", "Tomorrow, 11:00 PM" or "Thu, 9:30 AM". */
export function whenLabel(startIso: string, now: Date, timeZone: string, locale = "en-US"): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  let time: string;
  let weekday: string;
  try {
    time = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }).format(start);
    weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" }).format(start);
  } catch {
    time = start.toISOString().slice(11, 16);
    weekday = "";
  }
  const today = dayIn(now, timeZone);
  const that = dayIn(start, timeZone);
  const tomorrow = dayIn(new Date(new Date(`${today}T12:00:00Z`).getTime() + 86_400_000), timeZone);
  const day = that === today ? "Today" : that === tomorrow ? "Tomorrow" : weekday;
  return day ? `${day}, ${time}` : time;
}

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.5 ? cut.slice(0, at) : cut).replace(/[,.;:]$/, "")}...`;
}

export function buildStarters(input: StarterInput): Starter[] {
  const { now, timeZone } = input;
  const locale = input.locale ?? "en-US";
  const today = dayIn(now, timeZone);
  const week = weekOf(today);
  const out: Starter[] = [];

  // 1. Prep for the next meeting.
  const next = input.nextMeeting;
  if (next && next.title.trim()) {
    const title = clip(next.title, 48);
    out.push({
      id: "prep",
      question: next.live ? `What should I know for ${title}, which is live now?` : `Prep me for ${title}`,
      hint: next.live ? "Live now" : next.start ? whenLabel(next.start, now, timeZone, locale) : "Next on your calendar",
    });
  } else {
    out.push({ id: "prep", question: "What's on my calendar this week?", hint: "Your schedule" });
  }

  // 2. What I owe this week.
  if (input.openTasks) {
    const due = input.openTasks.filter((t) => {
      const d = t.due_date?.slice(0, 10);
      return !!d && d <= week.end;
    }).length;
    const parts = [plural(due, "task")];
    if (input.openPromises) parts.push(plural(input.openPromises, "promise"));
    out.push({ id: "owe", question: "What do I owe this week?", hint: due || input.openPromises ? parts.join(", ") : "Nothing due yet" });
  } else {
    out.push({ id: "owe", question: "What do I owe this week?", hint: "Tasks and promises" });
  }

  // 3. What changed since Monday.
  if (input.decisions) {
    const since = input.decisions.filter((d) => dayIn(new Date(d.created_at), timeZone) >= week.start).length;
    out.push({
      id: "changed",
      question: "What changed since Monday?",
      hint: since ? `${plural(since, "new decision")}` : "Decisions and meetings",
    });
  } else {
    out.push({ id: "changed", question: "What changed since Monday?", hint: "Decisions and meetings" });
  }

  // 4. Capacity.
  out.push({ id: "capacity", question: "Can I take on a Friday deadline?", hint: "Checks your capacity" });

  // 5. A recent decision's meeting.
  const recent = input.decisions?.find((d) => d.meeting_title?.trim());
  if (recent?.meeting_title) {
    const title = clip(recent.meeting_title, 48);
    const meetings = new Set((input.decisions ?? []).filter((d) => d.meeting_title === recent.meeting_title).map((d) => d.content)).size;
    out.push({ id: "decided", question: `What did we decide in ${title}?`, hint: plural(meetings, "decision") });
  } else {
    out.push({ id: "decided", question: "What have we decided lately?", hint: "Your decision log" });
  }

  // 6. Help.
  out.push({ id: "help", question: "How do I connect Slack?", hint: "Help" });

  return out;
}

/** Three starters for the sheet on a page that is about one thing. */
export function pageStarters(page: AskPage | null): Starter[] {
  if (!page?.kind || !page.id) return [];
  const title = page.title ? clip(page.title, 40) : null;
  switch (page.kind) {
    case "meeting":
      return [
        { id: "m-open", question: "What are the open questions?", hint: "From this meeting" },
        { id: "m-recap", question: "Recap this meeting in five lines", hint: "Decisions and tasks" },
        { id: "m-mine", question: "Is anything from it on me?", hint: "Your tasks and promises" },
      ];
    case "decision":
      return [
        { id: "d-why", question: "Why did we decide this?", hint: "Its reasons and sources" },
        { id: "d-replaces", question: "What did it replace, and what came after?", hint: "Its lineage" },
        { id: "d-conflict", question: "Does anything conflict with it?", hint: "Checks your decisions" },
      ];
    case "person":
      return [
        { id: "p-work", question: title ? `What is ${title} working on?` : "What are they working on?", hint: "Tasks and decisions you can see" },
        { id: "p-owe", question: title ? `What do I owe ${title}?` : "What do I owe them?", hint: "Your promises" },
        { id: "p-last", question: title ? `When did I last meet ${title}, and what came of it?` : "When did we last meet?", hint: "Your meetings" },
      ];
  }
}
