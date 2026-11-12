import Link from "next/link";
import { ArrowRight, CalendarCheck, Lightbulb, LockSimple, Sparkle, WarningCircle } from "@phosphor-icons/react/ssr";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import type { Calibration, CalibrationBucket, GroupRecord, MyBet } from "@/lib/api/bets-types";
import { CATEGORY_LABEL, brierWords, formatDay, pct, relativeDay } from "@/lib/bets";
import { OutcomeChip } from "./OutcomeChip";

/* "How good are our calls": the workspace's feedback loop on its own judgement, built from bets
   people scored. Aggregate only: by decision type and by team (a team from 3 scored bets), the
   confidence people stated against how often those calls landed, the assumptions that keep
   failing and the lessons owners left. No person is ranked or named anywhere on it. The one
   personal part, the bets waiting for you, is yours alone. A server component: nothing on it
   needs the browser. */

function Bar({ g }: { g: GroupRecord }) {
  const total = Math.max(1, g.resolved);
  const seg = (n: number, cls: string, label: string) =>
    n > 0 ? <span className={`${cls} h-full`} style={{ width: `${(n / total) * 100}%` }} title={`${n} ${label}`} /> : null;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-bg-3" aria-hidden>
      {seg(g.hit, "bg-ok", "hit")}
      {seg(g.partly, "bg-priority-medium", "partly")}
      {seg(g.missed, "bg-priority-high", "missed")}
    </div>
  );
}

