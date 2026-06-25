"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  LiveSimulation — the interactive hero showpiece.                    */
/*                                                                      */
/*  Pick a meeting and watch it run live: participants are present (one  */
/*  is away, with their agent attending in their place), a transcript    */
/*  streams in, and the AI engine synthesizes notes, takeaways, and      */
/*  checkable action items. When a context gap comes up, your agent      */
/*  reaches across meetings to ANOTHER person's agent and a sourced       */
/*  answer arrives. Play/pause, change synthesis speed, tick off actions. */
/* ------------------------------------------------------------------ */

type Synth = {
  kind: "note" | "takeaway" | "action";
  text: string;
  owner?: string;
  conflict?: boolean;
};

type Ev =
  | { t: "say"; who: string; initials: string; text: string; gen?: Synth }
  | { t: "gap"; note: string }
  | { t: "ask"; to: string; toInitials: string; q: string }
  | { t: "reply"; from: string; fromInitials: string; a: string; src: string };

type Person = { name: string; initials: string; role: string; away?: boolean };
type Meeting = { id: string; label: string; people: Person[]; script: Ev[] };

const MEETINGS: Meeting[] = [
  {
    id: "gtm",
    label: "Q3 GTM Sync",
    people: [
      { name: "Marcus", initials: "MA", role: "GTM lead" },
      { name: "Dana", initials: "DK", role: "Sales" },
      { name: "Priya", initials: "PR", role: "Product" },
      { name: "You", initials: "YV", role: "away", away: true },
    ],
    script: [
      { t: "say", who: "Marcus", initials: "MA", text: "Okay, let's lock the Q3 go-to-market plan today.", gen: { kind: "note", text: "Goal: lock the Q3 go-to-market plan." } },
      { t: "say", who: "Dana", initials: "DK", text: "Pipeline's up 20%, but mid-market is just stalling.", gen: { kind: "takeaway", text: "Mid-market pipeline is stalling despite 20% growth." } },
      { t: "say", who: "Priya", initials: "PR", text: "Part of it's ICP — we're targeting way too broad.", gen: { kind: "note", text: "ICP is too broad and needs narrowing." } },
      { t: "say", who: "Marcus", initials: "MA", text: "Wait — what scope did we actually land on for the migration?" },
      { t: "gap", note: "decided in a meeting no one here attended" },
      { t: "ask", to: "Bob's agent", toInitials: "BA", q: "What scope did we land on for the migration?" },
      { t: "reply", from: "Bob's agent", fromInitials: "BA", a: "You cut to the core tables only — decided in the May 12 migration sync.", src: "Migration sync · May 12" },
      { t: "say", who: "Dana", initials: "DK", text: "Right, and that cuts against targeting broad now.", gen: { kind: "takeaway", text: "Conflicts with the May 12 decision to cut scope.", conflict: true } },
      { t: "say", who: "Marcus", initials: "MA", text: "Let's confirm ICP alignment before the build review.", gen: { kind: "action", text: "Confirm ICP alignment before build review", owner: "Priya" } },
      { t: "say", who: "Priya", initials: "PR", text: "I'll re-run the segment analysis with real numbers.", gen: { kind: "action", text: "Re-run segment analysis and share numbers", owner: "Priya" } },
    ],
  },
  {
    id: "standup",
    label: "Product Standup",
    people: [
      { name: "Sam", initials: "SA", role: "EM" },
      { name: "Lee", initials: "LE", role: "Eng" },
      { name: "Noah", initials: "NO", role: "away", away: true },
    ],
    script: [
      { t: "say", who: "Sam", initials: "SA", text: "Quick standup — what shipped, what's blocked?", gen: { kind: "note", text: "Standup: shipped, blocked, next up." } },
      { t: "say", who: "Lee", initials: "LE", text: "Auth shipped, but token refresh is flaky under load.", gen: { kind: "takeaway", text: "Auth shipped; token refresh is flaky under load." } },
      { t: "say", who: "Sam", initials: "SA", text: "Noah's out today — what was his blocker again?" },
      { t: "gap", note: "Noah isn't in the room" },
      { t: "ask", to: "Noah's agent", toInitials: "NA", q: "What's blocking Noah right now?" },
      { t: "reply", from: "Noah's agent", fromInitials: "NA", a: "Blocked on the backend API schema — flagged in yesterday's sync.", src: "Backend sync · yesterday" },
      { t: "say", who: "Sam", initials: "SA", text: "Got it. Backend, finalize that schema by EOD.", gen: { kind: "action", text: "Finalize the API schema by EOD", owner: "Backend" } },
      { t: "say", who: "Lee", initials: "LE", text: "Also onboarding really needs a design pass.", gen: { kind: "action", text: "Schedule a design pass on onboarding", owner: "Design" } },
    ],
  },
  {
    id: "design",
    label: "Design Feedback",
    people: [
      { name: "Aria", initials: "AR", role: "Design lead" },
      { name: "Kai", initials: "KA", role: "Design" },
      { name: "You", initials: "YV", role: "away", away: true },
    ],
    script: [
      { t: "say", who: "Aria", initials: "AR", text: "Let's review the new dashboard mocks.", gen: { kind: "note", text: "Reviewing the new dashboard mockups." } },
      { t: "say", who: "Kai", initials: "KA", text: "Hierarchy's unclear — the primary action is buried.", gen: { kind: "takeaway", text: "Primary action is buried; hierarchy unclear." } },
      { t: "say", who: "Aria", initials: "AR", text: "Didn't design already settle the contrast rules?" },
      { t: "gap", note: "set in an earlier design review" },
      { t: "ask", to: "Design-sys agent", toInitials: "DS", q: "What are our contrast rules for lilac on light?" },
      { t: "reply", from: "Design-sys agent", fromInitials: "DS", a: "Lilac needs white text for AA — beige fails. Set in the May 4 design review.", src: "Design review · May 4" },
      { t: "say", who: "Kai", initials: "KA", text: "Then two screens fail — we used beige on lilac.", gen: { kind: "takeaway", text: "Two screens fail contrast (beige on lilac).", conflict: true } },
      { t: "say", who: "Aria", initials: "AR", text: "Fix the contrast before we hand off to eng.", gen: { kind: "action", text: "Fix contrast issues before eng handoff", owner: "Kai" } },
      { t: "say", who: "Kai", initials: "KA", text: "On it — I'll prep the updated tokens too.", gen: { kind: "action", text: "Prep the updated design tokens", owner: "Kai" } },
    ],
  },
];

