"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MutableRefObject, type ReactNode } from "react";
import {
  ArrowClockwise,
  CheckCircle,
  HandHeart,
  LockSimple,
  NotePencil,
  Question,
  Scales,
  UsersThree,
} from "@phosphor-icons/react";
import { loadFollowUp, loadMinutes } from "@/app/actions/minutes";
import { Chip } from "@/components/meetings/Chip";
import type { Read } from "@/lib/api/minutes";
import { FollowUpComposer } from "./FollowUpComposer";
import { ShareRecap } from "./ShareRecap";
import {
  MINUTES_POLL_MS,
  decisionStatus,
  dispatchSummary,
  hasContent,
  ownerLine,
  shouldPoll,
  unavailableCopy,
  type FollowUp,
  type MeetingMinutes,
  type MinutesView,
  type ShareLink,
} from "./minutes-model";

/* The Minutes card on an ended meeting's page (minutes for everyone). Two sets of minutes, side
   by side on a wide screen and as two tabs on a narrow one:

   - For everyone: the shared minutes, the same for every participant and what the public recap
     and the follow-up email are made from: decisions with their status, open items with owners,
     questions nobody answered.
   - Just for you: the same written for you, plus your promises, which only you ever see.

   While the minutes are being written the card says so and checks again every 10 seconds (for up
   to 15 minutes, then it offers a refresh). The card's header holds the two things you do with
   minutes: share the recap, and (the host) send the follow-up. */

type Tab = "shared" | "mine";

export function MinutesSection({
  meetingId,
  meetingTitle,
  initial,
  followUp: initialFollowUp,
  links,
  isHost,
  confidential,
}: {
  meetingId: string;
  meetingTitle: string;
  initial: Read<MinutesView>;
  followUp: Read<FollowUp>;
  links: Read<ShareLink[]>;
  isHost: boolean;
  confidential: boolean;
}) {
  const ids = useId();
  const [view, setView] = useState<Read<MinutesView>>(initial);
  const [followUp, setFollowUp] = useState<Read<FollowUp>>(initialFollowUp);
  const [tab, setTab] = useState<Tab>("shared");
  const [checking, setChecking] = useState(false);
  const started = useRef(Date.now());
  const tabs = useRef<Record<Tab, HTMLButtonElement | null>>({ shared: null, mine: null });

  const state = view.ok ? view.data.state : null;
  const polling = shouldPoll(state, Date.now() - started.current);

  const refresh = useCallback(async () => {
    setChecking(true);
    const next = await loadMinutes(meetingId);
    setChecking(false);
    setView((prev) => (next.ok || !prev.ok ? next : prev));
    if (next.ok && next.data.state !== "pending") {
      const f = await loadFollowUp(meetingId);
      if (f.ok) setFollowUp(f);
    }
  }, [meetingId]);

  useEffect(() => {
    if (!polling) return;
    const t = window.setTimeout(() => void refresh(), MINUTES_POLL_MS);
    return () => window.clearTimeout(t);
  }, [polling, view, refresh]);

  const fu = followUp.ok ? followUp.data : null;
  const host = fu?.is_host ?? isHost;
  const isConfidential = fu?.confidential ?? confidential;
  const lastLine = fu ? dispatchSummary(fu.last_result) : null;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next: Tab = e.key === "Home" ? "shared" : e.key === "End" ? "mine" : tab === "shared" ? "mine" : "shared";
    setTab(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="mx-card mn" aria-labelledby={`${ids}-h`}>
      <header className="mn-head">
        <div className="mn-head-text">
          <h2 className="mn-title" id={`${ids}-h`}>
            Minutes
          </h2>
          <p className="mn-lead">
            Written by Mytheus after the call: what was decided, what is still open, and what nobody answered.
          </p>
        </div>
        <div className="mn-acts">
          <ShareRecap meetingId={meetingId} initialLinks={links} isHost={host} confidential={isConfidential} />
          {fu && fu.is_host ? (
            <FollowUpComposer
              meetingId={meetingId}
              meetingTitle={meetingTitle}
              followUp={fu}
              onSent={(result) =>
                setFollowUp({
                  ok: true,
                  data: {
                    ...fu,
                    last_result: result,
                    last_sent_at: result.sent_at ?? new Date().toISOString(),
                    awaiting_minutes: false,
                  },
                })
              }
            />
          ) : null}
        </div>
      </header>

      {fu && fu.is_host && (lastLine || fu.awaiting_minutes) ? (
        <p className="mn-status" role="status">
          {fu.awaiting_minutes ? "The follow-up sends by itself when the minutes are ready." : `Follow-up: ${lastLine}`}
        </p>
      ) : null}

      <div className="mn-body" aria-busy={state === "pending"}>
        {!view.ok ? (
          view.reason === "none" ? (
            <p className="mn-empty-line">Minutes are for the people who were in this meeting.</p>
          ) : (
            <div className="mn-calm">
              <p>
                <strong>The minutes could not be loaded.</strong> Nothing is lost; try again in a moment.
              </p>
              <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => void refresh()} disabled={checking}>
                <ArrowClockwise size={16} weight="bold" aria-hidden="true" className={checking ? "motion-safe:animate-spin" : ""} />
                {checking ? "Trying again..." : "Try again"}
              </button>
            </div>
          )
        ) : state === "not_ended" ? (
          <p className="mn-empty-line">The minutes are written when the meeting ends.</p>
        ) : state === "pending" ? (
          <Pending polling={polling} checking={checking} onRefresh={() => void refresh()} />
        ) : state === "unavailable" ? (
          <Unavailable minutes={view.data.shared} />
        ) : (
          <Ready view={view.data} tab={tab} setTab={setTab} onTabKey={onTabKey} tabs={tabs} ids={ids} />
        )}
      </div>
    </section>
  );
}

