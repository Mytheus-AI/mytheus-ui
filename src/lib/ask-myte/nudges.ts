/**
 * Myte reaches out first (ADR-0049 F2): openers built only from what the app already reads (the
 * dashboard's meetings and decisions, your tasks and promises, questions waiting for your Myte,
 * routines that ran). The floating Myte shows the top one as a speech bubble; Home's "Today from
 * Myte" lists up to three. A dismissed nudge stays dismissed for the rest of that day.
 *
 * Order (most useful first): a meeting starting within 15 minutes, a teammate's question waiting,
 * a routine result ready, something overdue, something due today, new decisions since the last
 * visit.
 *
 * Pure, tested in tests/ask-myte-nudges.test.ts.
 */

export type NudgeKind = "meeting" | "peer" | "routine" | "overdue" | "due" | "decisions";

export type NudgeAction = { type: "ask"; question: string } | { type: "open"; href: string; label: string };

export interface Nudge {
  /** stable for the day, so a dismissal sticks: "meeting:<id>", "due:2026-11-14" */
  id: string;
  kind: NudgeKind;
  /** lower is more urgent */
  rank: number;
  /** what the Myte says, first person, short */
  text: string;
  /** the opener's button */
  cta: string;
  action: NudgeAction;
}

export interface NudgeInput {
  now: Date;
  /** the viewer's zone, for "today" */
  timeZone: string;
  meetings?: { id: string; title: string; start: string | null; status?: string | null }[] | null;
  tasks?: { id: string; title: string; due_date: string | null }[] | null;
  promises?: { id: string; title: string; due_at: string | null }[] | null;
  decisions?: { id: string; content: string; created_at: string }[] | null;
  /** ISO of the previous visit to Home or the app (null: first visit, so no "new since") */
  lastVisit?: string | null;
  peerQuestions?: { id: string; from_name: string; question: string }[] | null;
  routinesReady?: { id: string; thread_id: string; words: string; question: string }[] | null;
}

export const SOON_MS = 15 * 60_000;
const RANK: Record<NudgeKind, number> = { meeting: 1, peer: 2, routine: 3, overdue: 4, due: 5, decisions: 6 };

/** YYYY-MM-DD of an instant in a zone. */
export function dayOf(at: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}...`);

export function buildNudges(input: NudgeInput): Nudge[] {
  const out: Nudge[] = [];
  const nowMs = input.now.getTime();
  const today = dayOf(input.now, input.timeZone);

  // A meeting about to start: the one soonest, within 15 minutes, not yet live.
  const soon = (input.meetings ?? [])
    .filter((m) => m.start && m.status !== "live" && m.status !== "past" && m.status !== "ended")
    .map((m) => ({ m, at: Date.parse(m.start as string) }))
    .filter(({ at }) => Number.isFinite(at) && at >= nowMs - 60_000 && at - nowMs <= SOON_MS)
    .sort((a, b) => a.at - b.at)[0];
  if (soon) {
    const mins = Math.max(0, Math.round((soon.at - nowMs) / 60_000));
    const title = soon.m.title || "Your next meeting";
    out.push({
      id: `meeting:${soon.m.id}`,
      kind: "meeting",
      rank: RANK.meeting,
      text: mins <= 1 ? `${title} starts now. Want a 30-second prep?` : `${title} starts in ${mins} minutes. Want a 30-second prep?`,
      cta: "Prep me",
      action: { type: "ask", question: `Give me a 30-second prep for ${title}.` },
    });
  }

  const peers = input.peerQuestions ?? [];
  if (peers.length) {
    const first = peers[0];
    out.push({
      id: `peer:${first.id}`,
      kind: "peer",
      rank: RANK.peer,
      text: peers.length === 1 ? `${first.from_name} asked me something for you: "${clip(first.question, 80)}"` : `${plural(peers.length, "teammate question")} ${peers.length === 1 ? "is" : "are"} waiting for you.`,
      cta: "Review",
      action: { type: "open", href: peers.length === 1 ? `/inbox?peer_question=${first.id}` : "/inbox#peer-questions", label: "Review" },
    });
  }

  for (const r of input.routinesReady ?? []) {
    out.push({
      id: `routine:${r.id}:${r.thread_id}`,
      kind: "routine",
      rank: RANK.routine,
      text: `${r.words}: ${clip(r.question, 80)}`,
      cta: "Read it",
      action: { type: "open", href: `/ask?t=${r.thread_id}`, label: "Read it" },
    });
  }

  type Item = { title: string; day: string };
  const work: Item[] = [
    ...(input.tasks ?? []).filter((t) => t.due_date).map((t) => ({ title: t.title, day: (t.due_date as string).slice(0, 10) })),
    ...(input.promises ?? []).filter((p) => p.due_at).map((p) => ({ title: p.title, day: dayOf(new Date(p.due_at as string), input.timeZone) })),
  ];
  const overdue = work.filter((w) => w.day < today);
  const dueToday = work.filter((w) => w.day === today);
  if (overdue.length) {
    out.push({
      id: `overdue:${today}`,
      kind: "overdue",
      rank: RANK.overdue,
      text: overdue.length === 1 ? `"${clip(overdue[0].title, 60)}" is overdue. Want a plan for it?` : `${plural(overdue.length, "thing")} you owe ${overdue.length === 1 ? "is" : "are"} overdue. Want me to sort them?`,
      cta: "Sort it out",
      action: { type: "ask", question: "What do I owe that is overdue, and what should I do first?" },
    });
  }
  if (dueToday.length) {
    out.push({
      id: `due:${today}`,
      kind: "due",
      rank: RANK.due,
      text: dueToday.length === 1 ? `"${clip(dueToday[0].title, 60)}" is due today.` : `${plural(dueToday.length, "thing")} you owe ${dueToday.length === 1 ? "is" : "are"} due today.`,
      cta: "What's due",
      action: { type: "ask", question: "What is due today, and is anything at risk?" },
    });
  }

  if (input.lastVisit) {
    const since = Date.parse(input.lastVisit);
    const fresh = Number.isFinite(since) ? (input.decisions ?? []).filter((d) => Date.parse(d.created_at) > since) : [];
    if (fresh.length) {
      out.push({
        id: `decisions:${input.lastVisit.slice(0, 16)}`,
        kind: "decisions",
        rank: RANK.decisions,
        text: `${plural(fresh.length, "new decision")} since you were last here.`,
        cta: "Catch me up",
        action: { type: "ask", question: "What was decided since my last visit, and does any of it affect me?" },
      });
    }
  }

  return out.sort((a, b) => a.rank - b.rank);
}

/* ---------------- dismissals (one day) ---------------- */

export type Dismissed = { day: string; ids: string[] };

/** The ids still dismissed today; yesterday's list counts for nothing. */
export function activeDismissals(stored: unknown, today: string): Set<string> {
  if (!stored || typeof stored !== "object") return new Set();
  const d = stored as Partial<Dismissed>;
  if (d.day !== today || !Array.isArray(d.ids)) return new Set();
  return new Set(d.ids.filter((x): x is string => typeof x === "string"));
}

export function dismiss(stored: unknown, today: string, id: string): Dismissed {
  const ids = activeDismissals(stored, today);
  ids.add(id);
  return { day: today, ids: Array.from(ids).slice(-100) };
}

/** The nudges to show: not dismissed today, most useful first, at most `max`. */
export function visibleNudges(all: readonly Nudge[], dismissed: Set<string>, max: number): Nudge[] {
  return all.filter((n) => !dismissed.has(n.id)).slice(0, max);
}
