"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BellRinging,
  BookmarkSimple,
  BookOpenText,
  CalendarBlank,
  CheckCircle,
  CheckSquare,
  Gauge,
  Info,
  LinkSimple,
  Lightbulb,
  Lock,
  NotePencil,
  PushPin,
  Quotes,
  Scales,
  UserPlus,
  Warning,
  WarningCircle,
  Check,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  mockAgentSidebar,
  type AgentSidebarCard,
  type SidebarPriority,
} from "@/lib/mock/data";

/* The agent sidebar - the product's centerpiece, rendered in the frozen
   9-section order (doc 20 §7): My Notes · Suggestion · Decision · New-task
   toast · Context-fill · Conflict banner (red, ALWAYS pinned to the top,
   regardless of arrival order) · Workload warning · Stakeholder suggestion ·
   Dependency warning · Save-for-later. Static mock cards - no socket stream;
   the only live behavior is the UX contract: Confirm visibly commits (and is
   the ONLY thing that commits), Dismiss removes, bookmarks collect into
   Save-for-later.

   Priority is shown with a chip and an icon (frozen colour language: red acts now, amber needs
   attention, blue informs), never a coloured edge. The conflict is a tinted card with a Conflict
   chip that sticks to the top of the scroll area; it shrinks to one line once you scroll. */

// Badge defaults to a roomier size; chips inside cards are tighter.
const CHIP = "gap-1 !px-2.5 !py-0.5 !text-[11.5px]";

const PRIORITY_LABEL: Record<SidebarPriority, string> = {
  high: "Act now",
  medium: "Attention",
  low: "Info",
};

const PRIORITY_ICON = {
  high: WarningCircle,
  medium: BellRinging,
  low: Info,
} as const;

function pick<K extends AgentSidebarCard["kind"]>(kind: K) {
  return mockAgentSidebar.find((c) => c.kind === kind) as
    | Extract<AgentSidebarCard, { kind: K }>
    | undefined;
}

export interface AgentAttention {
  /** Items that want the user right now: the open conflict plus anything pending or warning. */
  count: number;
  conflict: boolean;
}

