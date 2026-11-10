"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BookmarkSimple,
  Bell,
  CheckSquare,
  GearSix,
  Gauge,
  LinkBreak,
  Lock,
  NotePencil,
  PushPin,
  Question,
  Scales,
  UserPlus,
  UsersThree,
  Warning,
  Waveform,
  type Icon,
} from "@phosphor-icons/react";
import { useCallToast } from "@/components/call/CallToast";
import type { AgentSidebarCard, SidebarPriority } from "@/lib/mock/data";
import type { LiveNote } from "@/lib/realtime/notes";
import type { Candidate } from "@/lib/realtime/candidates";
import { CandidateCard, type CandidateOutcome } from "@/components/sidebar/CandidateCard";
import type { Suggestion } from "@/lib/realtime/suggestions";
import { SuggestionCard, type SuggestionOutcome } from "@/components/sidebar/SuggestionCard";
import type { ContextFill } from "@/lib/realtime/contextFills";
import { ContextFillCard, type ContextFillOutcome } from "@/components/sidebar/ContextFillCard";
import { alertsNeedingAttention, bannerAlerts, cardAlerts, type Alert } from "@/lib/realtime/alerts";
import { AlertBanner, AlertCard, type AlertOutcome } from "@/components/sidebar/AlertCard";

/* The agent sidebar - the product's centerpiece - as the Agent tab of the room's panel: a conflict
   banner pinned above everything, then Needs you, Context for you, My notes, Saved for later and
   the Activity feed. Where an answer is sourced, the coral line runs from what the agent said to
   where it came from (`.nfy-cites`): the line's one meaning in the product, carried forward.

   Decision and action candidates are live (Plan 7-9 section 3.8, ADR-0031): they arrive through
   `candidates` and Confirm calls core-api, which is the only thing that commits them. The other
   Suggested questions are live too (Plan 7-9 section 3.10, ADR-0034): private to this participant,
   they arrive through `suggestions` / `savedSuggestions`, and Ask / Save / Dismiss call core-api;
   a saved one sits in Saved for later and comes back in the next meeting. Context fills are live
   too (Phase P10, plan 3.5): private to this participant, context another participant's agent or
   their own knowledge base supplied, with citations; Dismiss calls core-api. They are information,
   not a request, so they do not count toward Needs you. The other
   card kinds come in through `items` (the 9-section shape of doc 20 §7), which nothing feeds yet,
   so they render nothing rather than sample cards. The UX contract is unchanged:
   Confirm visibly commits (and is the ONLY thing that commits), Dismiss removes, Save for later
   collects into Saved for later. The conflict is always pinned to the top and cannot be dismissed.
   Acknowledging a warning only moves it into the Activity feed; nothing is sent anywhere.

   Priority uses the frozen language (red acts now, amber attention, blue info) through an icon, a
   chip and a tint; the act-now card is tinted red. No coloured edge.

   ProactiveAgent alerts are live too (Phase P11, plan 3.9): private to this participant. A
   priority-1 alert (a conflict) is the red banner pinned above everything, whatever order things
   arrived in; workload and dependency alerts are yellow cards and a missing stakeholder is a blue
   card, first in Needs you, priority then time. Mark read keeps an alert, quieter; Dismiss removes
   it for good. Both write through to notification-service and commit nothing. */

const PRIORITY_LEVEL: Record<SidebarPriority, 1 | 2 | 3> = { high: 1, medium: 2, low: 3 };
const PRIORITY_LABEL: Record<SidebarPriority, string> = { high: "Act now", medium: "Attention", low: "Info" };
const PRIORITY_TONE: Record<1 | 2 | 3, string> = { 1: "is-high", 2: "is-medium", 3: "is-low" };

type FeedKind = "conflict" | "question" | "decision" | "note" | "context" | "action" | "alert";
type Resolution = "confirmed" | "saved" | "dismissed" | "acknowledged" | "created" | "asked" | "read";

const KIND_LABEL: Record<FeedKind, string> = {
  conflict: "Conflict",
  question: "Question",
  decision: "Decision",
  note: "Note",
  context: "Shared context",
  action: "Action",
  alert: "Alert",
};

