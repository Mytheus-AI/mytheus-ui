import Link from "next/link";
import { ArrowBendDownRight, BookmarkSimple, CheckSquare, Scales } from "@phosphor-icons/react/ssr";
import type { CarryForward } from "@/lib/api/meeting-agenda-types";

/* "Carried forward" on the meeting page (ADR-0038 D6, D11): what the meeting this one follows
   left open. Its confirmed decisions, its action items not yet done, and your own saved
   questions from it (nobody else's). Only shown on a follow-up. A list that could not be read
   says so; an empty one says nothing was left open. A server component: no interaction. */

const dueFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function due(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : `due ${dueFormatter.format(d)}`;
}

export function CarryForwardCard({
  previous,
  data,
  nameOf,
}: {
  previous: { id: string; title: string };
  /** null: it could not be loaded. */
  data: CarryForward | null;
  nameOf: (id: string) => string;
}) {
  const empty = data && data.decisions.length === 0 && data.open_actions.length === 0 && data.saved_questions.length === 0;
  return (
    <section className="mx-card mx-card-pad cf-card" aria-labelledby="cf-h">
      <div className="mx-card-head">
        <h2 className="mx-card-title" id="cf-h">
          Carried forward
        </h2>
      </div>
      <p className="mx-help">
        From{" "}
        <Link href={`/meetings/${previous.id}`} className="cf-link">
          {previous.title}
        </Link>
        . The meeting agent raises open items nobody has brought up.
      </p>

      {data === null ? (
        <p className="cf-empty" role="status">
          What carried forward couldn&rsquo;t be loaded just now. Reload the page to try again.
        </p>
      ) : empty ? (
        <p className="cf-empty">Nothing was left open. No open tasks, decisions or saved questions.</p>
      ) : (
        <div className="cf-groups">
          {data.decisions.length > 0 ? (
            <div>
              <h3 className="cf-sub">
                <Scales size={15} aria-hidden="true" />
                Decisions made
              </h3>
              <ul className="cf-list">
                {data.decisions.map((d) => (
                  <li key={d.id}>{d.content}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.open_actions.length > 0 ? (
            <div>
              <h3 className="cf-sub">
                <CheckSquare size={15} aria-hidden="true" />
                Still open
              </h3>
              <ul className="cf-list">
                {data.open_actions.map((a) => {
                  const meta = [a.owner_user_id ? nameOf(a.owner_user_id) : null, due(a.due_date)].filter(Boolean).join(", ");
                  return (
                    <li key={a.id}>
                      {a.title}
                      {meta ? <small>{meta}</small> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {data.saved_questions.length > 0 ? (
            <div>
              <h3 className="cf-sub">
                <BookmarkSimple size={15} aria-hidden="true" />
                Your saved questions
              </h3>
              <ul className="cf-list">
                {data.saved_questions.map((q) => (
                  <li key={q.id}>
                    <ArrowBendDownRight size={14} aria-hidden="true" className="cf-q-ico" />
                    {q.question}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