export function AgentSidebar({
  onAttentionChange,
}: {
  /** Optional. The room uses it for the count on the tab, the rail and the control bar. */
  onAttentionChange?: (attention: AgentAttention) => void;
}) {
  const [decisionState, setDecisionState] = useState<"pending" | "confirmed" | "dismissed">(
    "pending",
  );
  const [saved, setSaved] = useState<string[]>([]);
  const [compact, setCompact] = useState(false);

  const note = useMemo(() => pick("note"), []);
  const suggestion = useMemo(() => pick("suggestion"), []);
  const decision = useMemo(() => pick("decision"), []);
  const task = useMemo(() => pick("task"), []);
  const context = useMemo(() => pick("context"), []);
  const conflict = useMemo(() => pick("conflict"), []);
  const workload = useMemo(() => pick("workload"), []);
  const stakeholder = useMemo(() => pick("stakeholder"), []);
  const dependency = useMemo(() => pick("dependency"), []);

  const count =
    (conflict ? 1 : 0) +
    (decision && decisionState === "pending" ? 1 : 0) +
    (suggestion && suggestion.priority !== "low" ? 1 : 0) +
    (workload ? 1 : 0) +
    (dependency ? 1 : 0);
  const hasConflict = Boolean(conflict);
  useEffect(() => {
    onAttentionChange?.({ count, conflict: hasConflict });
  }, [count, hasConflict, onAttentionChange]);

  const toggleSave = (title: string) =>
    setSaved((s) => (s.includes(title) ? s.filter((x) => x !== title) : [...s, title]));

  return (
    <div
      className="h-full overflow-y-auto"
      onScroll={(e) => {
        // Two thresholds so the banner does not flicker at the boundary.
        const top = e.currentTarget.scrollTop;
        setCompact((c) => (c ? top > 20 : top > 60));
      }}
    >
      {/* conflict banner - tinted card with a chip, pinned top above everything else */}
      {conflict && (
        <div className="sticky top-0 z-10 bg-surface px-3.5 pb-2 pt-3">
          <div
            role="alert"
            className={`rounded-card border border-priority-high/30 bg-priority-high-soft transition-[padding] duration-200 motion-reduce:transition-none ${
              compact ? "px-3.5 py-2.5" : "p-4"
            }`}
          >
            <div className="flex items-center gap-2">
              <Warning size={16} weight="fill" className="shrink-0 text-priority-high" aria-hidden />
              <span className="inline-flex items-center rounded-full border border-priority-high/30 bg-surface px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.05em] text-priority-high">
                Conflict
              </span>
              <PushPin
                size={15}
                weight="fill"
                className="ml-auto shrink-0 text-ink-3"
                aria-label="Pinned"
                role="img"
              />
            </div>
            <p
              className={`text-[14px] font-medium leading-snug text-ink ${
                compact ? "mt-1.5 line-clamp-1" : "mt-2.5"
              }`}
            >
              {conflict.text}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 px-3.5 pb-4 pt-2 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
        <h3 className="mt-1 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
          From your agent
        </h3>

        {/* 1 · my notes */}
        {note && (
          <AgentCard
            icon={<NotePencil size={15} weight="fill" />}
            label="My notes"
            chip={
              <Badge className={CHIP}>
                <Lock size={12} weight="fill" aria-hidden />
                Only you
              </Badge>
            }
          >
            <ul className="mt-2.5 list-disc space-y-2 pl-4 marker:text-ink-3">
              {note.lines.map((l) => (
                <li key={l} className="text-[14px] leading-snug text-ink">
                  {l}
                </li>
              ))}
            </ul>
          </AgentCard>
        )}

        {/* 2 · suggestion (priority language) */}
        {suggestion && (
          <AgentCard
            icon={<Lightbulb size={15} weight="fill" />}
            label="Suggestion"
            chip={<PriorityChip priority={suggestion.priority} />}
            onSave={() => toggleSave("Suggested question")}
            savedNow={saved.includes("Suggested question")}
          >
            <p className="mt-2.5 text-[14px] leading-snug text-ink">{suggestion.text}</p>
          </AgentCard>
        )}

        {/* 3 · decision - the confirm flow */}
        {decision && decisionState !== "dismissed" && (
          <AgentCard
            icon={<Scales size={15} weight="fill" />}
            label="Decision"
            chip={<PriorityChip priority="low" />}
            onSave={() => toggleSave(decision.title)}
            savedNow={saved.includes(decision.title)}
          >
            <p className="mt-2.5 text-[15px] font-semibold leading-snug text-ink-display">
              {decision.title}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-3">{decision.detail}</p>

            {decisionState === "pending" ? (
              <>
                <Badge tone="warning" className={`mt-2.5 ${CHIP}`}>
                  <NotePencil size={12} aria-hidden />
                  Draft, not saved
                </Badge>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setDecisionState("confirmed")}
                    className="min-h-9 focus-visible:!rounded-pill active:scale-[0.97]"
                  >
                    <Check size={14} weight="bold" aria-hidden />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDecisionState("dismissed")}
                    className="min-h-9 focus-visible:!rounded-pill active:scale-[0.97]"
                  >
                    Dismiss
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-ink">
                <Badge tone="success" className={CHIP}>
                  <CheckCircle size={13} weight="fill" aria-hidden />
                  Confirmed
                </Badge>
                <span className="font-medium text-ink-2">Saved to the knowledge graph.</span>
              </p>
            )}
          </AgentCard>
        )}

        {/* 4 · new-task toast */}
        {task && (
          <AgentCard
            tinted
            icon={<CheckSquare size={15} weight="fill" />}
            label="New task"
          >
            <p className="mt-2.5 text-[14.5px] font-semibold leading-snug text-ink">{task.title}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <Avatar name={task.assignee} size="sm" />
                {task.assignee}
              </span>
              <Badge className={CHIP}>
                <CalendarBlank size={12} aria-hidden />
                Due {task.due}
              </Badge>
            </div>
          </AgentCard>
        )}

        {/* 5 · context-fill */}
        {context && (
          <AgentCard
            icon={<BookOpenText size={15} weight="fill" />}
            label="Context added"
            onSave={() => toggleSave("Context from Sarah's agent")}
            savedNow={saved.includes("Context from Sarah's agent")}
          >
            <p className="mt-2.5 text-[14px] leading-snug text-ink">{context.text}</p>
            <p className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2.5 py-1 text-[11.5px] font-semibold text-ink-3">
              <Quotes size={12} weight="fill" className="shrink-0" aria-hidden />
              <span className="truncate">{context.source}</span>
            </p>
          </AgentCard>
        )}

        {/* 6 · workload warning (80/95 thresholds) */}
        {workload && (
          <AgentCard
            icon={<Gauge size={15} weight="fill" />}
            label="Workload"
            chip={<PriorityChip priority={workload.util >= 95 ? "high" : "medium"} />}
          >
            <p className="mt-2.5 text-[14px] font-medium leading-snug text-ink">{workload.text}</p>
            <div className="mt-3 grid grid-cols-[minmax(0,64px)_1fr_auto] items-center gap-2.5 text-[12.5px] font-semibold text-ink-3">
              <b className="truncate font-semibold text-ink">{workload.person}</b>
              <span
                role="progressbar"
                aria-label={`${workload.person} capacity used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(workload.util, 100)}
                className="relative block h-2 overflow-hidden rounded-full bg-bg-2"
              >
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    workload.util >= 95 ? "bg-priority-high" : "bg-priority-medium"
                  }`}
                  style={{ width: `${Math.min(workload.util, 100)}%` }}
                />
              </span>
              <span className="tabular-nums">{workload.util}%</span>
            </div>
          </AgentCard>
        )}

        {/* 7 · stakeholder suggestion */}
        {stakeholder && (
          <AgentCard icon={<UserPlus size={15} weight="fill" />} label="Stakeholder">
            <div className="mt-2.5 flex items-start gap-2.5">
              <Avatar name={stakeholder.person} size="sm" />
              <p className="text-[14px] leading-snug text-ink">
                Add <span className="font-semibold">{stakeholder.person}</span>: {stakeholder.reason}.
              </p>
            </div>
          </AgentCard>
        )}

        {/* 8 · dependency warning */}
        {dependency && (
          <AgentCard
            icon={<LinkSimple size={15} weight="bold" />}
            label="Dependency"
            chip={<PriorityChip priority="medium" />}
          >
            <p className="mt-2.5 text-[14px] font-medium leading-snug text-ink">{dependency.text}</p>
          </AgentCard>
        )}

        {/* 9 · save-for-later */}
        <AgentCard icon={<BookmarkSimple size={15} weight="fill" />} label="Saved for later">
          {saved.length === 0 ? (
            <p className="mt-2.5 text-[13px] text-ink-3">
              Nothing saved yet. Use the bookmark on any card to keep it here.
            </p>
          ) : (
            <ul className="mt-2.5 space-y-1.5">
              {saved.map((s) => (
                <li key={s} className="flex items-center gap-2 text-[13.5px] text-ink">
                  <BookmarkSimple size={14} weight="fill" className="shrink-0 text-signal-deep" aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </AgentCard>
      </div>
    </div>
  );
}

/* ---------------- building blocks ---------------- */

function PriorityChip({ priority }: { priority: SidebarPriority }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <Badge tone={priority} className={CHIP}>
      <Icon size={13} weight="fill" aria-hidden />
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

function AgentCard({
  icon,
  label,
  chip,
  tinted = false,
  onSave,
  savedNow,
  children,
}: {
  icon: ReactNode;
  label: string;
  chip?: ReactNode;
  tinted?: boolean;
  onSave?: () => void;
  savedNow?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={`!p-4 ${tinted ? "!border-signal/30 !bg-signal-soft" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-ink-3" aria-hidden>
          {icon}
        </span>
        <h4 className="min-w-0 truncate text-[11.5px] font-bold uppercase tracking-[0.05em] text-ink-3">
          {label}
        </h4>
        <span className="-my-1.5 ml-auto flex shrink-0 items-center gap-1">
          {chip}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              aria-label={savedNow ? "Remove from saved" : "Save for later"}
              aria-pressed={savedNow}
              title={savedNow ? "Remove from saved" : "Save for later"}
              className={`-mr-1.5 grid h-9 w-9 place-items-center rounded-pill transition-[background-color,color,transform] duration-150 focus-visible:!rounded-pill active:scale-90 motion-reduce:transition-none ${
                savedNow
                  ? "text-signal-deep hover:bg-bg-2"
                  : "text-ink-3 hover:bg-bg-2 hover:text-ink"
              }`}
            >
              <BookmarkSimple size={16} weight={savedNow ? "fill" : "regular"} aria-hidden />
            </button>
          )}
        </span>
      </div>
      {children}
    </Card>
  );
}
