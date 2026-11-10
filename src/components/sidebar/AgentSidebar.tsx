"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Bell,
  BookmarkSimple,
  CaretDown,
  CheckSquare,
  GearSix,
  PauseCircle,
  Question,
  Scales,
  UsersThree,
  Waveform,
  type Icon,
} from "@phosphor-icons/react";
import { useCallToast } from "@/components/call/CallToast";
import type { LiveNote } from "@/lib/realtime/notes";
import type { Candidate, CandidateOutcome, Settlement } from "@/lib/realtime/candidates";
import { CandidateCard, SettledCard, type CandidateRoomAck } from "@/components/sidebar/CandidateCard";
import type { Suggestion } from "@/lib/realtime/suggestions";
import { SuggestionCard, type SuggestionOutcome } from "@/components/sidebar/SuggestionCard";
import type { ContextFill } from "@/lib/realtime/contextFills";
import { ContextFillCard, type ContextFillOutcome } from "@/components/sidebar/ContextFillCard";
import { alertsNeedingAttention, bannerAlerts, cardAlerts, type Alert } from "@/lib/realtime/alerts";
import { AlertBanner, AlertCard, type AlertOutcome } from "@/components/sidebar/AlertCard";
import { useRoomName } from "@/lib/realtime/room-names";
import { formatOffset } from "@/lib/realtime/meeting-clock";
import type { CaptionLine } from "@/lib/realtime/captions";
import { cardMomentIds, momentCards } from "@/lib/realtime/moments";
import { heldSuggestions, isUrgent, needsYouQueue, notesByAgenda, type AgendaLike, type QueueEntry } from "@/lib/realtime/calm";
import { MomentCard, usePromises } from "@/components/sidebar/MomentCard";
import type { MomentTarget } from "@/components/sidebar/MomentLine";
import { LiveTranscript } from "@/components/sidebar/LiveTranscript";
import { AskAgent } from "@/components/sidebar/AskAgent";
import { AgendaNotes } from "@/components/sidebar/AgendaNotes";
import { useSpeakingHold } from "@/components/sidebar/useSpeakingHold";
import "./sidebar-calm.css";

/* The agent sidebar - the product's centerpiece - as the Agent tab of the room's panel.

   Calm by design (polish program, Phase 1). It used to stack nine sections and let urgent cards
   fall below the fold. Now, top to bottom:
   - pinned: the red conflict banners, and (once you scroll away) a "needs you" jump back;
   - Needs you: ONE "Now" slot with the most important thing waiting for you, anything else urgent
     right under it, and the rest behind a "more waiting" count. Cards are one per moment: the
     decision, task, promise and note from one sentence are one card, tied to the words that were
     said (open them in the live transcript). Suggested questions that arrive while you are
     speaking wait until you pause;
   - Ask your agent: a private question, answered with sources;
   - the shared agenda, then your notes folded under the agenda item they were said in;
   - saved questions as a count that opens the list, and the Activity of the meeting, folded.

   Every card is live:
   - Decision and action candidates are the meeting's shared ledger (ADR-0031; polish program
     Phase 0). Confirm calls core-api, which is the only thing that commits; then the room is told,
     so everyone's card settles ("Confirmed by Maya"). Edit locks the card for the others. Hide for
     me is personal; the host can dismiss for everyone.
   - Suggested questions (ADR-0034), context fills (P10), promises and notes are private to you.
   - ProactiveAgent alerts (P11) are private to you; a priority-1 alert (a conflict) is the red
     banner pinned above everything and cannot be dismissed from view by arrival order.

   "Listening" is honest: it shows only while the meeting link is joined. While it reconnects the
   chip says the agent is paused. Priority uses the frozen language (red acts now, amber
   attention, blue info). Notes mode (`variant="rail"`) keeps the pins, Needs you and the agenda. */

type FeedKind = "question" | "decision" | "context" | "action" | "alert";
type Resolution = "confirmed" | "saved" | "dismissed" | "asked" | "read" | "hidden";

const KIND_LABEL: Record<FeedKind, string> = {
  question: "Question",
  decision: "Decision",
  context: "Shared context",
  action: "Action",
  alert: "Alert",
};

const RES_LABEL: Record<Resolution, string> = {
  confirmed: "Confirmed",
  saved: "Saved for later",
  dismissed: "Dismissed",
  asked: "Asked",
  read: "Read",
  hidden: "Hidden for you",
};

