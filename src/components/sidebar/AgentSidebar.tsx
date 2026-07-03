"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import {
  mockAgentSidebar,
  type AgentSidebarCard,
  type SidebarPriority,
} from "@/lib/mock/data";

/* The agent sidebar — the product's centerpiece, rendered in the frozen
   9-section order (doc 20 §7): My Notes · Suggestion · Decision · New-task
   toast · Context-fill · Conflict banner (red, ALWAYS pinned to the top,
   regardless of arrival order) · Workload warning · Stakeholder suggestion ·
   Dependency warning · Save-for-later. Static mock cards — no socket stream;
   the only live behavior is the UX contract: Confirm visibly commits (and is
   the ONLY thing that commits), Dismiss removes, bookmarks collect into
   Save-for-later. */

const PRIORITY_LABEL: Record<SidebarPriority, string> = {
  high: "Act now",
  medium: "Attention",
  low: "Info",
};

const PRIORITY_STRIP: Record<SidebarPriority, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

const PRIORITY_TEXT: Record<SidebarPriority, string> = {
  high: "text-priority-high",
  medium: "text-priority-medium",
  low: "text-priority-low",
};

function pick<K extends AgentSidebarCard["kind"]>(kind: K) {
  return mockAgentSidebar.find((c) => c.kind === kind) as
    | Extract<AgentSidebarCard, { kind: K }>
    | undefined;
}

