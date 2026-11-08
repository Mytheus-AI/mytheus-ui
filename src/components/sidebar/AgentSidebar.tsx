"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { GearSix, Lock, PushPin, Sparkle, Warning } from "@phosphor-icons/react";
import { CollapseSection } from "@/components/call/CollapseSection";
import { useCallToast } from "@/components/call/CallToast";
import type { AgentSidebarCard, SidebarPriority } from "@/lib/mock/data";

/* The agent sidebar - the product's centerpiece - in the meeting design's shape: a conflict banner
   pinned above everything, then "My agent" with the Needs-you cards, My notes, Saved for later and
   the Activity feed.

   The cards come in through `items` (the 9-section shape of doc 20 §7). Nothing feeds them yet:
   the room passes the `agent-results` cards once that stream is wired, and until then an empty
   list renders an honest empty state instead of sample cards. The UX contract is unchanged:
   Confirm visibly commits (and is the ONLY thing that commits), Dismiss removes, Save for later
   collects into Saved for later. The conflict is always pinned to the top and cannot be dismissed.
   Acknowledging a warning only moves it into the Activity feed; nothing is sent anywhere.

   Priority uses the frozen language (red acts now, amber attention, blue info) through the kind
   dot, the label colour and the meta text; the act-now card is also tinted. No coloured edge. */

const PRIORITY_LEVEL: Record<SidebarPriority, 1 | 2 | 3> = { high: 1, medium: 2, low: 3 };
const PRIORITY_LABEL: Record<SidebarPriority, string> = { high: "act now", medium: "attention", low: "info" };

type FeedKind = "conflict" | "question" | "decision" | "note" | "context" | "action";
type Resolution = "confirmed" | "saved" | "dismissed" | "acknowledged" | "created";

const KIND_LABEL: Record<FeedKind, string> = {
  conflict: "Conflict",
  question: "Question",
  decision: "Decision",
  note: "Note",
  context: "Shared context",
  action: "Action",
};