function GroupTable({ rows, caption, empty, head = "Type" }: { rows: GroupRecord[]; caption: string; empty: string; head?: string }) {
  if (rows.length === 0) return <p className="px-4 pb-5 text-[14px] text-ink-3 sm:px-[22px]">{empty}</p>;
  return (
    <table className="w-full text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-y border-line bg-surface-2 text-[12.5px] text-ink-3">
          <th scope="col" className="px-4 py-2 font-semibold sm:pl-[22px]">
            {head}
          </th>
          <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">
            Hit, partly, missed
          </th>
          <th scope="col" className="px-3 py-2 text-right font-semibold">
            Scored
          </th>
          <th scope="col" className="px-4 py-2 text-right font-semibold sm:pr-[22px]">
            Landed
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((g) => (
          <tr key={g.key} className="text-[14.5px]">
            <th scope="row" className="px-4 py-3 font-semibold text-ink sm:pl-[22px]">
              {g.label}
              {g.open ? <span className="block text-[12.5px] font-normal text-ink-3">{g.open} waiting</span> : null}
              <span className="mt-2 block sm:hidden">
                <Bar g={g} />
              </span>
            </th>
            <td className="hidden w-[38%] px-3 py-3 sm:table-cell">
              <Bar g={g} />
              <span className="mt-1 block text-[12.5px] text-ink-3">
                {g.hit} hit, {g.partly} partly, {g.missed} missed
              </span>
            </td>
            <td className="px-3 py-3 text-right tabular-nums text-ink-2">{g.resolved}</td>
            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink sm:pr-[22px]">
              {g.resolved < 3 ? <span className="text-[13px] font-normal text-ink-3">Too few</span> : pct(g.hit_rate)}
              {g.stated_confidence !== null && g.stated_confidence !== undefined && g.resolved >= 3 ? (
                <span className="block text-[12.5px] font-normal text-ink-3">said {pct(g.stated_confidence)}</span>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* Stated confidence against how often it landed: a dot per band on the diagonal means people's
   confidence was right. Drawn in tokens; the table under it is the same data for screen readers. */
function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const W = 320;
  const H = 220;
  const P = { l: 40, r: 22, t: 12, b: 34 };
  const x = (v: number) => P.l + v * (W - P.l - P.r);
  const y = (v: number) => H - P.b - v * (H - P.t - P.b);
  const maxN = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[460px]" role="img" aria-labelledby="cal-title cal-desc">
        <title id="cal-title">Stated confidence against how often calls landed</title>
        <desc id="cal-desc">Each dot is a band of stated confidence; on the diagonal, the confidence was right.</desc>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
              {Math.round(t * 100)}%
            </text>
            <text x={x(t)} y={H - P.b + 16} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--ink-4)" strokeWidth={1.25} strokeDasharray="4 4" />
        {buckets.map((b) => (
          <g key={b.label}>
            <line x1={x(b.stated)} x2={x(b.stated)} y1={y(b.stated)} y2={y(b.actual)} stroke="var(--signal-line)" strokeWidth={1.5} opacity={0.5} />
            <circle cx={x(b.stated)} cy={y(b.actual)} r={4 + (b.count / maxN) * 6} fill="var(--signal-line)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        ))}
        <text x={(x(0) + x(1)) / 2} y={H - 4} textAnchor="middle" fontSize="11.5" fill="var(--ink-3)">
          How sure people said they were
        </text>
      </svg>
      <table className="sr-only">
        <caption>Calibration by stated confidence</caption>
        <thead>
          <tr>
            <th scope="col">Stated</th>
            <th scope="col">Landed</th>
            <th scope="col">Bets</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.label}>
              <th scope="row">{b.label}</th>
              <td>{pct(b.actual)}</td>
              <td>{b.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function MonthStrip({ months }: { months: Calibration["months"] }) {
  if (!months || months.length < 2) return null;
  const max = Math.max(1, ...months.map((m) => m.resolved));
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  return (
    <div>
      <ol className="flex h-28 items-end gap-1.5" aria-label="Bets scored per month">
        {months.map((m) => (
          <li key={m.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11.5px] tabular-nums text-ink-3">{pct(m.hit_rate)}</span>
            <span
              className="w-full max-w-[28px] rounded-t-[6px] bg-[var(--signal-line)] opacity-80"
              style={{ height: `${Math.max(8, (m.resolved / max) * 70)}px` }}
              title={`${m.resolved} scored`}
            />
            <span className="text-[11.5px] text-ink-3">
              {fmt.format(new Date(`${m.month}-01T00:00:00Z`))}
              <span className="sr-only">: {m.resolved} scored, {pct(m.hit_rate)} landed</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Waiting({ mine, today }: { mine: MyBet[] | null; today: string }) {
  const needs = (mine ?? []).filter((m) => m.needs_you);
  const open = (mine ?? []).filter((m) => m.bet.status === "open");
  return (
    <Card as="section" flush aria-labelledby="mine-heading">
      <CardHead
        id="mine-heading"
        title="Waiting for you"
        right={
          <Chip icon={<LockSimple size={13} weight="bold" />} tone="outline">
            Only you
          </Chip>
        }
        divided
      />
      {mine === null ? (
        <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">Your bets could not be loaded just now.</p>
      ) : needs.length === 0 ? (
        <p className="px-4 py-4 text-[14px] leading-relaxed text-ink-3 sm:px-[22px]">
          Nothing to score or review. {open.length ? `${open.length} of your bets ${open.length === 1 ? "is" : "are"} waiting for the check date.` : ""}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {needs.map((m) => (
            <li key={m.bet.id}>
              <Link
                href={`/meetings/${m.bet.meeting_id}/decisions/${m.bet.decision_id}#bet`}
                className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-[22px]"
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.bet.status === "due" ? "bg-priority-medium-soft text-priority-medium" : "bg-signal-soft text-signal-ink"}`}
                >
                  {m.bet.status === "due" ? <CalendarCheck size={16} weight="fill" /> : <Sparkle size={16} weight="fill" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-ink-3">
                    {m.bet.status === "due" ? `Ready to score, check date ${relativeDay(m.bet.check_date, today)}` : "Suggested by your Myte"}
                  </span>
                  <span className="mt-0.5 block text-[14.5px] leading-snug text-ink">{m.bet.statement}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-3">{m.decision_content}</span>
                </span>
                <ArrowRight size={16} aria-hidden className="mt-1 shrink-0 text-ink-3 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function CallsReport({ cal, mine, today }: { cal: Calibration; mine: MyBet[] | null; today: string }) {
  const t = cal.totals;
  if (t.bets === 0) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <EmptyState
          art="decisions"
          title="No bets yet"
          description="Open a confirmed decision and say what it should achieve, or keep what your Myte heard in the meeting. Once bets are scored, this page shows which calls the workspace gets right."
          action={<LinkButton href="/decisions">Open the decision log</LinkButton>}
        />
        <Waiting mine={mine} today={today} />
      </div>
    );
  }
  const early = t.resolved < 3;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 gap-5">
        <Card as="section" aria-labelledby="headline-heading">
          <h2 id="headline-heading" className="sr-only">
            The record so far
          </h2>
          <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <div>
              <p className="display text-[clamp(44px,6vw,64px)] leading-none text-ink-display tabular-nums">{early ? "Early" : pct(t.hit_rate)}</p>
              <p className="mt-2 max-w-[28ch] text-[14px] text-ink-3">
                {early ? `${t.resolved} of ${t.bets} bets scored so far: too few to say yet.` : "of scored calls landed (a partly counts half)"}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 min-[520px]:grid-cols-4">
              {(
                [
                  ["Scored", t.resolved],
                  ["Hit", t.hit],
                  ["Partly", t.partly],
                  ["Missed", t.missed],
                  ["Waiting", t.open],
                  ["To score", t.due],
                  ["Suggested", t.proposed],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12.5px] font-semibold text-ink-3">{k}</dt>
                  <dd className="mt-0.5 text-[22px] font-semibold tabular-nums text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <Card as="section" flush aria-labelledby="calibration-heading">
          <CardHead
            id="calibration-heading"
            title="How sure we said we were, and how often it landed"
            description={`${brierWords(t.brier)}${t.brier !== null && t.brier !== undefined ? ` (Brier score ${t.brier.toFixed(2)}; 0 is perfect, 0.25 is a coin toss)` : ""}.`}
            divided
          />
          <CardBody className="pt-4">
            {cal.buckets.length ? (
              <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
                <CalibrationChart buckets={cal.buckets} />
                <div className="grid gap-3 text-[14px] leading-relaxed text-ink-2">
                  <p>Each dot is a band of stated confidence; bigger dots hold more bets.</p>
                  <p>
                    <span className="font-semibold text-ink">On the dashed line</span>, people were exactly as sure as they should have been.{" "}
                    <span className="font-semibold text-ink">Below it</span>, the calls landed less often than people expected.
                  </p>
                  <ul className="grid gap-1 text-[13px] text-ink-3">
                    {cal.buckets.map((b) => (
                      <li key={b.label} className="flex justify-between gap-3 tabular-nums">
                        <span>Said {b.label}</span>
                        <span>
                          landed {pct(b.actual)} of {b.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-ink-3">When people say how sure they are on a bet, this shows whether that confidence was right.</p>
            )}
          </CardBody>
        </Card>

        <Card as="section" flush aria-labelledby="category-heading">
          <CardHead id="category-heading" title="By type of decision" description="Which kinds of calls the workspace gets right." divided />
          <GroupTable rows={cal.by_category} caption="Scored bets by type of decision" empty="No bets have been scored yet." />
        </Card>

        <Card as="section" flush aria-labelledby="team-heading">
          <CardHead
            id="team-heading"
            title="By team"
            description={`A team appears once it has ${cal.min_team_resolved ?? 3} scored bets${cal.teams_below_threshold ? `; ${cal.teams_below_threshold} ${cal.teams_below_threshold === 1 ? "team has" : "teams have"} fewer so far` : ""}.`}
            divided
          />
          <GroupTable rows={cal.by_team} caption="Scored bets by team" empty="No team has three scored bets yet." head="Team" />
        </Card>

        {cal.months.length >= 2 ? (
          <Card as="section" flush aria-labelledby="months-heading">
            <CardHead id="months-heading" title="Over time" description="Bets scored each month, and how many landed." divided />
            <CardBody className="pt-4">
              <MonthStrip months={cal.months} />
            </CardBody>
          </Card>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-5 lg:sticky lg:top-2">
        <Waiting mine={mine} today={today} />

        <Card as="section" flush aria-labelledby="assumptions-heading">
          <CardHead id="assumptions-heading" title="Assumptions that keep failing" divided />
          {cal.failing_assumptions.length ? (
            <ul className="divide-y divide-line">
              {cal.failing_assumptions.map((f) => (
                <li key={f.assumption} className="flex items-start gap-3 px-4 py-3.5 sm:px-[22px]">
                  <WarningCircle size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-priority-medium" />
                  <div className="min-w-0">
                    <p className="text-[14.5px] leading-snug text-ink">{f.assumption}</p>
                    <p className="mt-1 text-[12.5px] text-ink-3">
                      Failed {f.times === 1 ? "once" : `${f.times} times`}, in {f.categories.map((c) => CATEGORY_LABEL[c]).join(", ").toLowerCase()}, last on{" "}
                      {formatDay(f.last_failed_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">None yet. When a bet misses and its owner says the assumption did not hold, it shows here.</p>
          )}
        </Card>

        <Card as="section" flush aria-labelledby="lessons-heading">
          <CardHead id="lessons-heading" title="Lessons for the next call" caption="In the owners' words, without names" divided />
          {cal.lessons.length ? (
            <ul className="divide-y divide-line">
              {cal.lessons.map((l, i) => (
                <li key={`${l.resolved_at}-${i}`} className="px-4 py-3.5 sm:px-[22px]">
                  <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
                    <OutcomeChip outcome={l.outcome} />
                    {CATEGORY_LABEL[l.category]}
                  </div>
                  <p className="mt-1.5 flex gap-2 font-display text-[16px]  leading-snug text-ink">
                    <Lightbulb size={16} aria-hidden className="mt-1 shrink-0 not-italic text-signal-ink" />
                    {l.lesson}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">Lessons appear as owners score their bets. They are shown again when a similar decision is being made.</p>
          )}
        </Card>

        <p className="flex gap-2 px-1 text-[13px] leading-relaxed text-ink-3">
          <LockSimple size={15} aria-hidden className="mt-0.5 shrink-0" />
          Scores are about decisions, never people. Nobody is ranked; teams show from three scored bets; confidential meetings are counted but never quoted.
        </p>
      </div>
    </div>
  );
}
