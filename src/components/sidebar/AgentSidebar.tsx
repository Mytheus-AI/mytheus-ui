"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  CheckSquare,
  GearSix,
  Lock,
  NotePencil,
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

/* The agent sidebar - the product's centerpiece - as the Agent tab of the room's panel: alerts
   pinned above everything, then the shared agenda, Needs you, Context for you, My notes, Saved for
   later and the Activity feed. Where an answer is sourced, the coral line runs from what the agent
   said to where it came from (`.nfy-cites`).

   Every card is live:
   - Decision and action candidates are the meeting's shared ledger (ADR-0031; polish program
     Phase 0). Confirm calls core-api, which is the only thing that commits; then the room is told,
     so everyone's card settles ("Confirmed by Maya"). Edit locks the card for the others. Hide for
     me is personal; the host can dismiss for everyone.
   - Suggested questions (ADR-0034) and context fills (P10) are private to you.
   - ProactiveAgent alerts (P11) are private to you; a priority-1 alert (a conflict) is the red
     banner pinned above everything and cannot be dismissed from view by arrival order.

   "Listening" is honest: it shows only while the meeting link is joined. While it reconnects the
   chip says the agent is paused (polish program, Phase 0: the room used to say "Listening" over a
   dead socket). Priority uses the frozen language (red acts now, amber attention, blue info). */

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
  variant = "full",
}: {
  /** "rail": Notes mode's compact column, only pinned alerts, the agenda and Needs you. */
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
  /** The shared live agenda (and the host's nudges), under any pinned alerts and above Needs you. */
  agenda?: ReactNode;
}) {
  const toast = useCallToast();
  const nameOf = useRoomName();
  const [log, setLog] = useState<FeedEntry[]>([]);
  const [leavingCandidates, setLeavingCandidates] = useState<Set<string>>(new Set());
  const [leavingSuggestions, setLeavingSuggestions] = useState<Set<string>>(new Set());
  const [leavingFills, setLeavingFills] = useState<Set<string>>(new Set());
  const [leavingAlerts, setLeavingAlerts] = useState<Set<string>>(new Set());
  const banners = useMemo(() => bannerAlerts(alerts), [alerts]);
  const alertCards = useMemo(() => cardAlerts(alerts), [alerts]);

  const count = alertsNeedingAttention(alerts) + candidates.length + suggestions.filter((s) => s.priority !== 3).length;
  const hasConflict = banners.some((a) => a.status === "unread");
  useEffect(() => {
    onAttentionChange?.({ count, conflict: hasConflict });
  }, [count, hasConflict, onAttentionChange]);

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

  const pinned = banners.length > 0 ? (
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
    </div>
  ) : null;

  const nothing =
    notes.length === 0 &&
    candidates.length === 0 &&
    ledger.settlements.length === 0 &&
    suggestions.length === 0 &&
    savedSuggestions.length === 0 &&
    contextFills.length === 0 &&
    alerts.length === 0 &&
    log.length === 0;

  if (nothing && variant === "full") {
    return (
      <div className="agent" id={id}>
        {head ?? (
          <div className="side-sec">
            <h3>Your agent</h3>
            <span className="side-sec-end">{settings}</span>
          </div>
        )}
        {agenda}
        <div className="agent-empty">
          <svg viewBox="0 0 120 36" aria-hidden="true">
            <path className="mx-line" d="M4 26 C24 26 30 26 44 26 C62 26 72 4 60 4 C48 4 50 26 70 26 C86 26 96 26 116 26" />
          </svg>
          <h4>{live === "off" ? "Your agent is not connected" : "Nothing captured yet"}</h4>
          <p>
            {live === "listening"
              ? "Your agent is listening. Notes, decisions and questions land here as the meeting goes."
              : live === "paused"
                ? "Your agent is paused while the meeting link reconnects. Nothing said meanwhile is lost: the transcript is kept, and notes catch up."
                : "Live transcription is not running for this meeting, so your agent has nothing to work from yet."}
          </p>
          {listening}
        </div>
      </div>
    );
  }

  const needsYou = candidates.length > 0 || ledger.settlements.length > 0 || suggestions.length > 0 || alertCards.length > 0;

  const needsYouCards = (
    <>
      {alertCards.map((a) => (
        <AlertCard
          key={a.id}
          alert={a}
          leaving={leavingAlerts.has(a.id)}
          onResolved={(outcome) => settleAlert(a, outcome)}
          onError={(message) => toast(message, "error")}
        />
      ))}
      {suggestions.map((s) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          currentMeetingId={meetingId}
          leaving={leavingSuggestions.has(s.id)}
          onResolved={(outcome) => settleSuggestion(s, outcome)}
          onError={(message) => toast(message, "error")}
        />
      ))}
      {ledger.settlements.map((s) => (
        <SettledCard key={`settled-${s.id}`} settlement={s} meId={ledger.meId} />
      ))}
      {candidates.map((c) => (
        <CandidateCard
          key={c.id}
          candidate={c}
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
      ))}
    </>
  );

  if (variant === "rail") {
    return (
      <div className="agent is-rail" id={id}>
        {pinned}
        <div className="side-sec">
          <h3>Needs you</h3>
          {count > 0 ? <span className="mx-count is-hot">{count}</span> : null}
          <span className="side-sec-end">{listening}</span>
        </div>
        {needsYou ? (
          <div className="agent-group">{needsYouCards}</div>
        ) : (
          <p className="agent-quiet">Nothing needs you right now.</p>
        )}
        {agenda}
      </div>
    );
  }

  return (
    <>
      {head ? <div className="agent-head-wrap">{head}</div> : null}
      {pinned}

      <div className="agent" id={id}>
        {agenda}
        <div className="side-sec">
          <h3>Needs you</h3>
          {count > 0 ? <span className="mx-count is-hot">{count}</span> : null}
          <span className="side-sec-end">
            {listening}
            {head ? null : settings}
          </span>
        </div>

        {needsYou ? (
          <div className="agent-group">{needsYouCards}</div>
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
                  onError={(message) => toast(message, "error")}
                />
              ))}
            </div>
          </div>
        ) : null}

        {notes.length > 0 ? (
          <div>
            <div className="side-sec">
              <h3>My notes</h3>
              <span className="mx-count">{notes.length}</span>
              <span className="side-sec-end">
                <span className="mx-chip">
                  <Lock size={13} weight="fill" aria-hidden />
                  Only you
                </span>
              </span>
            </div>
            <div className="mynotes" aria-live="polite">
              {notes.map((n) => (
                // Keyed by the agent window, so the settled note replaces its draft in place.
                <div className={`mynote${n.final ? " is-final" : " is-new is-draft"}`} key={n.windowId} aria-busy={n.final ? undefined : true}>
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
          </div>
        ) : null}

        <div>
          <div className="side-sec">
            <h3>Saved for later</h3>
            {savedSuggestions.length ? <span className="mx-count">{savedSuggestions.length}</span> : null}
          </div>
          {savedSuggestions.length > 0 ? (
            <div className="agent-group">
              {savedSuggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  currentMeetingId={meetingId}
                  leaving={leavingSuggestions.has(s.id)}
                  onResolved={(outcome) => settleSuggestion(s, outcome)}
                  onError={(message) => toast(message, "error")}
                />
              ))}
            </div>
          ) : (
            <p className="saved-empty">Nothing saved yet. Use Save for later on a suggested question to keep it for your next meeting.</p>
          )}
        </div>

        <div className="afeed" role="log" aria-live="polite" aria-label="Agent activity">
          <div className="side-sec">
            <h3>Activity</h3>
          </div>
          {log.length === 0 ? (
            <p className="saved-empty">What you and others settle in this meeting is listed here.</p>
          ) : (
            <ol className="afeed-list">
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
    </>
  );
}
