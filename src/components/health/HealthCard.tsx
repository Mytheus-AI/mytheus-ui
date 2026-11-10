import Link from "next/link";
import { Lightbulb, Pulse } from "@phosphor-icons/react/ssr";
import type { BrainRead } from "@/lib/api/meeting-brain";
import type { MeetingHealth } from "@/lib/api/meeting-brain-types";
import {
  ASYNC_SUGGESTION,
  balanceNote,
  balanceSlices,
  countLabel,
  coveragePercent,
  peopleTime,
  trendBars,
  trendSummary,
} from "./health-format";

/* The meeting health card (mytheus-docs ADR-0039 B8), on the meeting page after it ends: how much
   of the agenda was covered, what came out of it (decisions, actions), what it cost in
   people-hours (time, never money), how evenly people talked when speaker timing is stored, a
   gentle suggestion when it could have been an update in writing, and a small trend of coverage
   along the follow-up chain. A server component: nothing here is interactive. */

const SLICE_TINTS = ["hc-t1", "hc-t2", "hc-t3", "hc-t4"] as const;

export function HealthCard({
  meetingId,
  health,
  nameOf,
}: {
  meetingId: string;
  health: BrainRead<MeetingHealth>;
  nameOf: (id: string) => string;
}) {
  return (
    <section className="mx-card mx-card-pad hc" aria-labelledby="hc-h">
      <div className="mx-card-head">
        <h2 className="mx-card-title" id="hc-h">
          Meeting health
        </h2>
        <span className="mx-card-note">Time, not money</span>
      </div>
      {health.ok ? (
        <HealthBody meetingId={meetingId} h={health.data} nameOf={nameOf} />
      ) : health.reason === "none" ? (
        <p className="br-empty">The health card is ready a few minutes after the meeting ends, for the people who were in it.</p>
      ) : (
        <p className="br-empty" role="status">
          The health card couldn&rsquo;t be loaded just now. Reload the page to try again.
        </p>
      )}
    </section>
  );
}

function HealthBody({ meetingId, h, nameOf }: { meetingId: string; h: MeetingHealth; nameOf: (id: string) => string }) {
  const coverage = coveragePercent(h.agenda);
  const time = peopleTime(h.people_hours);
  const slices = balanceSlices(h.talk_balance, nameOf);
  const note = balanceNote(slices);
  const bars = trendBars(h.trend, meetingId);
  const summary = trendSummary(bars);

  return (
    <div className="hc-body">
      <dl className="hc-stats">
        <div>
          <dt>Agenda covered</dt>
          <dd>
            {coverage === null ? (
              <span className="hc-na">No agenda</span>
            ) : (
              <>
                {coverage}
                <small>%</small>
              </>
            )}
          </dd>
          {coverage !== null ? (
            <span className="hc-sub">
              {h.agenda.covered} of {h.agenda.total} items
            </span>
          ) : null}
          {coverage !== null ? (
            <span className="hc-meter" aria-hidden="true">
              <i style={{ width: `${coverage}%` }} />
            </span>
          ) : null}
        </div>
        <div>
          <dt>Decisions</dt>
          <dd>{h.decisions}</dd>
          <span className="hc-sub">confirmed</span>
        </div>
        <div>
          <dt>Actions</dt>
          <dd>{h.actions}</dd>
          <span className="hc-sub">with an owner</span>
        </div>
        <div>
          <dt>People-time</dt>
          <dd>
            {time.value} <small>{time.unit === "people-minutes" || time.unit === "person-minute" ? "min" : "hrs"}</small>
          </dd>
          <span className="hc-sub">{h.duration_minutes} min, everyone in it</span>
        </div>
      </dl>

      {h.async_suggestion ? (
        <p className="hc-async">
          <Lightbulb size={18} aria-hidden="true" />
          <span>{ASYNC_SUGGESTION}</span>
        </p>
      ) : null}

      {slices ? (
        <div className="hc-block">
          <h3 className="md-sub">Talk balance</h3>
          <div className="hc-balance" role="img" aria-label={slices.map((s) => `${s.name} ${s.percent}%`).join(", ")}>
            {slices.map((s, i) => (
              <i key={s.userId} className={SLICE_TINTS[i % SLICE_TINTS.length]} style={{ width: `${s.percent}%` }} />
            ))}
          </div>
          <ul className="hc-legend" aria-hidden="true">
            {slices.map((s, i) => (
              <li key={s.userId}>
                <i className={SLICE_TINTS[i % SLICE_TINTS.length]} />
                <span className="hc-legend-name">{s.name}</span>
                <span className="hc-legend-pct">{s.percent}%</span>
              </li>
            ))}
          </ul>
          {note ? <p className="hc-note">{note}</p> : null}
        </div>
      ) : null}

      {bars.length >= 2 ? (
        <div className="hc-block">
          <h3 className="md-sub">
            <Pulse size={15} aria-hidden="true" />
            Along the follow-ups
          </h3>
          {summary ? <p className="hc-note">{summary}</p> : null}
          <ol className="hc-trend" aria-label="Agenda coverage and decisions, oldest meeting first">
            {bars.map((b) => {
              const label = `${b.isCurrent ? "This meeting" : b.title}${b.date ? `, ${b.date}` : ""}: ${
                b.coverage === null ? "no agenda" : `${b.coverage}% covered`
              }, ${countLabel(b.decisions, "decision", "decisions")}`;
              const bar = (
                <>
                  <span className="hc-bar-wrap" aria-hidden="true">
                    <span className="hc-bar-pct">{b.coverage === null ? "" : `${b.coverage}%`}</span>
                    <span className="hc-bar" style={{ height: `${Math.max(4, b.coverage ?? 0)}%` }} />
                  </span>
                  <span className="hc-bar-date" aria-hidden="true">
                    {b.isCurrent ? "This one" : b.date ?? ""}
                  </span>
                  <span className="sr-only">{label}</span>
                </>
              );
              return (
                <li key={b.meetingId} className={b.isCurrent ? "is-current" : b.coverage === null ? "is-none" : undefined}>
                  {b.isCurrent ? (
                    <span className="hc-bar-col">{bar}</span>
                  ) : (
                    <Link href={`/meetings/${b.meetingId}`} className="hc-bar-col tap" title={label}>
                      {bar}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
