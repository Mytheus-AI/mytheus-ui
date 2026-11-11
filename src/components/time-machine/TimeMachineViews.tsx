"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Flag,
  GitBranch,
  Handshake,
  Quotes,
  Target,
  VideoCamera,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { Card, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type {
  DecisionAtDate,
  DecisionRef,
  Diff,
  MeetingAtDate,
  PromiseChange,
  Snapshot,
  Timeline,
} from "@/lib/api/bets-types";
import { OutcomeChip } from "@/components/bets/OutcomeChip";
import { longDate, plural, shortDate } from "@/lib/time-machine";

/* The three answers of the time machine, drawn from what core-api reconstructed:
   - `SnapshotView`: the company as it stood at the end of one day;
   - `DiffView`: what changed between two days, and which meetings changed it;
   - `TimelineView`: one topic's decisions in order on the memory line, each citing the meeting
     and the words that decided it.
   A step from a meeting you were not in keeps its place, its words withheld. */

function MeetingLink({ m, className = "" }: { m: MeetingAtDate | null | undefined; className?: string }) {
  if (!m) return <span className={`text-ink-3 ${className}`}>Outside a meeting</span>;
  return (
    <Link
      href={`/meetings/${m.id}`}
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-ctl font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline ${className}`}
    >
      <VideoCamera size={14} aria-hidden className="shrink-0" />
      <span className="truncate">{m.title},</span>
      <span className="-ml-0.5 shrink-0 font-normal text-ink-3">{shortDate(m.date)}</span>
    </Link>
  );
}

function Withheld({ what = "A decision from a meeting you were not in" }: { what?: string }) {
  return <span className="italic text-ink-3">{what}</span>;
}

function RefLine({ r, strike = false }: { r: DecisionRef | null | undefined; strike?: boolean }) {
  if (!r || !r.visible || !r.content) return <Withheld />;
  const text = <span className={strike ? "line-through decoration-ink-4" : ""}>{r.content}</span>;
  return r.id && r.meeting ? (
    <Link href={`/meetings/${r.meeting.id}/decisions/${r.id}`} className="underline-offset-4 hover:underline">
      {text}
    </Link>
  ) : (
    text
  );
}

function Quote({ text, who }: { text: string | null | undefined; who: string | null | undefined }) {
  if (!text) return null;
  return (
    <figure className="flex gap-2.5 rounded-ctl bg-bg-2 px-3 py-2.5">
      <Quotes size={16} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-signal-ink" />
      <div className="min-w-0">
        <blockquote className="font-display text-[15.5px] italic leading-snug text-ink">{text}</blockquote>
        {who ? <figcaption className="mt-0.5 text-[12.5px] text-ink-3">{who}</figcaption> : null}
      </div>
    </figure>
  );
}

function DecisionCard({ d }: { d: DecisionAtDate }) {
  return (
    <li className="grid gap-2.5 px-4 py-4 sm:px-[22px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px]">
        <MeetingLink m={d.meeting} />
        {d.replaces ? (
          <Chip icon={<GitBranch size={13} />} tone="outline">
            Changed an earlier call
          </Chip>
        ) : null}
        {d.bet ? (
          d.bet.status === "resolved" && d.bet.outcome ? (
            <OutcomeChip outcome={d.bet.outcome} prefix="Bet" />
          ) : (
            <Chip tone="low" icon={<Target size={13} />}>
              Bet waiting
            </Chip>
          )
        ) : null}
      </div>
      <h3 className="text-[16px] font-semibold leading-snug text-ink">
        <Link href={`/meetings/${d.meeting.id}/decisions/${d.id}`} className="underline-offset-4 hover:underline">
          {d.content}
        </Link>
      </h3>
      {d.rationale || d.why ? (
        <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink-3">Why: </span>
          {d.rationale || d.why}
        </p>
      ) : null}
      <Quote text={d.quote} who={d.quote_speaker_name} />
      {d.replaces ? (
        <p className="text-[13.5px] text-ink-3">
          It replaced: <RefLine r={d.replaces} strike />
        </p>
      ) : null}
      {d.bet ? <p className="text-[13.5px] text-ink-3">Expected: {d.bet.statement}</p> : null}
    </li>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: "warn" }) {
  return (
    <div>
      <dt className="text-[12.5px] font-semibold text-ink-3">{label}</dt>
      <dd className={`mt-0.5 text-[24px] font-semibold tabular-nums ${tone === "warn" && n > 0 ? "text-priority-medium" : "text-ink"}`}>{n}</dd>
    </div>
  );
}

export function SnapshotView({ s, onJump }: { s: Snapshot; onJump: (date: string) => void }) {
  const c = s.counts;
  const nothing = c.in_force === 0 && c.replaced === 0 && c.promises_open === 0 && (s.goals ?? []).length === 0;
  if (nothing) {
    const later = s.earliest && s.earliest > s.as_of;
    return (
      <EmptyState
        art="decisions"
        title={s.topic ? `Nothing on ${s.topic} by ${longDate(s.as_of)}` : `Nothing on record by ${longDate(s.as_of)}`}
        description={
          later
            ? `The first decision you can see was made on ${longDate(s.earliest as string)}.`
            : "Only meetings you took part in are included. Try another date or a broader topic."
        }
        action={
          later ? (
            <Button variant="outline" onClick={() => onJump(s.earliest as string)}>
              Go to {shortDate(s.earliest as string)}
            </Button>
          ) : undefined
        }
      />
    );
  }
  return (
    <div className="grid gap-5">
      <Card as="section" aria-labelledby="tm-summary">
        <h2 id="tm-summary" className="display text-[22px] leading-tight text-ink-display">
          {s.topic ? `Where ${s.topic} stood` : "Where things stood"}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 min-[560px]:grid-cols-3 xl:grid-cols-6">
          <Stat n={c.in_force} label="Decisions in force" />
          <Stat n={c.replaced} label="Replaced by then" />
          <Stat n={c.promises_open} label="Open promises" />
          <Stat n={c.promises_overdue} label="Overdue" tone="warn" />
          <Stat n={c.goals_active} label="Active goals" />
          <Stat n={c.meetings} label="Meetings so far" />
        </dl>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card as="section" flush aria-labelledby="tm-decided">
          <CardHead id="tm-decided" title="What was decided, and why" description="In force at the end of that day, newest first." divided />
          {s.decisions.length ? (
            <ol className="divide-y divide-line">
              {s.decisions.map((d) => (
                <DecisionCard key={d.id} d={d} />
              ))}
            </ol>
          ) : (
            <p className="px-4 py-5 text-[14px] text-ink-3 sm:px-[22px]">No decision was in force on that day.</p>
          )}
          {s.truncated ? <p className="border-t border-line px-4 py-3 text-[13px] text-ink-3 sm:px-[22px]">Showing the newest 200. Name a topic to narrow it.</p> : null}
        </Card>

        <div className="grid min-w-0 gap-5">
          <Card as="section" flush aria-labelledby="tm-promises">
            <CardHead id="tm-promises" title="Open promises" description="Tasks people owned, and your own promises." divided />
            {s.promises.length ? (
              <ul className="divide-y divide-line">
                {s.promises.map((p) => (
                  <li key={p.id} className="px-4 py-3 sm:px-[22px]">
                    <p className="text-[14.5px] leading-snug text-ink">{p.content}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
                      <span className="font-semibold text-ink-2">{p.owner_name ?? "No owner"}</span>
                      {p.due ? <span>due {p.kind === "action" ? shortDate(p.due) : p.due}</span> : null}
                      {p.overdue ? <Chip tone="medium">Overdue then</Chip> : null}
                      {p.kind === "promise" ? <Chip tone="outline">Your promise</Chip> : null}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">No open promises on that day.</p>
            )}
          </Card>

          <Card as="section" flush aria-labelledby="tm-goals">
            <CardHead id="tm-goals" title="Goals" divided />
            {(s.goals ?? []).length ? (
              <ul className="divide-y divide-line">
                {(s.goals ?? []).map((g) => (
                  <li key={g.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-[22px]">
                    <span className="min-w-0">
                      <span className="block text-[14.5px] text-ink">{g.title}</span>
                      <span className="block text-[12.5px] text-ink-3">
                        {[g.period, g.owner_name].filter(Boolean).join(", ") || "No owner"}
                      </span>
                    </span>
                    <Chip tone={g.status === "achieved" ? "ok" : g.status === "dropped" ? "neutral" : "low"}>
                      {g.status === "achieved" ? "Achieved" : g.status === "dropped" ? "Dropped" : "Active"}
                    </Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">No company goals were set by then.</p>
            )}
          </Card>

          {s.replaced.length ? (
            <Card as="section" flush aria-labelledby="tm-replaced">
              <CardHead id="tm-replaced" title="Replaced by then" divided />
              <ul className="divide-y divide-line">
                {s.replaced.map((r) => (
                  <li key={r.id} className="px-4 py-3 text-[14px] sm:px-[22px]">
                    <p className="text-ink-3 line-through decoration-ink-4">{r.content}</p>
                    <p className="mt-1 text-ink-2">
                      <span className="text-ink-3">On {shortDate(r.replaced_at)} by </span>
                      <RefLine r={r.replaced_by} />
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PromiseRow({ p, kind }: { p: PromiseChange; kind: "kept" | "broken" | "made" }) {
  return (
    <li className="px-4 py-3 sm:px-[22px]">
      <p className="text-[14.5px] leading-snug text-ink">{p.content}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
        <span className="font-semibold text-ink-2">{p.owner_name ?? "No owner"}</span>
        {kind === "kept" ? <span>done {shortDate(p.at)}</span> : null}
        {kind === "kept" && p.on_time === false ? <Chip tone="medium">Late</Chip> : null}
        {kind === "broken" && p.due_date ? <span>was due {shortDate(p.due_date)}</span> : null}
        {kind === "broken" && p.kept_later_at ? <Chip tone="medium">Done later, {shortDate(p.kept_later_at)}</Chip> : null}
        {kind === "made" && p.due_date ? <span>due {shortDate(p.due_date)}</span> : null}
      </p>
      {p.caused_by ? (
        <p className="mt-1 text-[12.5px]">
          <MeetingLink m={p.caused_by} />
        </p>
      ) : null}
    </li>
  );
}

export function DiffView({ d }: { d: Diff }) {
  const c = d.counts;
  const total = c.new_decisions + c.reversed + c.promises_made + c.promises_kept + c.promises_broken + c.bets_resolved + c.goals_changed;
  if (total === 0) {
    return (
      <EmptyState
        art="decisions"
        title="Nothing changed between these dates"
        description={`No decision, promise or goal${d.topic ? ` on ${d.topic}` : ""} moved between ${longDate(d.from)} and ${longDate(d.to)} in meetings you were in.`}
      />
    );
  }
  const parts = [
    c.new_decisions ? plural(c.new_decisions, "new decision") : null,
    c.reversed ? `${c.reversed} reversed` : null,
    c.promises_kept ? plural(c.promises_kept, "promise kept", "promises kept") : null,
    c.promises_broken ? plural(c.promises_broken, "promise broken", "promises broken") : null,
    c.bets_resolved ? plural(c.bets_resolved, "bet scored", "bets scored") : null,
  ].filter(Boolean);
  const maxImpact = Math.max(1, ...d.meetings.map((m) => m.new_decisions + m.reversals + m.promises_made));
  return (
    <div className="grid gap-5">
      <Card as="section" aria-labelledby="tm-diff-summary">
        <h2 id="tm-diff-summary" className="display text-[22px] leading-snug text-ink-display">
          {d.topic ? `What changed on ${d.topic}` : "What changed"}
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-2">{parts.join(", ")}.</p>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-5">
          {d.reversed.length ? (
            <Card as="section" flush aria-labelledby="tm-reversed">
              <CardHead id="tm-reversed" title="Reversed" description="Calls that a later decision replaced, and where it happened." divided />
              <ol className="divide-y divide-line">
                {d.reversed.map((r, i) => (
                  <li key={i} className="grid gap-2 px-4 py-4 sm:px-[22px]">
                    <div className="grid items-start gap-2 text-[14.5px] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
                      <p className="text-ink-3">
                        <RefLine r={r.old} strike />
                      </p>
                      <ArrowRight size={16} aria-label="became" className="mt-0.5 hidden text-signal-ink sm:block" />
                      <p className="font-semibold text-ink">
                        <RefLine r={r.new} />
                      </p>
                    </div>
                    <p className="text-[12.5px] text-ink-3">
                      Changed on {shortDate(r.replaced_at)}
                      {r.caused_by ? (
                        <>
                          {" "}in <MeetingLink m={r.caused_by} />
                        </>
                      ) : (
                        ", in a meeting you were not in"
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {d.new_decisions.length ? (
            <Card as="section" flush aria-labelledby="tm-new">
              <CardHead id="tm-new" title="New decisions" divided />
              <ol className="divide-y divide-line">
                {d.new_decisions.map((x) => (
                  <DecisionCard key={x.id} d={x} />
                ))}
              </ol>
            </Card>
          ) : null}

          <div className="grid items-start gap-5 md:grid-cols-2">
            <Card as="section" flush aria-labelledby="tm-kept">
              <CardHead
                id="tm-kept"
                title={
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle size={17} weight="fill" aria-hidden className="text-ok" />
                    Promises kept
                  </span>
                }
                divided
              />
              {d.promises_kept.length ? (
                <ul className="divide-y divide-line">
                  {d.promises_kept.map((p) => (
                    <PromiseRow key={`k-${p.id}`} p={p} kind="kept" />
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">None closed in this window.</p>
              )}
            </Card>
            <Card as="section" flush aria-labelledby="tm-broken">
              <CardHead
                id="tm-broken"
                title={
                  <span className="inline-flex items-center gap-2">
                    <XCircle size={17} weight="fill" aria-hidden className="text-priority-high" />
                    Promises broken
                  </span>
                }
                description="Due in the window and not done by the date."
                divided
              />
              {d.promises_broken.length ? (
                <ul className="divide-y divide-line">
                  {d.promises_broken.map((p) => (
                    <PromiseRow key={`b-${p.id}`} p={p} kind="broken" />
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">Every promise due in the window was kept.</p>
              )}
            </Card>
          </div>

          {d.promises_made.length ? (
            <Card as="section" flush aria-labelledby="tm-made">
              <CardHead
                id="tm-made"
                title={
                  <span className="inline-flex items-center gap-2">
                    <Handshake size={17} aria-hidden className="text-ink-3" />
                    Promises made
                  </span>
                }
                divided
              />
              <ul className="divide-y divide-line">
                {d.promises_made.map((p) => (
                  <PromiseRow key={`m-${p.id}`} p={p} kind="made" />
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-5">
          <Card as="section" flush aria-labelledby="tm-meetings">
            <CardHead id="tm-meetings" title="The meetings that changed it" divided />
            {d.meetings.length ? (
              <ol className="divide-y divide-line">
                {d.meetings.map((m) => {
                  const n = m.new_decisions + m.reversals + m.promises_made;
                  return (
                    <li key={m.meeting.id} className="px-4 py-3 sm:px-[22px]">
                      <MeetingLink m={m.meeting} className="text-[14px]" />
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-3" aria-hidden>
                        <div className="h-full rounded-full bg-signal-line" style={{ width: `${(n / maxImpact) * 100}%` }} />
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-ink-3">
                        {[
                          m.new_decisions ? plural(m.new_decisions, "decision") : null,
                          m.reversals ? plural(m.reversals, "reversal") : null,
                          m.promises_made ? plural(m.promises_made, "promise") : null,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">The changes happened outside meetings you were in.</p>
            )}
          </Card>

          {d.bets_resolved.length ? (
            <Card as="section" flush aria-labelledby="tm-bets">
              <CardHead id="tm-bets" title="Bets scored" divided />
              <ul className="divide-y divide-line">
                {d.bets_resolved.map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-[22px]">
                    <span className="min-w-0 text-[14px] text-ink">{b.statement}</span>
                    <OutcomeChip outcome={b.outcome} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {d.goals.length ? (
            <Card as="section" flush aria-labelledby="tm-goalchanges">
              <CardHead id="tm-goalchanges" title="Goals that moved" divided />
              <ul className="divide-y divide-line">
                {d.goals.map((g, i) => (
                  <li key={`${g.id}-${i}`} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-[22px]">
                    <span className="min-w-0 text-[14px] text-ink">{g.title}</span>
                    <Chip tone={g.change === "achieved" ? "ok" : g.change === "added" ? "low" : "neutral"}>
                      {g.change === "added" ? "Added" : g.change === "achieved" ? "Achieved" : "Dropped"}
                    </Chip>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const STEP_LABEL = { decided: "Decided", replaced: "Changed course", bet_resolved: "Bet scored" } as const;

export function TimelineView({ t, suggestions, onTopic }: { t: Timeline; suggestions: string[]; onTopic: (topic: string) => void }) {
  if (t.steps.length === 0) {
    return (
      <EmptyState
        art="search"
        title={`Nothing on ${t.topic} yet`}
        description="No decision in meetings you were in mentions it. Try a broader word."
        action={
          suggestions.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => onTopic(s)}>
                  {s}
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />
    );
  }
  const first = t.steps[0];
  const last = t.steps[t.steps.length - 1];
  return (
    <div className="grid gap-5">
      <Card as="section" aria-labelledby="tm-topic-summary">
        <h2 id="tm-topic-summary" className="display text-[22px] leading-snug text-ink-display">
          How {t.topic} changed
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-2">
          {plural(t.steps.length, "step")} across {plural(t.meetings, "meeting")}, from {longDate(first.at)} to {longDate(last.at)}.{" "}
          {plural(t.in_force_now, "decision")} still in force today.
        </p>
      </Card>
      <Card as="section" flush aria-labelledby="tm-steps">
        <CardHead id="tm-steps" title="Step by step" description="Oldest first, each with the meeting and the words that decided it." divided />
        <ol className="relative px-4 py-5 sm:px-[22px]">
          {t.steps.length > 1 ? (
            <span aria-hidden className="absolute bottom-10 left-[31px] top-10 w-[2px] rounded-full bg-[var(--signal-line)] sm:left-[37px]" />
          ) : null}
          {t.steps.map((s, i) => {
            const Icon = s.kind === "bet_resolved" ? Target : s.kind === "replaced" ? GitBranch : Flag;
            return (
              <li key={`${s.at}-${i}`} className="relative flex gap-4 pb-7 last:pb-0">
                <span
                  aria-hidden
                  className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    s.kind === "replaced" ? "bg-signal text-pill-on shadow-[0_0_0_5px_var(--signal-soft)]" : "border-2 border-[var(--signal-line)] bg-surface text-signal-ink"
                  }`}
                >
                  <Icon size={15} weight={s.kind === "replaced" ? "fill" : "regular"} />
                </span>
                <div className="grid min-w-0 flex-1 gap-2 pt-0.5">
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-3">
                    <time dateTime={s.at} className="font-semibold text-ink-2">
                      {shortDate(s.at)}
                    </time>
                    <span>{STEP_LABEL[s.kind]}</span>
                    {s.kind !== "bet_resolved" ? (
                      s.in_force_now ? (
                        <Chip tone="ok">In force now</Chip>
                      ) : (
                        <Chip tone="outline">Replaced since</Chip>
                      )
                    ) : s.outcome ? (
                      <OutcomeChip outcome={s.outcome} />
                    ) : null}
                  </p>
                  {s.kind === "bet_resolved" ? (
                    <>
                      <p className="text-[15px] font-semibold leading-snug text-ink">{s.bet_statement}</p>
                      <p className="text-[13.5px] text-ink-3">
                        The bet on: <RefLine r={s.decision} />
                      </p>
                    </>
                  ) : (
                    <p className="text-[16px] font-semibold leading-snug text-ink">
                      <RefLine r={s.decision} />
                    </p>
                  )}
                  {s.replaces ? (
                    <p className="text-[13.5px] text-ink-3">
                      Instead of: <RefLine r={s.replaces} strike />
                    </p>
                  ) : null}
                  {s.rationale ? <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-ink-2">{s.rationale}</p> : null}
                  {s.kind !== "bet_resolved" ? (
                    s.quote ? (
                      <Quote text={s.quote} who={s.quote_speaker_name} />
                    ) : (
                      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                        <WarningCircle size={14} aria-hidden />
                        No quote was captured for this decision.
                      </p>
                    )
                  ) : null}
                  {s.decision.meeting ? (
                    <p className="text-[12.5px]">
                      <MeetingLink m={s.decision.meeting} />
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
