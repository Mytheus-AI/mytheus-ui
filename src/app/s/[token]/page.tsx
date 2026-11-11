import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  Scissors,
  CheckSquare,
  LinkBreak,
  ListChecks,
  LockSimple,
  Question,
  Scales,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react/ssr";
import { Chip } from "@/components/meetings/Chip";
import { THEME_INIT } from "@/components/app/theme-init";
import { Wordmark } from "@/components/site/Wordmark";
import { LocalTime } from "@/components/share/LocalTime";
import {
  agendaLabel,
  decisionStatus,
  ownerLine,
  recapIsEmpty,
  type DecisionRecord,
  type MeetingRecap,
  type PublicShare,
} from "@/components/minutes/minutes-model";
import { ClipPlayer } from "@/components/share/ClipPlayer";
import { lengthLabel, type PublicClipShare } from "@/components/recording/recording-model";
import { fetchPublicPage } from "@/lib/api/public-share";
import "@/styles/app-theme.css";
import "@/styles/share-page.css";
import "@/styles/meeting-recording.css";

/* A shared recap, decision record or clip (`/s/{token}`), for anyone holding the link: no account,
   no app chrome. A clip (recording playback, wave 3) shows its words always and its video only when
   the sharer included it. Read on the server from the public share route (the signed token is the
   credential); nothing private is ever on it (the backend builds it from confirmed facts and the
   meeting's shared minutes only). Branded, readable, both themes, prints cleanly. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared from Mytheus",
  description: "A meeting recap, decision record or clip shared from Mytheus.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

const MARKETING = (process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? "").replace(/\/$/, "") || "/";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-app sh" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <header className="sh-top">
        <a href={MARKETING} className="sh-brand" aria-label="Mytheus">
          <Wordmark size={22} textClassName="text-[20px]" />
        </a>
      </header>
      <main className="sh-main" id="main">
        {children}
      </main>
      <footer className="sh-foot">
        <a href={MARKETING} className="sh-made">
          Made with <span className="wordmark">Mytheus</span>
        </a>
        <p>Every participant gets a personal AI agent. Mytheus writes the minutes, so nobody has to.</p>
      </footer>
    </div>
  );
}

function Message({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Frame>
      <section className="sh-msg" aria-labelledby="sh-msg-h">
        <span className="sh-msg-ico" aria-hidden="true">
          {icon}
        </span>
        <h1 id="sh-msg-h" className="sh-title">
          {title}
        </h1>
        <p className="sh-lead">{body}</p>
      </section>
    </Frame>
  );
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const page = await fetchPublicPage(params.token);
  const read = page.read;
  if (read.kind === "gone") {
    return read.reason === "revoked" ? (
      <Message
        icon={<LinkBreak size={28} />}
        title="This link was turned off"
        body="Whoever shared it has stopped sharing this page. Ask them for a new link if you still need it."
      />
    ) : (
      <Message
        icon={<LinkBreak size={28} />}
        title="This link has expired"
        body="Shared links only work for a set time. Ask whoever sent it for a new one."
      />
    );
  }
  if (read.kind === "not_found") {
    return (
      <Message
        icon={<LinkBreak size={28} />}
        title="This link does not work"
        body="It may have been copied incompletely, or what it pointed to is no longer shared. Check the link, or ask whoever sent it."
      />
    );
  }
  if (read.kind === "error") {
    return (
      <Message
        icon={<LinkBreak size={28} />}
        title="This page could not be loaded right now"
        body="Nothing is wrong with the link. Try again in a minute."
      />
    );
  }
  if (page.type === "clip" && page.read.kind === "ok") {
    return (
      <Frame>
        <ClipPage share={page.read.share} />
      </Frame>
    );
  }
  if (page.type !== "share" || page.read.kind !== "ok") return null;
  const share = page.read.share;
  return (
    <Frame>
      {share.kind === "decision_record" && share.decision ? (
        <DecisionPage share={share} record={share.decision} />
      ) : share.recap ? (
        <RecapPage share={share} recap={share.recap} />
      ) : (
        <section className="sh-msg">
          <h1 className="sh-title">Nothing to show</h1>
        </section>
      )}
    </Frame>
  );
}

function SharedLine({ share }: { share: PublicShare }) {
  return (
    <p className="sh-shared">
      {share.shared_by_name ? `Shared by ${share.shared_by_name}. ` : "Shared from Mytheus. "}
      This page is read-only and works until <LocalTime iso={share.expires_at} />.
    </p>
  );
}

function Section({
  id,
  icon,
  title,
  count,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="sh-sec" aria-labelledby={id}>
      <h2 className="sh-sec-title" id={id}>
        <span aria-hidden="true">{icon}</span>
        {title}
        {count !== undefined ? <span className="sh-count">{count}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function RecapPage({ share, recap }: { share: PublicShare; recap: MeetingRecap }) {
  const m = recap.minutes ?? null;
  const minutesDecisions = m?.decisions ?? [];
  const confirmed = recap.decisions;
  const people = recap.participant_names;
  return (
    <article className="sh-doc" aria-labelledby="sh-title">
      <header className="sh-hero">
        <p className="kicker">Meeting recap</p>
        <h1 className="sh-title" id="sh-title">
          {recap.title}
        </h1>
        <ul className="sh-meta">
          {recap.scheduled_start ? (
            <li>
              <CalendarBlank size={18} aria-hidden="true" />
              <LocalTime iso={recap.scheduled_start} withTime />
            </li>
          ) : null}
          {recap.host_name ? (
            <li>
              <UserCircle size={18} aria-hidden="true" />
              Hosted by {recap.host_name}
            </li>
          ) : null}
          {people.length > 0 ? (
            <li>
              <UsersThree size={18} aria-hidden="true" />
              {people.length} {people.length === 1 ? "person" : "people"}
            </li>
          ) : null}
        </ul>
        {m?.summary ? <p className="sh-summary">{m.summary}</p> : null}
      </header>

      {recapIsEmpty(recap) ? (
        <p className="sh-empty">Nothing was decided or confirmed in this meeting, and no minutes were written for it.</p>
      ) : (
        <div className="sh-grid">
          <div className="sh-col">
            {minutesDecisions.length > 0 ? (
              <Section id="sh-dec" icon={<Scales size={20} />} title="Decisions" count={minutesDecisions.length}>
                <ul className="sh-list">
                  {minutesDecisions.map((d, i) => {
                    const st = decisionStatus(d.status);
                    return (
                      <li key={i} className="sh-item">
                        <span className="sh-item-text">{d.text}</span>
                        <Chip tone={st.tone}>{st.label}</Chip>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            ) : confirmed.length > 0 ? (
              <Section id="sh-dec" icon={<Scales size={20} />} title="Decisions" count={confirmed.length}>
                <ul className="sh-list">
                  {confirmed.map((d) => (
                    <li key={d.id} className="sh-item is-stack">
                      <span className="sh-item-text">{d.content}</span>
                      {d.rationale ? <span className="sh-item-meta">{d.rationale}</span> : null}
                      {d.status === "superseded" ? <Chip tone="low">Replaced later</Chip> : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {recap.actions.length > 0 ? (
              <Section id="sh-act" icon={<CheckSquare size={20} />} title="Actions" count={recap.actions.length}>
                <ul className="sh-list">
                  {recap.actions.map((a) => (
                    <li key={a.id} className="sh-item">
                      <span className="sh-item-main">
                        <span className="sh-item-text">{a.content}</span>
                        {ownerLine(a.owner_name, a.due_date) ? (
                          <span className="sh-item-meta">{ownerLine(a.owner_name, a.due_date)}</span>
                        ) : null}
                      </span>
                      <Chip tone={a.status === "done" ? "ok" : "neutral"}>{a.status === "done" ? "Done" : "Open"}</Chip>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {m && m.open_items.length > 0 ? (
              <Section id="sh-open" icon={<CheckCircle size={20} />} title="Still open" count={m.open_items.length}>
                <ul className="sh-list">
                  {m.open_items.map((o, i) => (
                    <li key={i} className="sh-item is-stack">
                      <span className="sh-item-text">{o.text}</span>
                      <span className="sh-item-meta">{ownerLine(o.owner_name, o.due) || "No owner yet"}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {m && m.unanswered_questions.length > 0 ? (
              <Section
                id="sh-q"
                icon={<Question size={20} />}
                title="Questions nobody answered"
                count={m.unanswered_questions.length}
              >
                <ul className="sh-list">
                  {m.unanswered_questions.map((q, i) => (
                    <li key={i} className="sh-item is-stack">
                      <span className="sh-item-text">{q.text}</span>
                      {q.asked_by_name ? <span className="sh-item-meta">Asked by {q.asked_by_name}</span> : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </div>

          <aside className="sh-col sh-aside" aria-label="About this meeting">
            {people.length > 0 ? (
              <Section id="sh-people" icon={<UsersThree size={20} />} title="Who was there">
                <ul className="sh-people">
                  {people.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Section>
            ) : null}
            {recap.agenda.length > 0 ? (
              <Section id="sh-agenda" icon={<ListChecks size={20} />} title="Agenda">
                <ol className="sh-agenda">
                  {recap.agenda.map((a, i) => (
                    <li key={i}>
                      <span className="sh-item-text">{a.title}</span>
                      <span className="sh-item-meta">
                        {agendaLabel(a.status)}
                        {a.owner_name ? `, ${a.owner_name}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>
            ) : null}
          </aside>
        </div>
      )}
      <SharedLine share={share} />
    </article>
  );
}

function DecisionPage({ share, record }: { share: PublicShare; record: DecisionRecord }) {
  return (
    <article className="sh-doc" aria-labelledby="sh-title">
      <header className="sh-hero">
        <p className="kicker">Decision record</p>
        <h1 className="sh-title is-quote" id="sh-title">
          {record.content}
        </h1>
        <ul className="sh-meta">
          <li>
            <Chip tone={record.status === "confirmed" ? "ok" : "low"}>
              {record.status === "confirmed" ? "In force" : "Replaced by a later decision"}
            </Chip>
          </li>
          <li>
            <CalendarBlank size={18} aria-hidden="true" />
            Decided <LocalTime iso={record.decided_at} />
          </li>
          <li>
            <UsersThree size={18} aria-hidden="true" />
            In {record.meeting_title}
          </li>
          {record.confirmed_by_name ? (
            <li>
              <UserCircle size={18} aria-hidden="true" />
              Confirmed by {record.confirmed_by_name}
            </li>
          ) : null}
        </ul>
        {record.rationale ? <p className="sh-summary">{record.rationale}</p> : null}
      </header>

      <div className="sh-grid">
        <div className="sh-col">
          {record.lineage.length > 1 ? (
            <Section id="sh-lin" icon={<Scales size={20} />} title="How this decision came about">
              <ol className="sh-lineage">
                {record.lineage.map((step, i) => (
                  <li key={i} className={step.relation === "subject" ? "is-subject" : ""}>
                    <span className="sh-bead" aria-hidden="true" />
                    {step.visible ? (
                      <div>
                        <p className="sh-item-text">{step.content}</p>
                        <p className="sh-item-meta">
                          {step.relation === "subject"
                            ? "This decision"
                            : step.relation === "earlier"
                              ? "Earlier decision"
                              : "Later decision"}
                          {step.meeting_title ? `, ${step.meeting_title}` : ""}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="sh-item-text sh-withheld">
                          <LockSimple size={16} aria-hidden="true" /> A decision from a meeting this link does not cover
                        </p>
                        <p className="sh-item-meta">
                          {step.relation === "earlier" ? "Came before this one" : "Replaced this one later"}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}
          {record.meeting_actions.length > 0 ? (
            <Section
              id="sh-act"
              icon={<CheckSquare size={20} />}
              title="Actions from the same meeting"
              count={record.meeting_actions.length}
            >
              <ul className="sh-list">
                {record.meeting_actions.map((a) => (
                  <li key={a.id} className="sh-item">
                    <span className="sh-item-main">
                      <span className="sh-item-text">{a.content}</span>
                      {ownerLine(a.owner_name, a.due_date) ? (
                        <span className="sh-item-meta">{ownerLine(a.owner_name, a.due_date)}</span>
                      ) : null}
                    </span>
                    <Chip tone={a.status === "done" ? "ok" : "neutral"}>{a.status === "done" ? "Done" : "Open"}</Chip>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {record.lineage.length <= 1 && record.meeting_actions.length === 0 ? (
            <p className="sh-empty">This decision stands on its own: nothing came before it and no actions were attached.</p>
          ) : null}
        </div>
      </div>
      <SharedLine share={share} />
    </article>
  );
}

function ClipPage({ share }: { share: PublicClipShare }) {
  const clip = share.clip;
  return (
    <article className="sh-doc" aria-labelledby="sh-title">
      <header className="sh-hero">
        <p className="kicker">Clip from a meeting</p>
        <h1 className="sh-title" id="sh-title">
          {clip.title}
        </h1>
        <ul className="sh-meta">
          <li>
            <UsersThree size={18} aria-hidden="true" />
            From {clip.meeting_title}
          </li>
          {clip.meeting_start ? (
            <li>
              <CalendarBlank size={18} aria-hidden="true" />
              <LocalTime iso={clip.meeting_start} />
            </li>
          ) : null}
          <li>
            <Clock size={18} aria-hidden="true" />
            {lengthLabel(clip.duration_ms)}
          </li>
          <li>
            <Scissors size={18} aria-hidden="true" />
            {clip.video.status === "not_included" ? "Words only" : "Video and words"}
          </li>
        </ul>
      </header>
      <ClipPlayer clip={clip} />
      <p className="sh-shared">
        {share.shared_by_name ? `Shared by ${share.shared_by_name}. ` : "Shared from Mytheus. "}
        This page is read-only, shows only this part of the meeting, and works until <LocalTime iso={share.expires_at} />.
      </p>
    </article>
  );
}