export function AgentSidebar() {
  const [decisionState, setDecisionState] = useState<"pending" | "confirmed" | "dismissed">(
    "pending",
  );
  const [saved, setSaved] = useState<string[]>([]);

  const note = useMemo(() => pick("note"), []);
  const suggestion = useMemo(() => pick("suggestion"), []);
  const decision = useMemo(() => pick("decision"), []);
  const task = useMemo(() => pick("task"), []);
  const context = useMemo(() => pick("context"), []);
  const conflict = useMemo(() => pick("conflict"), []);
  const workload = useMemo(() => pick("workload"), []);
  const stakeholder = useMemo(() => pick("stakeholder"), []);
  const dependency = useMemo(() => pick("dependency"), []);

  const toggleSave = (title: string) =>
    setSaved((s) => (s.includes(title) ? s.filter((x) => x !== title) : [...s, title]));

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {/* conflict banner — red, pinned top above everything else */}
      {conflict && (
        <div className="flex items-start gap-2.5 rounded-xl border border-priority-high/30 bg-priority-high-soft px-4 py-3">
          <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-priority-high" />
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-priority-high">
              Conflict
            </p>
            <p className="mt-1 text-[13px] font-medium leading-snug text-priority-high">
              {conflict.text}
            </p>
          </div>
        </div>
      )}

      {/* 1 · my notes */}
      {note && (
        <Section label="My notes" hint="only you see these">
          <ul className="space-y-2">
            {note.lines.map((l) => (
              <li key={l} className="flex gap-2.5 text-[13px] leading-snug text-ink">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                {l}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 2 · suggestion (priority language) */}
      {suggestion && (
        <SidebarCard
          strip={PRIORITY_STRIP[suggestion.priority]}
          onSave={() => toggleSave("Suggested question")}
          savedNow={saved.includes("Suggested question")}
        >
          <p className={`font-mono text-[9.5px] uppercase tracking-[0.18em] ${PRIORITY_TEXT[suggestion.priority]}`}>
            Suggestion · {PRIORITY_LABEL[suggestion.priority]}
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-ink">{suggestion.text}</p>
        </SidebarCard>
      )}

      {/* 3 · decision — the confirm flow */}
      {decision && decisionState !== "dismissed" && (
        <SidebarCard
          strip="bg-priority-low"
          onSave={() => toggleSave(decision.title)}
          savedNow={saved.includes(decision.title)}
        >
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-priority-low">
            Decision
          </p>
          <p className="mt-1.5 text-[14px] font-medium leading-snug text-ink-display">
            {decision.title}
          </p>
          <p className="mt-1 text-[11.5px] text-ink-3">{decision.detail}</p>

          {decisionState === "pending" ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDecisionState("confirmed")}
                className="rounded-full bg-signal px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-signal-deep"
              >
                Confirm
              </button>
              <button
                type="button"
                className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-line-2"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDecisionState("dismissed")}
                className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12px] text-ink-3 transition-colors hover:border-line-2"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[12px] font-medium text-signal-deep">
              <CheckDot />
              Confirmed — saved to the knowledge graph.
            </p>
          )}
        </SidebarCard>
      )}

      {/* 4 · new-task toast */}
      {task && (
        <div className="rounded-xl border border-signal/30 bg-signal-soft/60 px-4 py-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-signal-deep">
            New task
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[13px] font-medium text-ink">{task.title}</p>
            <span className="flex shrink-0 items-center gap-1.5">
              <Avatar name={task.assignee} size="sm" />
              <span className="font-mono text-[10.5px] tabular-nums text-ink-3">{task.due}</span>
            </span>
          </div>
        </div>
      )}

      {/* 5 · context-fill */}
      {context && (
        <SidebarCard
          onSave={() => toggleSave("Context from Sarah's agent")}
          savedNow={saved.includes("Context from Sarah's agent")}
        >
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">
            Context added
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-ink">{context.text}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-signal" />
            {context.source}
          </p>
        </SidebarCard>
      )}

      {/* 6 · workload warning (80/95 thresholds) */}
      {workload && (
        <SidebarCard strip={workload.util >= 95 ? "bg-priority-high" : "bg-priority-medium"}>
          <p className={`font-mono text-[9.5px] uppercase tracking-[0.18em] ${workload.util >= 95 ? "text-priority-high" : "text-priority-medium"}`}>
            Workload
          </p>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink">{workload.text}</p>
          <span className="relative mt-2.5 block h-[10px] overflow-hidden rounded-full bg-bg-2">
            <span
              className={`absolute inset-y-0 left-0 rounded-full ${workload.util >= 95 ? "bg-priority-high" : "bg-priority-medium"}`}
              style={{ width: `${Math.min(workload.util, 100)}%` }}
            />
          </span>
        </SidebarCard>
      )}

      {/* 7 · stakeholder suggestion */}
      {stakeholder && (
        <SidebarCard>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">
            Stakeholder
          </p>
          <div className="mt-1.5 flex items-start gap-2.5">
            <Avatar name={stakeholder.person} size="sm" />
            <p className="text-[13px] leading-snug text-ink">
              Add <span className="font-medium">{stakeholder.person}</span> —{" "}
              {stakeholder.reason}.
            </p>
          </div>
        </SidebarCard>
      )}

      {/* 8 · dependency warning */}
      {dependency && (
        <div className="flex items-start gap-2.5 rounded-xl border border-priority-medium/30 bg-priority-medium-soft px-4 py-3">
          <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-priority-medium" />
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-priority-medium">
              Dependency
            </p>
            <p className="mt-1 text-[13px] font-medium leading-snug text-priority-medium">
              {dependency.text}
            </p>
          </div>
        </div>
      )}

      {/* 9 · save-for-later */}
      <Section label="Saved for later" hint={saved.length === 0 ? "bookmark a card to keep it" : undefined}>
        {saved.length === 0 ? (
          <p className="text-[12px] text-ink-3">
            Nothing saved yet — tap the bookmark on any card.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {saved.map((s) => (
              <li key={s} className="flex items-center gap-2 text-[13px] text-ink">
                <BookmarkIcon className="h-3.5 w-3.5 shrink-0 text-signal" filled />
                {s}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ---------------- building blocks ---------------- */

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">
          {label}
        </h3>
        {hint && <span className="text-[10.5px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function SidebarCard({
  strip,
  onSave,
  savedNow,
  children,
}: {
  strip?: string;
  onSave?: () => void;
  savedNow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-white p-4">
      {strip && <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${strip}`} />}
      <div className={strip ? "pl-1.5" : ""}>{children}</div>
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          aria-label={savedNow ? "Remove from saved" : "Save for later"}
          aria-pressed={savedNow}
          className={`absolute right-3 top-3 rounded-md p-1 transition-colors ${
            savedNow ? "text-signal" : "text-ink-3 hover:text-ink-2"
          }`}
        >
          <BookmarkIcon className="h-3.5 w-3.5" filled={savedNow} />
        </button>
      )}
    </div>
  );
}

function BookmarkIcon({
  className = "h-4 w-4",
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        d="M4 2.5h8a.5.5 0 0 1 .5.5v10.4l-4.5-2.8-4.5 2.8V3a.5.5 0 0 1 .5-.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckDot({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-signal text-white ${className}`}
    >
      <svg viewBox="0 0 12 12" className="h-[62%] w-[62%]" aria-hidden>
        <path
          d="M2.5 6.2 5 8.5 9.5 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