const RES_LABEL: Record<Resolution, string> = {
  confirmed: "Confirmed",
  saved: "Saved for later",
  dismissed: "Dismissed",
  acknowledged: "Acknowledged",
  created: "Task created",
  asked: "Asked",
  read: "Read",
};

type FeedEntry = {
  id: string;
  kind: FeedKind;
  text: string;
  time?: string;
  cite?: string;
  resolved?: Resolution;
  isNew?: boolean;
  /** The title this entry can be saved under (context fills keep their bookmark). */
  saveAs?: string;
};

const KIND_ICON: Record<FeedKind, Icon> = {
  conflict: Warning,
  question: Question,
  decision: Scales,
  note: NotePencil,
  context: UsersThree,
  action: CheckSquare,
  alert: Bell,
};

const CARD_ICON: Record<string, Icon> = {
  question: Question,
  decision: Scales,
  workload: Gauge,
  stakeholder: UserPlus,
  dependency: LinkBreak,
};

type CardId = "suggestion" | "decision" | "workload" | "stakeholder" | "dependency";

function pick<K extends AgentSidebarCard["kind"]>(cards: AgentSidebarCard[], kind: K) {
  return cards.find((c) => c.kind === kind) as Extract<AgentSidebarCard, { kind: K }> | undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");

export interface AgentAttention {
  /** Items that want the user right now: the open conflict plus anything pending or warning. */
  count: number;
  conflict: boolean;
}

/** A note's bullets, one per line, without the leading "- " the agent writes. */
function noteLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

export function AgentSidebar({
  onAttentionChange,
  id,
  items,
  notes = [],
  candidates = [],
  onCandidateResolved,
  onCandidateUpdated,
  meetingId = "",
  suggestions = [],
  savedSuggestions = [],
  onSuggestionResolved,
  onSuggestionSaved,
  contextFills = [],
  onContextFillDismissed,
  alerts = [],
  onAlertRead,
  onAlertDismissed,
}: {
  /** The agent's cards for this meeting. Empty until the `agent-results` stream is wired, which
   *  renders the empty state rather than invented cards. */
  items: AgentSidebarCard[];
  /** Optional. The room uses it for the badge on the collapsed panel rail. */
  onAttentionChange?: (attention: AgentAttention) => void;
  /** Anchor id for the "My agent" section, so the collapsed rail can open the panel at it. */
  id?: string;
  /** This participant's live PersonalListener notes (Plan 7-9 §3.4), oldest first. Only
   *  surfaced notes ever reach the client; a draft is one still streaming. */
  notes?: LiveNote[];
  /** The meeting's decision and action candidates waiting for a person, oldest first. */
  candidates?: Candidate[];
  onCandidateResolved?: (id: string, outcome: "confirmed" | "dismissed") => void;
  onCandidateUpdated?: (id: string, patch: Partial<Pick<Candidate, "content" | "rationale" | "dueDate">>) => void;
  /** The meeting this sidebar is open on; a citation without its own meeting points here. */
  meetingId?: string;
  /** This participant's open suggested questions for this meeting, most urgent first. */
  suggestions?: Suggestion[];
  /** This participant's saved suggested questions, from this meeting and earlier ones. */
  savedSuggestions?: Suggestion[];
  onSuggestionResolved?: (id: string, outcome: "asked" | "dismissed") => void;
  onSuggestionSaved?: (id: string) => void;
  /** This participant's surfaced context fills for this meeting, oldest first. */
  contextFills?: ContextFill[];
  onContextFillDismissed?: (id: string) => void;
  /** This participant's ProactiveAgent alerts, priority then time (`orderedAlerts`). */
  alerts?: Alert[];
  onAlertRead?: (id: string) => void;
  onAlertDismissed?: (id: string) => void;
}) {
  const toast = useCallToast();
  const [decisionState, setDecisionState] = useState<"pending" | "confirmed" | "dismissed">(
    "pending",
  );
  const [saved, setSaved] = useState<string[]>([]);
  const [closed, setClosed] = useState<Set<CardId>>(new Set());
  const [leaving, setLeaving] = useState<Set<CardId>>(new Set());
  const [log, setLog] = useState<FeedEntry[]>([]);
  const [leavingCandidates, setLeavingCandidates] = useState<Set<string>>(new Set());
  const [leavingSuggestions, setLeavingSuggestions] = useState<Set<string>>(new Set());
  const [leavingFills, setLeavingFills] = useState<Set<string>>(new Set());
  const [leavingAlerts, setLeavingAlerts] = useState<Set<string>>(new Set());
  const banners = useMemo(() => bannerAlerts(alerts), [alerts]);
  const alertCards = useMemo(() => cardAlerts(alerts), [alerts]);
  const joinedAt = useRef<number>(0);
  useEffect(() => {
    joinedAt.current = Date.now();
  }, []);

  const note = useMemo(() => pick(items, "note"), [items]);
  const suggestion = useMemo(() => pick(items, "suggestion"), [items]);
  const decision = useMemo(() => pick(items, "decision"), [items]);
  const task = useMemo(() => pick(items, "task"), [items]);
  const context = useMemo(() => pick(items, "context"), [items]);
  const conflict = useMemo(() => pick(items, "conflict"), [items]);
  const workload = useMemo(() => pick(items, "workload"), [items]);
  const stakeholder = useMemo(() => pick(items, "stakeholder"), [items]);
  const dependency = useMemo(() => pick(items, "dependency"), [items]);

  const isOpen = (cid: CardId) => !closed.has(cid);

  const count =
    alertsNeedingAttention(alerts) +
    candidates.length +
    suggestions.filter((s) => s.priority !== 3).length +
    (conflict ? 1 : 0) +
    (decision && decisionState === "pending" ? 1 : 0) +
    (suggestion && suggestion.priority !== "low" && isOpen("suggestion") ? 1 : 0) +
    (workload && isOpen("workload") ? 1 : 0) +
    (dependency && isOpen("dependency") ? 1 : 0);
  const hasConflict = Boolean(conflict) || banners.some((a) => a.status === "unread");
  useEffect(() => {
    onAttentionChange?.({ count, conflict: hasConflict });
  }, [count, hasConflict, onAttentionChange]);

  const now = () => {
    const secs = joinedAt.current ? Math.floor((Date.now() - joinedAt.current) / 1000) : 0;
    return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
  };

  const toggleSave = (title: string) =>
    setSaved((s) => (s.includes(title) ? s.filter((x) => x !== title) : [...s, title]));

  /** Slides a card out, then records what happened to it at the top of the Activity feed. */
  const resolve = (cid: CardId, entry: Omit<FeedEntry, "id" | "time" | "isNew">, after?: () => void) => {
    const time = now();
    setLeaving((s) => new Set(s).add(cid));
    window.setTimeout(() => {
      setLeaving((s) => {
        const next = new Set(s);
        next.delete(cid);
        return next;
      });
      setClosed((s) => new Set(s).add(cid));
      after?.();
      setLog((l) => [{ ...entry, id: `${cid}-${Date.now()}`, time, isNew: true }, ...l]);
    }, 230);
  };

  /** A candidate was confirmed or dismissed here (or turned out to be gone): slide it out, then
   *  drop it from the room's state and record it in Activity. */
  const settleCandidate = (c: Candidate, outcome: CandidateOutcome | "gone") => {
    const time = now();
    setLeavingCandidates((s) => new Set(s).add(c.id));
    window.setTimeout(() => {
      setLeavingCandidates((s) => {
        const next = new Set(s);
        next.delete(c.id);
        return next;
      });
      onCandidateResolved?.(c.id, outcome === "confirmed" ? "confirmed" : "dismissed");
      if (outcome === "gone") return;
      const confirmed = outcome === "confirmed";
      setLog((l) => [
        {
          id: `${c.id}-${Date.now()}`,
          kind: c.kind,
          text: c.content,
          time,
          isNew: true,
          resolved: confirmed ? "confirmed" : "dismissed",
          cite: confirmed ? (c.kind === "decision" ? "Saved for the team" : "Added to My Tasks") : undefined,
        },
        ...l,
      ]);
      if (confirmed) toast(c.kind === "decision" ? "Decision confirmed" : "Task added");
    }, 230);
  };

  /** A suggestion was asked, saved or dismissed here (or turned out to be gone): slide it out,
   *  then move it in the room's state and record it in Activity. */
  const settleSuggestion = (s: Suggestion, outcome: SuggestionOutcome) => {
    const time = now();
    setLeavingSuggestions((l) => new Set(l).add(s.id));
    window.setTimeout(() => {
      setLeavingSuggestions((l) => {
        const next = new Set(l);
        next.delete(s.id);
        return next;
      });
      if (outcome === "saved") onSuggestionSaved?.(s.id);
      else onSuggestionResolved?.(s.id, outcome === "asked" ? "asked" : "dismissed");
      if (outcome === "gone") return;
      setLog((l) => [
        { id: `${s.id}-${Date.now()}`, kind: "question", text: s.question, time, isNew: true, resolved: outcome },
        ...l,
      ]);
      if (outcome === "asked") toast("Question copied. Paste it into chat.");
    }, 230);
  };

  /** A context fill was dismissed here (or turned out to be gone): slide it out, then drop it
   *  from the room's state and record it in Activity. */
  const settleContextFill = (f: ContextFill, outcome: ContextFillOutcome) => {
    const time = now();
    setLeavingFills((l) => new Set(l).add(f.id));
    window.setTimeout(() => {
      setLeavingFills((l) => {
        const next = new Set(l);
        next.delete(f.id);
        return next;
      });
      onContextFillDismissed?.(f.id);
      if (outcome === "gone") return;
      setLog((l) => [
        { id: `${f.id}-${Date.now()}`, kind: "context", text: f.content, time, isNew: true, resolved: "dismissed" },
        ...l,
      ]);
    }, 230);
  };

  /** An alert was marked read (it stays, quieter) or dismissed / gone (it slides out and never
   *  comes back). Either way it is recorded in Activity, except when it was already gone. */
  const settleAlert = (a: Alert, outcome: AlertOutcome) => {
    const time = now();
    if (outcome === "read") {
      onAlertRead?.(a.id);
      setLog((l) => [{ id: `${a.id}-${Date.now()}`, kind: "alert", text: a.title, time, isNew: true, resolved: "read" }, ...l]);
      return;
    }
    setLeavingAlerts((l) => new Set(l).add(a.id));
    window.setTimeout(() => {
      setLeavingAlerts((l) => {
        const next = new Set(l);
        next.delete(a.id);
        return next;
      });
      onAlertDismissed?.(a.id);
      if (outcome === "gone") return;
      setLog((l) => [
        { id: `${a.id}-${Date.now()}`, kind: "alert", text: a.title, time, isNew: true, resolved: "dismissed" },
        ...l,
      ]);
    }, 230);
  };

  const alertBanners =
    banners.length > 0
      ? banners.map((a) => (
          <AlertBanner
            key={a.id}
            alert={a}
            leaving={leavingAlerts.has(a.id)}
            onResolved={(outcome) => settleAlert(a, outcome)}
            onError={(message) => toast(message)}
          />
        ))
      : null;

  /* Needs-you cards, in the frozen order. */
  const cards: {
    id: CardId;
    kind: string;
    prio: 1 | 2 | 3;
    label: string;
    meta: string;
    text: ReactNode;
    sub?: string;
    acts: ReactNode;
  }[] = [];

  if (suggestion && isOpen("suggestion")) {
    const title = "Suggested question";
    cards.push({
      id: "suggestion",
      kind: "question",
      prio: PRIORITY_LEVEL[suggestion.priority],
      label: "Suggested question",
      meta: PRIORITY_LABEL[suggestion.priority],
      text: suggestion.text,
      acts: (
        <>
          <button
            type="button"
            className="nfy-act tap"
            onClick={() => {
              navigator.clipboard
                ?.writeText(suggestion.text)
                .then(() => toast("Question copied. Paste it into chat."))
                .catch(() => toast("Could not copy the question"));
            }}
          >
            Copy question
          </button>
          <button
            type="button"
            className={`nfy-act is-quiet tap${saved.includes(title) ? " is-on" : ""}`}
            aria-pressed={saved.includes(title)}
            onClick={() => toggleSave(title)}
          >
            {saved.includes(title) ? "Saved" : "Save for later"}
          </button>
          <button
            type="button"
            className="nfy-act is-quiet tap"
            onClick={() => resolve("suggestion", { kind: "question", text: suggestion.text, resolved: "dismissed" })}
          >
            Dismiss
          </button>
        </>
      ),
    });
  }

  if (decision && decisionState === "pending" && isOpen("decision")) {
    cards.push({
      id: "decision",
      kind: "decision",
      prio: 3,
      label: "Decision detected",
      meta: "Not saved yet",
      text: decision.title,
      sub: decision.detail,
      acts: (
        <>
          <button
            type="button"
            className="nfy-act tap"
            onClick={() =>
              resolve(
                "decision",
                { kind: "decision", text: decision.title, cite: "Saved to the knowledge graph", resolved: "confirmed" },
                () => {
                  setDecisionState("confirmed");
                  toast("Decision confirmed");
                },
              )
            }
          >
            Confirm
          </button>
          <button
            type="button"
            className={`nfy-act is-quiet tap${saved.includes(decision.title) ? " is-on" : ""}`}
            aria-pressed={saved.includes(decision.title)}
            onClick={() => toggleSave(decision.title)}
          >
            {saved.includes(decision.title) ? "Saved" : "Save for later"}
          </button>
          <button
            type="button"
            className="nfy-act is-quiet tap"
            onClick={() =>
              resolve("decision", { kind: "decision", text: decision.title, resolved: "dismissed" }, () =>
                setDecisionState("dismissed"),
              )
            }
          >
            Dismiss
          </button>
        </>
      ),
    });
  }

  if (workload && isOpen("workload")) {
    cards.push({
      id: "workload",
      kind: "workload",
      prio: workload.util >= 95 ? 1 : 2,
      label: "Workload warning",
      meta: `${workload.util}% capacity`,
      text: workload.text,
      acts: (
        <button
          type="button"
          className="nfy-act is-quiet tap"
          onClick={() =>
            resolve("workload", { kind: "note", text: `${workload.person} at ${workload.util}% capacity, noted.`, resolved: "acknowledged" })
          }
        >
          Acknowledge
        </button>
      ),
    });
  }

  if (stakeholder && isOpen("stakeholder")) {
    cards.push({
      id: "stakeholder",
      kind: "stakeholder",
      prio: 2,
      label: "Missing stakeholder",
      meta: "Suggested",
      text: (
        <>
          Add <b>{stakeholder.person}</b>: {stakeholder.reason}.
        </>
      ),
      acts: (
        <button
          type="button"
          className="nfy-act is-quiet tap"
          onClick={() =>
            resolve("stakeholder", {
              kind: "note",
              text: `${stakeholder.person} ${stakeholder.reason}.`,
              resolved: "acknowledged",
            })
          }
        >
          Noted
        </button>
      ),
    });
  }

  if (dependency && isOpen("dependency")) {
    cards.push({
      id: "dependency",
      kind: "dependency",
      prio: 2,
      label: "Dependency",
      meta: "Attention",
      text: dependency.text,
      acts: (
        <button
          type="button"
          className="nfy-act is-quiet tap"
          onClick={() => resolve("dependency", { kind: "note", text: dependency.text, resolved: "acknowledged" })}
        >
          Noted
        </button>
      ),
    });
  }

  /* Activity: what you resolved (newest first), then what the agent already did on its own. */
  const feed: FeedEntry[] = [...log];
  if (task) {
    feed.push({
      id: "task",
      kind: "action",
      text: /^Own\b/.test(task.title)
        ? `${task.assignee} ${task.title.replace(/^Own\b/, "owns")}, due ${task.due}.`
        : `${task.title}: ${task.assignee}, due ${task.due}.`,
      cite: "Added to My Tasks",
      resolved: "created",
    });
  }
  if (context) {
    feed.push({ id: "context", kind: "context", text: context.text, cite: context.source, saveAs: "Context from Sarah's agent" });
  }

  const settings = (
    <Link
      href="/settings"
      target="_blank"
      rel="noopener"
      className="cx-icon-btn sm tap tip-below tip-end"
      data-tip="Agent settings"
      aria-label="Agent settings (opens in a new tab)"
    >
      <GearSix size={18} aria-hidden />
    </Link>
  );

  if (
    items.length === 0 &&
    notes.length === 0 &&
    candidates.length === 0 &&
    suggestions.length === 0 &&
    savedSuggestions.length === 0 &&
    contextFills.length === 0 &&
    alerts.length === 0
  ) {
    return (
      <div className="agent" id={id}>
        <div className="side-sec">
          <h3>Your agent</h3>
          <span className="side-sec-end">{settings}</span>
        </div>
        <div className="agent-empty">
          <svg viewBox="0 0 120 36" aria-hidden="true">
            <path className="mx-line" d="M4 26 C24 26 30 26 44 26 C62 26 72 4 60 4 C48 4 50 26 70 26 C86 26 96 26 116 26" />
          </svg>
          <h4>Nothing captured yet</h4>
          <p>
            Your agent posts notes, decisions and questions here once live transcription is running for this
            meeting. Nothing is captured until then.
          </p>
        </div>
      </div>
    );
  }

  const needsYou = cards.length > 0 || candidates.length > 0 || suggestions.length > 0 || alertCards.length > 0;
  const savedCount = saved.length + savedSuggestions.length;

  return (
    <>
      {alertBanners || conflict ? (
        <div className="agent-pin" aria-label="Pinned alerts">
          {alertBanners}
          {conflict ? (
            <div className="conflict-banner" role="alert">
              <div className="cbn-kind">
                <Warning size={16} weight="bold" aria-hidden />
                Possible conflict
                <span className="cbn-meta">
                  <PushPin size={13} weight="fill" aria-hidden />
                  Pinned
                </span>
              </div>
              <p className="cbn-text">{conflict.text}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="agent" id={id}>
        <div className="side-sec">
          <h3>Needs you</h3>
          {count > 0 ? <span className="mx-count is-hot">{count}</span> : null}
          <span className="side-sec-end">
            <span className="mx-chip">
              <Waveform size={14} aria-hidden />
              Listening
            </span>
            {settings}
          </span>
        </div>

        {needsYou ? (
          <div className="agent-group">
            {alertCards.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                leaving={leavingAlerts.has(a.id)}
                onResolved={(outcome) => settleAlert(a, outcome)}
                onError={(message) => toast(message)}
              />
            ))}
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                currentMeetingId={meetingId}
                leaving={leavingSuggestions.has(s.id)}
                onResolved={(outcome) => settleSuggestion(s, outcome)}
                onError={(message) => toast(message)}
              />
            ))}
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                leaving={leavingCandidates.has(c.id)}
                onResolved={(outcome) => settleCandidate(c, outcome)}
                onUpdated={(patch) => onCandidateUpdated?.(c.id, patch)}
                onError={(message) => toast(message)}
              />
            ))}
            {cards.map((card) => {
              const KindIcon = CARD_ICON[card.kind] ?? Question;
              return (
                <div
                  className={`nfy-card is-${card.kind} is-p${card.prio}${leaving.has(card.id) ? " is-leaving" : ""}`}
                  key={card.id}
                  role={card.prio === 1 ? "alert" : undefined}
                >
                  <div className="nfy-kind">
                    <KindIcon size={16} weight="bold" aria-hidden />
                    {card.label}
                    <span className={`nfy-meta ${PRIORITY_TONE[card.prio]}`}>{card.meta}</span>
                  </div>
                  <p className="nfy-text">{card.text}</p>
                  {card.sub ? <p className="nfy-sub">{card.sub}</p> : null}
                  <div className="nfy-acts">{card.acts}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="agent-quiet">Nothing needs you right now. Cards land here when your agent wants a decision from you.</p>
        )}

        {contextFills.length > 0 ? (
          <div role="group" aria-labelledby={`${id ?? "agent"}-ctx`}>
            <div className="side-sec">
              <h3 id={`${id ?? "agent"}-ctx`}>Context for you</h3>
              <span className="mx-count">{contextFills.length}</span>
            </div>
            <div className="agent-group">
              {contextFills.map((f) => (
                <ContextFillCard
                  key={f.id}
                  fill={f}
                  currentMeetingId={meetingId}
                  leaving={leavingFills.has(f.id)}
                  onResolved={(outcome) => settleContextFill(f, outcome)}
                  onError={(message) => toast(message)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {notes.length > 0 || note ? (
          <div>
            <div className="side-sec">
              <h3>My notes</h3>
              {notes.length > 0 ? <span className="mx-count">{notes.length}</span> : null}
              <span className="side-sec-end">
                <span className="mx-chip">
                  <Lock size={13} weight="fill" aria-hidden />
                  Only you
                </span>
              </span>
            </div>
            {notes.length > 0 ? (
              <div className="mynotes" aria-live="polite">
                {notes.map((n) => (
                  // Keyed by the agent window (the stream's correlation key), so the settled note
                  // replaces its draft in place: same node, no remount, no jump. The body reserves
                  // its height while the deltas append.
                  <div
                    className={`mynote${n.final ? " is-final" : " is-new is-draft"}`}
                    key={n.windowId}
                    aria-busy={n.final ? undefined : true}
                  >
                    <NotePencil size={16} aria-hidden />
                    <span className="mynote-body">
                      {noteLines(n.text).map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                      {n.final ? null : (
                        <p className="mynote-writing">
                          Writing<span className="stream-caret" aria-hidden="true"></span>
                        </p>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : note ? (
              <div className="mynotes">
                {note.lines.map((line) => (
                  <div className="mynote" key={line}>
                    <NotePencil size={16} aria-hidden />
                    <span className="mynote-body">
                      <p>{line}</p>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <div className="side-sec">
            <h3>Saved for later</h3>
            {savedCount ? <span className="mx-count">{savedCount}</span> : null}
          </div>
          {savedSuggestions.length > 0 ? (
            <div className="agent-group" style={{ marginBottom: saved.length ? 10 : 0 }}>
              {savedSuggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  currentMeetingId={meetingId}
                  leaving={leavingSuggestions.has(s.id)}
                  onResolved={(outcome) => settleSuggestion(s, outcome)}
                  onError={(message) => toast(message)}
                />
              ))}
            </div>
          ) : null}
          {saved.length === 0 && savedSuggestions.length === 0 ? (
            <p className="saved-empty">Nothing saved yet. Use Save for later on any card to keep it here.</p>
          ) : saved.length > 0 ? (
            <div className="mynotes">
              {saved.map((s) => (
                <div className="mynote is-new" key={s}>
                  <BookmarkSimple size={16} weight="fill" aria-hidden />
                  <span className="mynote-body">
                    <p>{s}</p>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="afeed" role="log" aria-live="polite" aria-label="Agent activity">
          <div className="side-sec">
            <h3>Activity</h3>
          </div>
          <ol className="afeed-list">
            {feed.map((e) => {
              const KindIcon = KIND_ICON[e.kind];
              const carried = e.resolved === "confirmed" || e.resolved === "created";
              return (
                <li
                  className={`afeed-item is-${e.kind}${e.resolved ? " is-resolved" : ""}${carried ? " is-carried" : ""}${e.isNew ? " is-new" : ""}`}
                  key={e.id}
                >
                  <span className="afeed-ico" aria-hidden>
                    <KindIcon size={15} weight={carried ? "fill" : "regular"} />
                  </span>
                  <div>
                    <div className="afeed-kind">
                      <b>{KIND_LABEL[e.kind]}</b>
                      {e.resolved ? (
                        <span className={`afeed-res${e.resolved === "dismissed" ? " is-muted" : ""}`}>
                          {RES_LABEL[e.resolved]}
                        </span>
                      ) : null}
                      {e.time ? <time className="afeed-time">{e.time}</time> : null}
                    </div>
                    <p className="afeed-text">{e.text}</p>
                    {e.cite ? <span className="cite-chip">{e.cite}</span> : null}
                    {e.saveAs ? (
                      <div className="nfy-acts">
                        <button
                          type="button"
                          className={`nfy-act is-quiet tap${saved.includes(e.saveAs) ? " is-on" : ""}`}
                          aria-pressed={saved.includes(e.saveAs)}
                          onClick={() => toggleSave(e.saveAs!)}
                        >
                          {saved.includes(e.saveAs) ? "Saved" : "Save for later"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="afeed-start">Your agent joined at 00:00</p>
        </div>
      </div>
    </>
  );
}