const SLOW = 1700;
const FAST = 850;

export function LiveSimulation() {
  const reduce = useReducedMotion();
  const [mid, setMid] = useState(MEETINGS[0].id);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fast, setFast] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const transcriptRef = useRef<HTMLDivElement>(null);

  const meeting = useMemo(() => MEETINGS.find((m) => m.id === mid)!, [mid]);
  const script = meeting.script;
  const interval = fast ? FAST : SLOW;
  const ended = step >= script.length;

  useEffect(() => {
    setDone({});
    if (reduce) {
      setStep(script.length);
      setPlaying(false);
    } else {
      setStep(0);
      setPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mid, reduce]);

  useEffect(() => {
    if (!playing || ended) {
      if (ended && playing) setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), interval);
    return () => clearTimeout(t);
  }, [playing, step, interval, ended]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [step, playing]);

  const revealed = script.slice(0, step);
  const last = revealed[revealed.length - 1];
  const asking = last?.t === "ask";

  // current speaker = the most recent "say"
  let speaker = "";
  for (let i = revealed.length - 1; i >= 0; i--) {
    const e = revealed[i];
    if (e.t === "say") {
      speaker = e.who;
      break;
    }
  }

  const synths = revealed.flatMap((e, i) =>
    e.t === "say" && e.gen ? [{ ...e.gen, id: `${mid}-${i}` }] : [],
  );
  const contexts = revealed.flatMap((e, i) =>
    e.t === "reply" ? [{ id: `${mid}-${i}`, text: e.a, src: e.src, from: e.from }] : [],
  );
  const notes = synths.filter((g) => g.kind === "note");
  const takeaways = synths.filter((g) => g.kind === "takeaway");
  const actions = synths.filter((g) => g.kind === "action");
  const doneCount = actions.filter((a) => done[a.id]).length;
  const hasOutput = synths.length + contexts.length > 0;

  function togglePlay() {
    if (ended) {
      setDone({});
      setStep(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white/85 shadow-[0_30px_60px_-28px_rgba(29,24,37,0.45)] backdrop-blur-sm">
      {/* ---- meeting selector ---- */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line bg-paper-2/60 px-3 py-2.5">
        {MEETINGS.map((m) => {
          const on = m.id === mid;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMid(m.id)}
              className={`flex-none rounded-full px-3 py-1.5 text-[0.72rem] font-medium transition-colors ${
                on ? "bg-signal text-white" : "text-ink-soft hover:bg-white/70 hover:text-ink"
              }`}
            >
              {m.label}
            </button>
          );
        })}
        <span className="ml-auto hidden items-center gap-1.5 pl-2 sm:flex">
          <span className="relative flex h-2 w-2">
            {playing && !ended && (
              <span className="live-ring absolute inset-0 rounded-full bg-signal" />
            )}
            <span className="relative h-2 w-2 rounded-full bg-signal" />
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-signal-deep">
            {ended ? "ended" : playing ? "live" : "paused"}
          </span>
        </span>
      </div>

      {/* ---- participants (one is away — their agent is attending) ---- */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2.5">
        {meeting.people.map((p) => {
          const isSpeaking = !p.away && p.name === speaker && playing && !ended;
          return (
            <div
              key={p.name}
              className={`flex flex-none items-center gap-1.5 rounded-full border px-2 py-1 transition-colors ${
                p.away
                  ? "border-dashed border-signal/40 bg-signal/[0.06]"
                  : isSpeaking
                    ? "border-signal/60 bg-signal/[0.08]"
                    : "border-line bg-white/60"
              }`}
            >
              <span
                className={`grid h-5 w-5 flex-none place-items-center rounded-full font-mono text-[0.5rem] font-bold ${
                  p.away ? "bg-signal/15 text-signal-deep" : "bg-ink/10 text-ink/70"
                }`}
              >
                {p.initials}
              </span>
              <span className="text-[0.66rem] font-medium leading-none text-ink/80">
                {p.name}
              </span>
              {p.away ? (
                <span className="flex items-center gap-1 font-mono text-[0.5rem] uppercase tracking-wider text-signal-deep">
                  <span className="h-1 w-1 rounded-full bg-signal blink" />
                  agent
                </span>
              ) : isSpeaking ? (
                <span className="flex items-end gap-[1.5px] h-2.5" aria-hidden>
                  {[0, 1, 2].map((b) => (
                    <span
                      key={b}
                      className="eq-bar w-[2px] rounded-full bg-signal"
                      style={{ height: "100%", animationDelay: `${b * 0.12}s` }}
                    />
                  ))}
                </span>
              ) : (
                <span className="font-mono text-[0.5rem] uppercase tracking-wider text-ink-soft/60">
                  {p.role}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- controls ---- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[0.72rem] font-medium text-paper transition-transform hover:-translate-y-px"
        >
          {ended ? (
            <>
              <ReplayIcon /> Replay
            </>
          ) : playing ? (
            <>
              <PauseIcon /> Pause
            </>
          ) : (
            <>
              <PlayIcon /> Play
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFast((f) => !f)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.72rem] font-medium transition-colors ${
            fast
              ? "border-signal/50 bg-signal/10 text-signal-deep"
              : "border-line text-ink-soft hover:text-ink"
          }`}
          aria-pressed={fast}
        >
          <BoltIcon />
          {fast ? "Fast synthesis" : "Normal speed"}
        </button>

        <span className="ml-auto font-mono text-[0.62rem] tabular-nums text-ink-soft/70">
          {Math.min(step, script.length)}/{script.length}
        </span>
      </div>

      {/* ---- live transcript ---- */}
      <div className="border-b border-line px-3 pb-3 pt-3 sm:px-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-soft/60">
            live audio transcript
          </span>
          <span className="flex items-end gap-[2px] h-3" aria-hidden>
            {[0, 1, 2, 3].map((b) => (
              <span
                key={b}
                className={`w-[2px] rounded-full bg-signal ${playing && !ended ? "eq-bar" : "opacity-30"}`}
                style={{ height: "100%", animationDelay: `${b * 0.12}s` }}
              />
            ))}
          </span>
        </div>

        <div ref={transcriptRef} className="h-[10.5rem] space-y-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {revealed.map((e, i) => (
              <motion.div
                key={`${mid}-${i}`}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TranscriptEvent ev={e} searching={asking && i === revealed.length - 1} />
              </motion.div>
            ))}
          </AnimatePresence>

          {playing && !ended && !asking && (
            <div className="flex items-center gap-2 pl-7 pt-0.5">
              <span className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="blink h-1 w-1 rounded-full bg-signal"
                    style={{ animationDelay: `${d * 0.2}s` }}
                  />
                ))}
              </span>
              <span className="font-mono text-[0.58rem] text-ink-soft/60">transcribing…</span>
            </div>
          )}
        </div>
      </div>

      {/* ---- AI generation engine output ---- */}
      <div className="px-3 py-3 sm:px-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal-deep">
            <SparkIcon />
            AI engine · synthesized
          </span>
          {actions.length > 0 && (
            <span className="font-mono text-[0.6rem] text-ink-soft/70">
              {doneCount}/{actions.length} done
            </span>
          )}
        </div>

        <div className="max-h-[15rem] space-y-3 overflow-y-auto pr-1">
          {!hasOutput && (
            <p className="py-4 text-center text-[0.72rem] text-ink-soft/60">
              Synthesized notes will appear here as the meeting streams in…
            </p>
          )}

          {/* Context pulled from other agents — the cross-meeting moment */}
          <Section label="Context from other agents" show={contexts.length > 0}>
            <AnimatePresence initial={false}>
              {contexts.map((c) => (
                <GenRow key={c.id} reduce={!!reduce}>
                  <div className="w-full rounded-lg border border-signal/50 bg-signal/[0.08] p-2.5">
                    <p className="flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-wider text-signal-deep">
                      <SparkIcon /> from {c.from}
                    </p>
                    <p className="mt-1 text-[0.8rem] leading-snug text-ink/85">{c.text}</p>
                    <p className="mt-1 font-mono text-[0.55rem] text-signal-deep/70">
                      sourced · {c.src}
                    </p>
                  </div>
                </GenRow>
              ))}
            </AnimatePresence>
          </Section>

          <Section label="Notes" show={notes.length > 0}>
            <AnimatePresence initial={false}>
              {notes.map((g) => (
                <GenRow key={g.id} reduce={!!reduce}>
                  <span className="mt-[0.4rem] h-1.5 w-1.5 flex-none rounded-full bg-ink/30" />
                  <span className="text-[0.8rem] leading-snug text-ink/85">{g.text}</span>
                </GenRow>
              ))}
            </AnimatePresence>
          </Section>

          <Section label="Takeaways" show={takeaways.length > 0}>
            <AnimatePresence initial={false}>
              {takeaways.map((g) => (
                <GenRow key={g.id} reduce={!!reduce}>
                  <span
                    className={`mt-[0.15rem] inline-flex flex-none items-center rounded-[4px] border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider ${
                      g.conflict
                        ? "border-signal/60 bg-signal/10 text-signal-deep"
                        : "border-line-strong text-ink-soft"
                    }`}
                  >
                    {g.conflict ? "conflict" : "insight"}
                  </span>
                  <span className="text-[0.8rem] leading-snug text-ink/85">{g.text}</span>
                </GenRow>
              ))}
            </AnimatePresence>
          </Section>

          <Section label="Action items" show={actions.length > 0}>
            <AnimatePresence initial={false}>
              {actions.map((g) => {
                const isDone = !!done[g.id];
                return (
                  <GenRow key={g.id} reduce={!!reduce}>
                    <button
                      type="button"
                      onClick={() => setDone((d) => ({ ...d, [g.id]: !d[g.id] }))}
                      className="flex w-full items-start gap-2 text-left"
                    >
                      <span
                        className={`mt-[0.1rem] grid h-4 w-4 flex-none place-items-center rounded-[5px] border transition-colors ${
                          isDone ? "border-signal bg-signal text-white" : "border-line-strong"
                        }`}
                      >
                        {isDone && (
                          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden>
                            <path d="M1 5l2.5 2.5L9 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`text-[0.8rem] leading-snug ${
                            isDone ? "text-ink-soft line-through" : "text-ink/85"
                          }`}
                        >
                          {g.text}
                        </span>
                        {g.owner && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-paper-2 px-1.5 py-0.5 align-middle font-mono text-[0.52rem] text-ink-soft">
                            {g.owner}
                          </span>
                        )}
                      </span>
                    </button>
                  </GenRow>
                );
              })}
            </AnimatePresence>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---- transcript event renderer ---- */

function TranscriptEvent({ ev, searching }: { ev: Ev; searching: boolean }) {
  if (ev.t === "gap") {
    return (
      <div className="flex items-center gap-2 py-0.5 pl-0.5">
        <span className="font-mono text-[0.56rem] uppercase tracking-wider text-signal">
          context gap
        </span>
        <span className="h-px flex-1 bg-signal/25" />
        <span className="font-mono text-[0.56rem] text-ink-soft/60">{ev.note}</span>
      </div>
    );
  }

  if (ev.t === "ask") {
    return (
      <div className="rounded-lg border border-signal/40 bg-signal/[0.06] px-2.5 py-2">
        <p className="flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-wider text-signal-deep">
          <AgentGlyph /> your agent → {ev.to}
        </p>
        <p className="mt-1 text-[0.78rem] leading-snug text-ink/80">“{ev.q}”</p>
        {searching && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-signal/15">
              <div className="shimmer h-full w-full rounded-full bg-gradient-to-r from-transparent via-signal/70 to-transparent" />
            </div>
            <span className="font-mono text-[0.52rem] text-signal-deep/70">asking…</span>
          </div>
        )}
      </div>
    );
  }

  if (ev.t === "reply") {
    return (
      <div className="flex gap-2">
        <span className="mt-[0.1rem] grid h-5 w-5 flex-none place-items-center rounded-full bg-signal/20 font-mono text-[0.5rem] font-bold text-signal-deep">
          {ev.fromInitials}
        </span>
        <div className="min-w-0">
          <p className="text-[0.8rem] leading-snug text-ink/85">
            <span className="font-medium text-signal-deep">{ev.from}: </span>
            {ev.a}
          </p>
          <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[0.52rem] text-signal-deep/70">
            <SparkIcon /> sourced · {ev.src}
          </span>
        </div>
      </div>
    );
  }

  // say
  return (
    <div className="flex gap-2">
      <span className="mt-[0.1rem] grid h-5 w-5 flex-none place-items-center rounded-full bg-ink/10 font-mono text-[0.52rem] font-bold text-ink/65">
        {ev.initials}
      </span>
      <p className="text-[0.8rem] leading-snug text-ink/80">
        <span className="font-medium text-ink/55">{ev.who}: </span>
        {ev.text}
      </p>
    </div>
  );
}

/* ---- small helpers ---- */

function Section({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <div>
      <p className="mb-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-ink-soft/55">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function GenRow({
  children,
  reduce,
}: {
  children: React.ReactNode;
  reduce: boolean;
}) {
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, x: -6, backgroundColor: "rgba(117,89,201,0.12)" }}
      animate={{ opacity: 1, x: 0, backgroundColor: "rgba(117,89,201,0)" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="flex items-start gap-2 rounded-md px-1.5 py-1"
    >
      {children}
    </motion.div>
  );
}

/* ---- icons ---- */
function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden>
      <path d="M3 2.2v7.6l6-3.8z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden>
      <rect x="3" y="2.5" width="2" height="7" rx="0.6" />
      <rect x="7" y="2.5" width="2" height="7" rx="0.6" />
    </svg>
  );
}
function ReplayIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M9.5 6a3.5 3.5 0 1 1-1-2.45M9.5 1.8v2h-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden>
      <path d="M6.5 1 2.5 7h2.5l-1 4 4-6H7.5l-1-4z" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden>
      <path d="M6 1l.9 3.1L10 5l-3.1.9L6 9l-.9-3.1L2 5l3.1-.9z" />
    </svg>
  );
}
function AgentGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <circle cx="3" cy="3" r="1.4" />
      <circle cx="9" cy="3" r="1.4" />
      <circle cx="6" cy="9" r="1.4" />
      <path d="M3.6 4.2 5.4 7.8M8.4 4.2 6.6 7.8M4 3h4" strokeLinecap="round" />
    </svg>
  );
}