const RES_LABEL: Record<Resolution, string> = {
  confirmed: "Confirmed",
  saved: "Saved for later",
  dismissed: "Dismissed",
  acknowledged: "Acknowledged",
  created: "Task created",
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

export function AgentSidebar({
  onAttentionChange,
  id,
  items,
}: {
  /** The agent's cards for this meeting. Empty until the `agent-results` stream is wired, which
   *  renders the empty state rather than invented cards. */
  items: AgentSidebarCard[];
  /** Optional. The room uses it for the badge on the collapsed panel rail. */
  onAttentionChange?: (attention: AgentAttention) => void;
  /** Anchor id for the "My agent" section, so the collapsed rail can open the panel at it. */
  id?: string;
}) {
  const toast = useCallToast();
  const [decisionState, setDecisionState] = useState<"pending" | "confirmed" | "dismissed">(
    "pending",
  );
  const [saved, setSaved] = useState<string[]>([]);
  const [closed, setClosed] = useState<Set<CardId>>(new Set());
  const [leaving, setLeaving] = useState<Set<CardId>>(new Set());
  const [log, setLog] = useState<FeedEntry[]>([]);
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
    (conflict ? 1 : 0) +
    (decision && decisionState === "pending" ? 1 : 0) +
    (suggestion && suggestion.priority !== "low" && isOpen("suggestion") ? 1 : 0) +
    (workload && isOpen("workload") ? 1 : 0) +
    (dependency && isOpen("dependency") ? 1 : 0);
  const hasConflict = Boolean(conflict);
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
      meta: "draft, not saved",
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
      meta: "suggested",
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
      meta: "attention",
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

  if (items.length === 0) {
    return (
      <div className="reveal" id={id} style={{ animationDelay: ".14s" }}>
        <CollapseSection title="My agent">
          <p className="chat-empty">
            Your agent posts notes, decisions and questions here once live transcription is running for
            this meeting. Nothing is captured until then.
          </p>
        </CollapseSection>
      </div>
    );
  }

  return (
    <>
      {conflict ? (
        <div className="conflict-banner" role="alert">
          <div className="cbn-kind">
            <Warning size={12} weight="bold" aria-hidden />
            Possible conflict
            <span className="cbn-meta">
              <PushPin size={11} weight="fill" aria-hidden />
              pinned
            </span>
          </div>
          <p className="cbn-text" style={{ marginBottom: 0 }}>
            {conflict.text}
          </p>
        </div>
      ) : null}

      <div className="reveal" id={id} style={{ animationDelay: ".14s" }}>
        <CollapseSection
          title="My agent"
          countChip={
            <>
              <Sparkle size={12} weight="fill" style={{ color: "var(--accent)" }} aria-hidden />
              <span className="live-chip">
                <span className="live-dot" aria-hidden="true"></span>Listening
              </span>
            </>
          }
          actions={
            <Link
              href="/settings"
              target="_blank"
              rel="noopener"
              className="label-icon-btn tap"
              data-tip="Agent settings"
              aria-label="Agent settings (opens in a new tab)"
            >
              <GearSix size={14} aria-hidden />
            </Link>
          }
        >
          <div className="agent-panel">
            {cards.length > 0 ? (
              <div className="nfy">
                <div className="nfy-head">
                  Needs you <b>{count}</b>
                </div>
                {cards.map((card) => (
                  <div
                    className={`nfy-card is-${card.kind} is-p${card.prio}${leaving.has(card.id) ? " is-leaving" : ""}`}
                    key={card.id}
                    role={card.prio === 1 ? "alert" : undefined}
                  >
                    <div className="nfy-kind">
                      {card.label} <span className="nfy-meta">{card.meta}</span>
                    </div>
                    <p className="nfy-text">{card.text}</p>
                    {card.sub ? <p className="nfy-sub">{card.sub}</p> : null}
                    <div className="nfy-acts">{card.acts}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {note ? (
              <div className="mynotes">
                <div className="nfy-head">
                  My notes
                  <span className="cite-chip" style={{ marginTop: 0, marginLeft: "auto" }}>
                    <Lock size={10} weight="fill" aria-hidden />
                    Only you
                  </span>
                </div>
                {note.lines.map((line) => (
                  <div className="mynote" key={line}>
                    <span className="moment-dot is-note" aria-hidden="true"></span>
                    <span className="mynote-body">
                      <p>{line}</p>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mynotes">
              <div className="nfy-head">
                Saved for later {saved.length ? <b>{saved.length}</b> : null}
              </div>
              {saved.length === 0 ? (
                <p className="saved-empty">Nothing saved yet. Use Save for later on any card to keep it here.</p>
              ) : (
                saved.map((s) => (
                  <div className="mynote is-new" key={s}>
                    <span className="moment-dot is-question" aria-hidden="true"></span>
                    <span className="mynote-body">
                      <p>{s}</p>
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="afeed" role="log" aria-live="polite" aria-label="Agent activity">
              <div className="nfy-head" style={{ paddingBottom: 4 }}>
                Activity
              </div>
              {feed.map((e) => (
                <div
                  className={`afeed-item is-${e.kind}${e.resolved ? " is-resolved" : ""}${e.isNew ? " is-new" : ""}`}
                  key={e.id}
                >
                  <div className="afeed-kind">
                    <b>{KIND_LABEL[e.kind]}</b>
                    {e.resolved ? (
                      <span className={`afeed-res${e.resolved === "dismissed" ? " is-muted" : ""}`}>
                        · {RES_LABEL[e.resolved]}
                      </span>
                    ) : null}
                    {e.time ? <span className="afeed-time">{e.time}</span> : null}
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
              ))}
              <div className="afeed-start">Agent joined · 00:00</div>
            </div>
          </div>
        </CollapseSection>
      </div>
    </>
  );
}