const KIND_ICON: Record<FeedKind, Icon> = {
  question: Question,
  decision: Scales,
  context: UsersThree,
  action: CheckSquare,
  alert: Bell,
};

type FeedEntry = {
  id: string;
  kind: FeedKind;
  text: string;
  time?: string;
  cite?: string;
  by?: string;
  resolved?: Resolution;
  isNew?: boolean;
};

export interface AgentAttention {
  /** Items that want the user right now: unread conflicts, cards, non-low suggestions. */
  count: number;
  conflict: boolean;
}

/** The candidate ledger's callbacks, wired to the meeting socket by the room. */
export interface CandidateLedger {
  meId: string | null;
  /** You host or created the meeting: you may dismiss a card for everyone. */
  steers: boolean;
  settlements: Settlement[];
  lockedBy: (id: string) => string | null;
  settle: (id: string, outcome: "confirmed" | "dismissed", by?: string | null) => void;
  announce: (id: string, outcome: CandidateOutcome) => Promise<unknown>;
  update: (id: string, patch: Partial<Pick<Candidate, "content" | "rationale" | "dueDate">>) => void;
  hide: (id: string) => void;
  lock: (id: string, locked: boolean) => Promise<CandidateRoomAck>;
}

export function AgentSidebar({
  onAttentionChange,
  id,
  live,
  notes = [],
  candidates = [],
  ledger,
  meetingId = "",
  meetingSeconds,
  suggestions = [],
  savedSuggestions = [],
  onSuggestionResolved,
  onSuggestionSaved,
  contextFills = [],
  onContextFillDismissed,
  alerts = [],
  onAlertRead,
  onAlertDismissed,
  head,
  agenda,
  agendaItems = [],
  startedAt = null,
  captions = [],
  speakerLabel,
  localSpeaking = false,
  variant = "full",
}: {
  /** "rail": Notes mode's compact column, only pinned alerts, Needs you and the agenda. */
  variant?: "full" | "rail";
  onAttentionChange?: (attention: AgentAttention) => void;
  /** Anchor id for the "My agent" section, so the collapsed rail can open the panel at it. */
  id?: string;
  /** The meeting link is joined (captions and the agent are flowing). */
  live: "listening" | "paused" | "off";
  notes?: LiveNote[];
  /** The meeting's decision and action candidates waiting for a person, oldest first. */
  candidates?: Candidate[];
  ledger: CandidateLedger;
  /** The meeting this sidebar is open on; a citation without its own meeting points here. */
  meetingId?: string;
  /** Seconds into the meeting now, for Activity times; null before the start is known. */
  meetingSeconds: () => number | null;
  suggestions?: Suggestion[];
  savedSuggestions?: Suggestion[];
  onSuggestionResolved?: (id: string, outcome: "asked" | "dismissed") => void;
  onSuggestionSaved?: (id: string) => void;
  contextFills?: ContextFill[];
  onContextFillDismissed?: (id: string) => void;
  alerts?: Alert[];
  onAlertRead?: (id: string) => void;
  onAlertDismissed?: (id: string) => void;
  /** Your agent's face, name and personality (ADR-0038 D11). */
  head?: ReactNode;
  /** The shared live agenda (and the host's nudges), drawn under Needs you. */
  agenda?: ReactNode;
  /** The agenda's items, to fold your notes under the item they were said in. */
  agendaItems?: AgendaLike[];
  /** `meeting_rooms.started_at`: the meeting's own clock. */
  startedAt?: string | null;
  /** The live caption lines, for the transcript a card's moment opens. */
  captions?: CaptionLine[];
  speakerLabel?: (speakerId: string) => string;
  /** You are speaking right now (LiveKit): suggestions wait until you pause. */
  localSpeaking?: boolean;
}) {
  const toast = useCallToast();
  const nameOf = useRoomName();
  const [log, setLog] = useState<FeedEntry[]>([]);
  const [leavingCandidates, setLeavingCandidates] = useState<Set<string>>(new Set());
  const [leavingSuggestions, setLeavingSuggestions] = useState<Set<string>>(new Set());
  const [leavingFills, setLeavingFills] = useState<Set<string>>(new Set());
  const [leavingAlerts, setLeavingAlerts] = useState<Set<string>>(new Set());
  const [queueOpen, setQueueOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [transcript, setTranscript] = useState<{ target: MomentTarget; opener: HTMLElement | null } | null>(null);
  const banners = useMemo(() => bannerAlerts(alerts), [alerts]);
  const alertCards = useMemo(() => cardAlerts(alerts), [alerts]);
  const label = speakerLabel ?? ((sid: string) => nameOf(sid, "Someone"));

  const count = alertsNeedingAttention(alerts) + candidates.length + suggestions.filter((s) => s.priority !== 3).length;
  const hasConflict = banners.some((a) => a.status === "unread");
  useEffect(() => {
    onAttentionChange?.({ count, conflict: hasConflict });
  }, [count, hasConflict, onAttentionChange]);

  const notice = useCallback((message: string, tone: "error" | "info" | "success") => toast(message, tone), [toast]);
  const promises = usePromises(meetingId, notice);

  // Suggested questions wait while you speak, and land after a short pause.
  const holding = useSpeakingHold(localSpeaking);
  const released = useRef<Set<string>>(new Set());
  const { shown: shownSuggestions, held } = heldSuggestions(suggestions, released.current, holding);
  useEffect(() => {
    if (!holding) for (const s of suggestions) released.current.add(s.id);
  }, [holding, suggestions]);

  const cards = useMemo(() => momentCards(candidates, notes), [candidates, notes]);
  const onCard = useMemo(() => cardMomentIds(cards), [cards]);
  const queue = useMemo(
    () => needsYouQueue({ alerts: alertCards, moments: cards, suggestions: shownSuggestions, fills: contextFills }),
    // `shownSuggestions` is derived each render; its ids are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertCards, cards, contextFills, shownSuggestions.map((s) => s.id).join(",")],
  );
  const groups = useMemo(() => notesByAgenda(notes, agendaItems, startedAt), [notes, agendaItems, startedAt]);

  const now = () => {
    const s = meetingSeconds();
    return s === null ? undefined : formatOffset(s);
  };

  const push = (entry: Omit<FeedEntry, "time" | "isNew">) =>
    setLog((l) => [{ ...entry, time: now(), isNew: true }, ...l].slice(0, 80));

  // The room ledger: a card someone settled (you included) goes into Activity, once, with who.
  const logged = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const s of ledger.settlements) {
      if (logged.current.has(s.id)) continue;
      logged.current.add(s.id);
      const who = s.byUserId === ledger.meId ? "You" : nameOf(s.byUserId, "Someone");
      push({
        id: `${s.id}-settled`,
        kind: s.kind,
        text: s.content,
        resolved: s.outcome,
        by: who,
        cite: s.outcome === "confirmed" ? (s.kind === "decision" ? "Saved for the team" : "Added to the owner's tasks") : undefined,
      });
      if (s.byUserId !== ledger.meId) {
        toast(
          `${who} ${s.outcome === "confirmed" ? "confirmed" : "dismissed"} a ${s.kind === "decision" ? "decision" : "task"}`,
          "info",
        );
      }
    }
    // `push` and `toast` are stable enough; settlements drive this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger.settlements, ledger.meId, nameOf]);

  /** Slide a card out, then run `after` (which removes it from the room's state). */
  const slideOut = (set: (fn: (s: Set<string>) => Set<string>) => void, key: string, after: () => void) => {
    set((s) => new Set(s).add(key));
    window.setTimeout(() => {
      set((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
      after();
    }, 230);
  };

  const onCandidateConfirmed = (c: Candidate, by: string | null) => {
    // A confirmed task closes the promise you made in the same moment: it is tracked as a task.
    if (c.kind === "action") {
      const card = cards.find((k) => k.parts.some((p) => "candidate" in p && p.candidate.id === c.id));
      for (const p of card?.parts ?? []) {
        if (p.kind === "promise" && !promises.state[p.promise.key]) void promises.act(p.promise, "tracked");
      }
    }
    slideOut(setLeavingCandidates, c.id, () => {
      ledger.settle(c.id, "confirmed", by);
      if (!by || by === ledger.meId) {
        toast(c.kind === "decision" ? "Decision confirmed for the team" : "Task confirmed", "success");
        void ledger.announce(c.id, "confirmed");
      }
    });
  };
  const onCandidateDismissed = (c: Candidate) => {
    slideOut(setLeavingCandidates, c.id, () => {
      ledger.settle(c.id, "dismissed");
      toast(`Dismissed for everyone`, "success");
      void ledger.announce(c.id, "dismissed");
    });
  };
  const onCandidateHidden = (c: Candidate) => {
    slideOut(setLeavingCandidates, c.id, () => {
      ledger.hide(c.id);
      push({ id: `${c.id}-hidden`, kind: c.kind, text: c.content, resolved: "hidden" });
    });
  };
  const onCandidateGone = (c: Candidate) => slideOut(setLeavingCandidates, c.id, () => ledger.settle(c.id, "dismissed"));

  const settleSuggestion = (s: Suggestion, outcome: SuggestionOutcome) => {
    slideOut(setLeavingSuggestions, s.id, () => {
      if (outcome === "saved") onSuggestionSaved?.(s.id);
      else onSuggestionResolved?.(s.id, outcome === "asked" ? "asked" : "dismissed");
      if (outcome === "gone") return;
      push({ id: `${s.id}-${Date.now()}`, kind: "question", text: s.question, resolved: outcome });
      if (outcome === "asked") toast("Question copied. Paste it into chat.", "success");
    });
  };

  const settleContextFill = (f: ContextFill, outcome: ContextFillOutcome) => {
    slideOut(setLeavingFills, f.id, () => {
      onContextFillDismissed?.(f.id);
      if (outcome === "gone") return;
      push({ id: `${f.id}-${Date.now()}`, kind: "context", text: f.content, resolved: "dismissed" });
    });
  };

  const settleAlert = (a: Alert, outcome: AlertOutcome) => {
    if (outcome === "read") {
      onAlertRead?.(a.id);
      push({ id: `${a.id}-${Date.now()}`, kind: "alert", text: a.title, resolved: "read" });
      return;
    }
    slideOut(setLeavingAlerts, a.id, () => {
      onAlertDismissed?.(a.id);
      if (outcome === "gone") return;
      push({ id: `${a.id}-${Date.now()}`, kind: "alert", text: a.title, resolved: "dismissed" });
    });
  };

  /* ------------------------------------------------------------ the live transcript */

  const openMoment = useCallback((target: MomentTarget, opener: HTMLElement) => setTranscript({ target, opener }), []);
  const closeTranscript = () => {
    const opener = transcript?.opener;
    setTranscript(null);
    window.setTimeout(() => {
      if (opener?.isConnected) opener.focus();
    }, 0);
  };

  /* ------------------------------------------------------------ "needs you" stays in reach */

  const needsRef = useRef<HTMLElement>(null);
  const [needsInView, setNeedsInView] = useState(true);
  useEffect(() => {
    const el = needsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setNeedsInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [transcript]);
  const jumpToNeeds = () => {
    const el = needsRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  };

  /* ------------------------------------------------------------ pieces */

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

  const listening =
    live === "listening" ? (
      <span className="mx-chip">
        <Waveform size={14} aria-hidden />
        Listening
      </span>
    ) : live === "paused" ? (
      <span className="mx-chip is-medium" role="status">
        <PauseCircle size={14} weight="fill" aria-hidden />
        Paused, reconnecting
      </span>
    ) : null;

  const waiting = queue.length;
  const showJump = !needsInView && waiting > 0 && !transcript;
  const pinned =
    banners.length > 0 || showJump ? (
      <div className="agent-pin" aria-label="Pinned alerts">
        {banners.map((a) => (
          <AlertBanner
            key={a.id}
            alert={a}
            leaving={leavingAlerts.has(a.id)}
            onResolved={(outcome) => settleAlert(a, outcome)}
            onError={(message) => toast(message, "error")}
          />
        ))}
        {showJump ? (
          <button type="button" className={`now-jump tap${queue.some(isUrgent) ? " is-urgent" : ""}`} onClick={jumpToNeeds}>
            <ArrowUp size={14} weight="bold" aria-hidden />
            {waiting === 1 ? "1 thing needs you" : `${waiting} things need you`}
          </button>
        ) : null}
      </div>
    ) : null;

  const renderCandidate = (c: Candidate, opts: { asPart: boolean; moment?: ReactNode }) => (
    <CandidateCard
      key={c.id}
      candidate={c}
      asPart={opts.asPart}
      moment={opts.moment}
      leaving={leavingCandidates.has(c.id)}
      meId={ledger.meId}
      canDismissForEveryone={ledger.steers}
      lockedBy={ledger.lockedBy(c.id)}
      onConfirmed={(by) => onCandidateConfirmed(c, by)}
      onEdited={(patch) => {
        ledger.update(c.id, patch);
        toast("Saved for everyone", "success");
        void ledger.announce(c.id, "edited");
      }}
      onDismissedForEveryone={() => onCandidateDismissed(c)}
      onHide={() => onCandidateHidden(c)}
      onGone={() => onCandidateGone(c)}
      onLock={(locked) => ledger.lock(c.id, locked)}
      onNotice={(message, tone) => toast(message, tone)}
    />
  );

  const renderEntry = (e: QueueEntry) => {
    switch (e.type) {
      case "alert":
        return (
          <AlertCard
            key={e.key}
            alert={e.alert}
            leaving={leavingAlerts.has(e.alert.id)}
            onResolved={(outcome) => settleAlert(e.alert, outcome)}
            onError={(message) => toast(message, "error")}
          />
        );
      case "moment":
        return (
          <MomentCard
            key={e.key}
            card={e.card}
            meId={ledger.meId}
            leaving={leavingCandidates}
            renderCandidate={renderCandidate}
            promises={promises}
            onOpenMoment={openMoment}
          />
        );
      case "suggestion":
        return (
          <SuggestionCard
            key={e.key}
            suggestion={e.suggestion}
            meId={ledger.meId}
            onOpenMoment={openMoment}
            currentMeetingId={meetingId}
            leaving={leavingSuggestions.has(e.suggestion.id)}
            onResolved={(outcome) => settleSuggestion(e.suggestion, outcome)}
            onError={(message) => toast(message, "error")}
          />
        );
      case "context":
        return (
          <ContextFillCard
            key={e.key}
            fill={e.fill}
            currentMeetingId={meetingId}
            leaving={leavingFills.has(e.fill.id)}
            onResolved={(outcome) => settleContextFill(e.fill, outcome)}
            onError={(message) => toast(message, "error")}
          />
        );
    }
  };

  // The Now slot: the first entry, plus anything else urgent (it never hides behind the count).
  const [first, ...others] = queue;
  const alsoUrgent = others.filter(isUrgent);
  const rest = others.filter((e) => !isUrgent(e));
  const queueId = `${id ?? "agent"}-queue`;
  const quietCount = rest.length;

  const nothingYet =
    notes.length === 0 &&
    candidates.length === 0 &&
    ledger.settlements.length === 0 &&
    suggestions.length === 0 &&
    savedSuggestions.length === 0 &&
    contextFills.length === 0 &&
    alerts.length === 0 &&
    log.length === 0;

  const needsYou = (
    <section className="now" ref={needsRef} aria-labelledby={`${id ?? "agent"}-needs-h`}>
      <div className="side-sec">
        <h3 id={`${id ?? "agent"}-needs-h`} tabIndex={-1}>
          Needs you
        </h3>
        {count > 0 ? <span className="mx-count is-hot">{count}</span> : null}
        <span className="side-sec-end">
          {listening}
          {variant === "full" && !head ? settings : null}
        </span>
      </div>

      {ledger.settlements.length > 0 ? (
        <div className="agent-group now-settled">
          {ledger.settlements.map((s) => (
            <SettledCard key={`settled-${s.id}`} settlement={s} meId={ledger.meId} />
          ))}
        </div>
      ) : null}

      {first ? (
        <div className="now-slot" role="group" aria-label="Now">
          {renderEntry(first)}
          {alsoUrgent.map(renderEntry)}
        </div>
      ) : nothingYet && variant === "full" ? (
        <div className="agent-empty">
          <svg viewBox="0 0 120 36" aria-hidden="true">
            <path className="mx-line" d="M4 26 C24 26 30 26 44 26 C62 26 72 4 60 4 C48 4 50 26 70 26 C86 26 96 26 116 26" />
          </svg>
          <h4>{live === "off" ? "Your agent is not connected" : "Nothing captured yet"}</h4>
          <p>
            {live === "listening"
              ? "Your agent is listening. Decisions, tasks and questions land here, one card per moment, as the meeting goes."
              : live === "paused"
                ? "Your agent is paused while the meeting link reconnects. Nothing said meanwhile is lost: the transcript is kept, and notes catch up."
                : "Live transcription is not running for this meeting, so your agent has nothing to work from yet."}
          </p>
        </div>
      ) : (
        <p className="agent-quiet">
          {variant === "full" ? "Nothing needs you right now. Cards land here when your agent wants a decision from you." : "Nothing needs you right now."}
        </p>
      )}

      {held.length > 0 ? (
        <p className="now-held" role="status">
          <PauseCircle size={14} aria-hidden />
          {held.length === 1 ? "1 suggested question waits" : `${held.length} suggested questions wait`} until you pause.
        </p>
      ) : null}

      {quietCount > 0 ? (
        <>
          <button
            type="button"
            className="now-more tap"
            aria-expanded={queueOpen}
            aria-controls={queueId}
            onClick={() => setQueueOpen((v) => !v)}
          >
            <span>{queueOpen ? "Hide the queue" : quietCount === 1 ? "1 more waiting" : `${quietCount} more waiting`}</span>
            <CaretDown size={14} weight="bold" className="now-more-caret" aria-hidden />
          </button>
          <div id={queueId} className="agent-group now-queue" hidden={!queueOpen}>
            {rest.map(renderEntry)}
          </div>
        </>
      ) : null}
    </section>
  );

  const transcriptView = transcript ? (
    <LiveTranscript lines={captions} target={transcript.target} speakerLabel={label} meetingId={meetingId} onClose={closeTranscript} />
  ) : null;

  if (variant === "rail") {
    return (
      <div className="agent is-rail calm" id={id}>
        {pinned}
        {transcriptView}
        <div className="calm-body" hidden={Boolean(transcript)}>
          {needsYou}
          {agenda}
        </div>
      </div>
    );
  }

  return (
    <>
      {head ? <div className="agent-head-wrap">{head}</div> : null}
      {pinned}
      {transcriptView}

      <div className="agent calm" id={id} hidden={Boolean(transcript)}>
        {needsYou}
        <AskAgent meetingId={meetingId} />
        {agenda}
        <AgendaNotes groups={groups} meId={ledger.meId} onCard={onCard} onOpenMoment={openMoment} />

        {savedSuggestions.length > 0 ? (
          <div className="calm-fold">
            <button
              type="button"
              className="calm-fold-btn tap"
              aria-expanded={savedOpen}
              aria-controls={`${id ?? "agent"}-saved`}
              onClick={() => setSavedOpen((v) => !v)}
            >
              <BookmarkSimple size={15} aria-hidden />
              <span>Saved questions</span>
              <span className="mx-count">{savedSuggestions.length}</span>
              <CaretDown size={14} weight="bold" className="calm-fold-caret" aria-hidden />
            </button>
            <div id={`${id ?? "agent"}-saved`} className="agent-group calm-fold-body" hidden={!savedOpen}>
              {savedSuggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  meId={ledger.meId}
                  currentMeetingId={meetingId}
                  leaving={leavingSuggestions.has(s.id)}
                  onResolved={(outcome) => settleSuggestion(s, outcome)}
                  onError={(message) => toast(message, "error")}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="calm-fold">
          <button
            type="button"
            className="calm-fold-btn tap"
            aria-expanded={activityOpen}
            aria-controls={`${id ?? "agent"}-activity`}
            onClick={() => setActivityOpen((v) => !v)}
          >
            <Bell size={15} aria-hidden />
            <span>Activity</span>
            {log.length ? <span className="mx-count">{log.length}</span> : null}
            <CaretDown size={14} weight="bold" className="calm-fold-caret" aria-hidden />
          </button>
          <div id={`${id ?? "agent"}-activity`} className="afeed calm-fold-body" hidden={!activityOpen}>
            {log.length === 0 ? (
              <p className="saved-empty">What you and others settle in this meeting is listed here.</p>
            ) : (
              <ol className="afeed-list" aria-label="Agent activity">
                {log.map((e) => {
                  const KindIcon = KIND_ICON[e.kind];
                  const carried = e.resolved === "confirmed";
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
                            <span className={`afeed-res${e.resolved === "dismissed" || e.resolved === "hidden" ? " is-muted" : ""}`}>
                              {RES_LABEL[e.resolved]}
                              {e.by ? ` by ${e.by === "You" ? "you" : e.by}` : ""}
                            </span>
                          ) : null}
                          {e.time ? <time className="afeed-time">{e.time}</time> : null}
                        </div>
                        <p className="afeed-text">{e.text}</p>
                        {e.cite ? <span className="cite-chip">{e.cite}</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