function Pending({ polling, checking, onRefresh }: { polling: boolean; checking: boolean; onRefresh: () => void }) {
  return (
    <div className="mn-pending" role="status">
      <svg viewBox="0 0 160 24" className="mn-pending-line" aria-hidden="true">
        <path d="M2 14 C30 4 50 22 80 12 S130 6 158 12" pathLength={1} />
      </svg>
      <div>
        <p className="mn-pending-title">{polling ? "Writing the minutes" : "The minutes are taking longer than usual"}</p>
        <p className="mn-quiet">
          {polling
            ? "Usually ready a minute or two after the call ends. This card updates by itself."
            : "They are still on their way. Check again in a little while."}
        </p>
      </div>
      {!polling ? (
        <button type="button" className="mx-btn is-outline is-sm tap" onClick={onRefresh} disabled={checking}>
          <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
          {checking ? "Checking..." : "Check again"}
        </button>
      ) : null}
      <div className="mn-skel" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function Unavailable({ minutes }: { minutes: MeetingMinutes | null | undefined }) {
  const copy = unavailableCopy(minutes?.reason);
  return (
    <div className="mn-calm" role="status">
      <p>
        <strong>{copy.title}.</strong> {copy.body}
      </p>
    </div>
  );
}

function Ready({
  view,
  tab,
  setTab,
  onTabKey,
  tabs,
  ids,
}: {
  view: MinutesView;
  tab: Tab;
  setTab: (t: Tab) => void;
  onTabKey: (e: KeyboardEvent<HTMLButtonElement>) => void;
  tabs: MutableRefObject<Record<Tab, HTMLButtonElement | null>>;
  ids: string;
}) {
  const panels: { key: Tab; label: string; icon: typeof UsersThree }[] = [
    { key: "shared", label: "For everyone", icon: UsersThree },
    { key: "mine", label: "Just for you", icon: LockSimple },
  ];
  return (
    <>
      <div className="mn-tabs" role="tablist" aria-label="Minutes">
        {panels.map((p) => (
          <button
            key={p.key}
            ref={(el) => {
              tabs.current[p.key] = el;
            }}
            type="button"
            role="tab"
            id={`${ids}-tab-${p.key}`}
            aria-selected={tab === p.key}
            aria-controls={`${ids}-panel-${p.key}`}
            tabIndex={tab === p.key ? 0 : -1}
            className="mn-tab tap"
            onClick={() => setTab(p.key)}
            onKeyDown={onTabKey}
          >
            <p.icon size={16} aria-hidden="true" />
            {p.label}
          </button>
        ))}
      </div>
      <div className="mn-panels">
        <div
          role="tabpanel"
          id={`${ids}-panel-shared`}
          aria-labelledby={`${ids}-tab-shared`}
          className={`mn-panel${tab === "shared" ? " is-active" : ""}`}
        >
          <h3 className="mn-panel-title">
            <UsersThree size={18} aria-hidden="true" />
            For everyone
          </h3>
          <p className="mn-panel-note">The same for everyone in the meeting. This is what a shared recap shows.</p>
          <MinutesBody minutes={view.shared ?? null} scope="shared" />
        </div>
        <div
          role="tabpanel"
          id={`${ids}-panel-mine`}
          aria-labelledby={`${ids}-tab-mine`}
          className={`mn-panel is-mine${tab === "mine" ? " is-active" : ""}`}
        >
          <h3 className="mn-panel-title">
            <LockSimple size={18} aria-hidden="true" />
            Just for you
          </h3>
          <p className="mn-panel-note">Only you can see these, and they are never shared.</p>
          <MinutesBody minutes={view.mine ?? null} scope="mine" />
        </div>
      </div>
    </>
  );
}

function MinutesBody({ minutes, scope }: { minutes: MeetingMinutes | null; scope: Tab }) {
  if (!minutes || !hasContent(minutes)) {
    return (
      <p className="mn-empty-line">
        {scope === "mine"
          ? "Nothing came up just for you: no promises of yours and nothing left to you."
          : "Nothing to record: no decisions, open items or unanswered questions came up."}
      </p>
    );
  }
  const decisions = minutes.decisions ?? [];
  const items = minutes.open_items ?? [];
  const questions = minutes.unanswered_questions ?? [];
  const promises = scope === "mine" ? (minutes.promises ?? []) : [];
  return (
    <div className="mn-content">
      {minutes.summary.trim() ? <p className="mn-summary">{minutes.summary}</p> : null}
      {decisions.length > 0 ? (
        <Group icon={Scales} title="Decisions" count={decisions.length}>
          {decisions.map((d, i) => {
            const st = decisionStatus(d.status);
            return (
              <li key={`d${i}`} className="mn-row">
                <span className="mn-row-text">{d.text}</span>
                <Chip tone={st.tone}>{st.label}</Chip>
              </li>
            );
          })}
        </Group>
      ) : null}
      {items.length > 0 ? (
        <Group icon={CheckCircle} title="Still open" count={items.length}>
          {items.map((o, i) => {
            const meta = ownerLine(o.owner_name, o.due);
            return (
              <li key={`o${i}`} className="mn-row is-stack">
                <span className="mn-row-text">{o.text}</span>
                {meta ? <span className="mn-row-meta">{meta}</span> : <span className="mn-row-meta">No owner yet</span>}
              </li>
            );
          })}
        </Group>
      ) : null}
      {questions.length > 0 ? (
        <Group icon={Question} title="Nobody answered" count={questions.length}>
          {questions.map((q, i) => (
            <li key={`q${i}`} className="mn-row is-stack">
              <span className="mn-row-text">{q.text}</span>
              {q.asked_by_name ? <span className="mn-row-meta">Asked by {q.asked_by_name}</span> : null}
            </li>
          ))}
        </Group>
      ) : null}
      {promises.length > 0 ? (
        <Group icon={HandHeart} title="Your promises" count={promises.length} privateNote>
          {promises.map((p, i) => {
            const meta = [p.to_name ? `To ${p.to_name}` : null, p.due ? `by ${p.due}` : null].filter(Boolean).join(", ");
            return (
              <li key={`p${i}`} className="mn-row is-stack">
                <span className="mn-row-text">{p.text}</span>
                {meta ? <span className="mn-row-meta">{meta}</span> : null}
              </li>
            );
          })}
        </Group>
      ) : scope === "mine" ? (
        <p className="mn-quiet mn-nopromise">
          <NotePencil size={16} aria-hidden="true" /> You made no promises in this meeting.
        </p>
      ) : null}
    </div>
  );
}

function Group({
  icon: Icon,
  title,
  count,
  privateNote = false,
  children,
}: {
  icon: typeof Scales;
  title: string;
  count: number;
  privateNote?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mn-group">
      <h4 className="mn-group-title">
        <Icon size={16} aria-hidden="true" />
        {title}
        <span className="mn-group-count">{count}</span>
        {privateNote ? (
          <Chip tone="accent" className="mn-private">
            <LockSimple size={12} aria-hidden="true" />
            Private to you
          </Chip>
        ) : null}
      </h4>
      <ul className="mn-rows">{children}</ul>
    </div>
  );
}
