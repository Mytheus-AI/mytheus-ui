import Link from "next/link";
import { BookmarkSimple, CheckSquare, Handshake, ListChecks, Question, Robot, Target } from "@phosphor-icons/react/ssr";
import type { BrainRead } from "@/lib/api/meeting-brain";
import type { MeetingBrief, OrgGoal } from "@/lib/api/meeting-brain-types";
import { STATUS_LABEL } from "@/components/meetings/agenda-status";
import { LatestStatus } from "./LatestStatus";

/* Your brief for a meeting (mytheus-docs ADR-0039 B8), on the meeting page at #brief: the link the
   ten-minute reminder opens. What is yours to bring: the agenda items you own, your open actions
   from the meeting this follows (with the latest status you or others gave), your saved
   questions, and who is sending their Myte instead, with what they asked it to say. Only you
   see it. A server component; the groups sit side by side when the card is wide. */

const dueFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function due(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : `due ${dueFormatter.format(d)}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** One sentence on what is yours, or null when nothing is. */
export function briefLead(b: MeetingBrief): string | null {
  const parts: string[] = [];
  if (b.my_agenda_items.length) parts.push(`own ${plural(b.my_agenda_items.length, "agenda item", "agenda items")}`);
  if (b.my_open_actions.length) parts.push(`have ${plural(b.my_open_actions.length, "open action", "open actions")} from last time`);
  if (b.saved_questions.length) parts.push(`saved ${plural(b.saved_questions.length, "question", "questions")}`);
  const promises = b.previous_minutes?.my_promises.length ?? 0;
  if (promises) parts.push(`made ${plural(promises, "promise", "promises")} last time`);
  if (parts.length === 0) return null;
  const last = parts.pop();
  return `You ${parts.length ? `${parts.join(", ")} and ${last}` : last}.`;
}

export function BriefSection({
  brief,
  nameOf,
  goals = [],
}: {
  brief: BrainRead<MeetingBrief>;
  nameOf: (id: string) => string;
  goals?: OrgGoal[];
}) {
  return (
    <section className="mx-card mx-card-pad br" id="brief" aria-labelledby="br-h" tabIndex={-1}>
      <div className="mx-card-head">
        <h2 className="mx-card-title" id="br-h">
          Your brief
        </h2>
        <span className="mx-card-note">Only you see this</span>
      </div>
      {brief.ok ? (
        <BriefBody b={brief.data} nameOf={nameOf} goals={goals} />
      ) : brief.reason === "none" ? (
        <p className="br-empty">Your brief is for people invited to this meeting.</p>
      ) : (
        <p className="br-empty" role="status">
          Your brief couldn&rsquo;t be loaded just now. Reload the page to try again.
        </p>
      )}
    </section>
  );
}

function BriefBody({ b, nameOf, goals }: { b: MeetingBrief; nameOf: (id: string) => string; goals: OrgGoal[] }) {
  const lead = briefLead(b);
  const goalOf = new Map(goals.map((g) => [g.id, g.title]));
  const pm = b.previous_minutes;
  const mine =
    b.my_agenda_items.length +
    b.my_open_actions.length +
    b.saved_questions.length +
    (pm ? pm.open_items.length + pm.unanswered_questions.length + pm.my_promises.length : 0);
  return (
    <>
      <p className="br-lead">
        {lead ?? "Nothing is waiting on you for this one: no agenda items, open actions or saved questions."}
        {b.previous_meeting ? (
          <>
            {" "}
            It follows{" "}
            <Link href={`/meetings/${b.previous_meeting.id}`} className="cf-link">
              {b.previous_meeting.title}
            </Link>
            .
          </>
        ) : null}
      </p>

      {mine > 0 || b.proxies.length > 0 ? (
        <div className="br-groups">
          {b.my_agenda_items.length > 0 ? (
            <div className="br-group">
              <h3 className="cf-sub">
                <ListChecks size={15} aria-hidden="true" />
                Your agenda items
              </h3>
              <ul className="cf-list">
                {b.my_agenda_items.map((it) => {
                  const goal = it.goal_id ? goalOf.get(it.goal_id) : null;
                  const meta = [it.duration_minutes ? `${it.duration_minutes} min` : null, STATUS_LABEL[it.status]]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <li key={it.id} className="br-item">
                      <span className="cf-action-head">
                        {it.title}
                        <small>{meta}</small>
                      </span>
                      {goal ? (
                        <span className="br-goal">
                          <Target size={13} aria-hidden="true" />
                          <span className="sr-only">Serves the goal </span>
                          {goal}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {b.my_open_actions.length > 0 ? (
            <div className="br-group">
              <h3 className="cf-sub">
                <CheckSquare size={15} aria-hidden="true" />
                Your open actions
              </h3>
              <ul className="cf-list">
                {b.my_open_actions.map((a) => (
                  <li key={a.id} className="cf-action">
                    <span className="cf-action-head">
                      {a.title}
                      {due(a.due_date) ? <small>{due(a.due_date)}</small> : null}
                    </span>
                    <LatestStatus status={a.latest_status} />
                  </li>
                ))}
              </ul>
              {b.my_open_actions.some((a) => !a.latest_status) ? (
                <Link href="/work/updates" className="br-more">
                  Give a quick status
                </Link>
              ) : null}
            </div>
          ) : null}

          {b.saved_questions.length > 0 ? (
            <div className="br-group">
              <h3 className="cf-sub">
                <BookmarkSimple size={15} aria-hidden="true" />
                Questions you saved
              </h3>
              <ul className="cf-list">
                {b.saved_questions.map((q) => (
                  <li key={q.id}>{q.question}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {pm && pm.my_promises.length > 0 ? (
            <div className="br-group">
              <h3 className="cf-sub">
                <Handshake size={15} aria-hidden="true" />
                Your promises from last time
              </h3>
              <ul className="cf-list">
                {pm.my_promises.map((p) => (
                  <li key={p.text} className="cf-action">
                    <span className="cf-action-head">
                      {p.text}
                      {p.due ? <small>by {p.due}</small> : null}
                    </span>
                    {p.to_name ? <span className="br-none">To {p.to_name}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pm && pm.open_items.length > 0 ? (
            <div className="br-group">
              <h3 className="cf-sub">
                <CheckSquare size={15} aria-hidden="true" />
                Still open from the minutes
              </h3>
              <ul className="cf-list">
                {pm.open_items.map((o) => (
                  <li key={o.text} className="cf-action">
                    <span className="cf-action-head">
                      {o.text}
                      {o.due ? <small>by {o.due}</small> : null}
                    </span>
                    <span className="br-none">
                      {o.mine ? "Yours" : o.owner_user_id ? nameOf(o.owner_user_id) : o.owner_name ?? "No owner yet"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pm && pm.unanswered_questions.length > 0 ? (
            <div className="br-group">
              <h3 className="cf-sub">
                <Question size={15} aria-hidden="true" />
                Left unanswered last time
              </h3>
              <ul className="cf-list">
                {pm.unanswered_questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {b.proxies.length > 0 ? (
            <div className="br-group">
              <h3 className="cf-sub">
                <Robot size={15} aria-hidden="true" />
                Sending their Myte
              </h3>
              <ul className="cf-list">
                {b.proxies.map((p) => (
                  <li key={p.user_id} className="cf-action">
                    <span className="cf-action-head">{nameOf(p.user_id)}</span>
                    {p.proxy_update ? <span className="br-proxy">{p.proxy_update}</span> : <span className="br-none">No update given</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
