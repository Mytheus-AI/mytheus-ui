"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CaretDown, GitDiff } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Chip, Count } from "@/components/ui/Chip";
import { LocalStamp } from "@/components/digest/LocalStamp";
import type { DecisionReversal, ReversalDecision, ReversalStatus } from "@/lib/api/only-mytheus-types";
import { dayMonth } from "@/lib/digest";
import { decisionHref } from "@/lib/reversals";
import { ReversalActions, taskOf } from "./ReversalActions";
import { ReopenedLine } from "./ReopenedLine";
import { reversalKind } from "@/lib/settlements";

/* The banner over My work, Tasks: each task whose decision was replaced, with the old decision,
   the new one (both linking to their decision pages), the task, and Keep, Re-scope or Close.
   `?reversal={id}` (the notification's link) scrolls to that row and marks it for a moment.
   Three rows show at first; the rest open with one button. */

const FIRST = 3;

export function ReversalBanner({ items: fromServer, focusId }: { items: DecisionReversal[]; focusId: string | null }) {
  const router = useRouter();
  // Rows stay once shown, so a settled one keeps its outcome after the page refreshes (the server
  // then lists only what is still pending); a reversal that arrives later is added at the end.
  const [items, setItems] = useState(fromServer);
  useEffect(() => {
    setItems((prev) => {
      const extra = fromServer.filter((r) => !prev.some((p) => p.id === r.id));
      return extra.length ? [...prev, ...extra] : prev;
    });
  }, [fromServer]);
  const [statuses, setStatuses] = useState<Record<string, ReversalStatus>>(() =>
    Object.fromEntries(items.map((r) => [r.id, r.status])),
  );
  const focusIndex = focusId ? items.findIndex((r) => r.id === focusId) : -1;
  const [expanded, setExpanded] = useState(focusIndex >= FIRST);
  const [lit, setLit] = useState<string | null>(focusIndex >= 0 ? focusId : null);

  const pending = useMemo(() => items.filter((r) => (statuses[r.id] ?? r.status) === "pending").length, [items, statuses]);
  const shown = expanded ? items : items.slice(0, FIRST);

  useEffect(() => {
    if (!focusId || focusIndex < 0) return;
    const row = document.getElementById(`reversal-${focusId}`);
    if (!row) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
    row.focus({ preventScroll: true });
    const t = window.setTimeout(() => setLit(null), 2600);
    return () => window.clearTimeout(t);
    // Once, on arrival from the notification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card as="section" flush className="mb-6" aria-labelledby="reversals-h">
      <CardHead
        id="reversals-h"
        title="Decisions changed under your tasks"
        description={
          pending > 0
            ? items.every((r) => reversalKind(r) === "reopened")
              ? "A decision one of your tasks came from was reopened. Keep the task, re-scope it, or close it."
              : "A decision one of your tasks came from was replaced. Keep the task, re-scope it for the new decision, or close it."
            : "All settled. Each task now follows the decision that replaced the old one."
        }
        right={pending > 0 ? <Count n={pending} label="waiting on you" tone="medium" /> : <Chip tone="ok">Settled</Chip>}
        divided
      />
      <ol className="divide-y divide-line">
        {shown.map((r) => (
          <li
            key={r.id}
            id={`reversal-${r.id}`}
            tabIndex={-1}
            aria-current={r.id === focusId ? "true" : undefined}
            className={`scroll-mt-24 px-4 py-[18px] outline-none transition-[background-color,box-shadow] duration-200 ease-[var(--ease-out)] focus-visible:shadow-[inset_0_0_0_2px_var(--signal)] motion-reduce:transition-none sm:px-[22px] ${
              lit === r.id ? "bg-signal-soft shadow-[inset_0_0_0_2px_var(--signal)]" : ""
            }`}
          >
            <ReversalRow
              reversal={r}
              onSettled={(status) => setStatuses((s) => ({ ...s, [r.id]: status }))}
              onServerSettled={() => router.refresh()}
            />
          </li>
        ))}
      </ol>
      {items.length > FIRST ? (
        <div className="border-t border-line bg-surface-2 px-4 py-3 sm:px-[22px]">
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <CaretDown size={14} weight="bold" aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Show fewer" : `Show ${items.length - FIRST} more`}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function DecisionLine({ tone, label, d }: { tone: "before" | "now"; label: string; d: ReversalDecision }) {
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-3">
        <Chip tone={tone === "now" ? "accent" : "neutral"}>{label}</Chip>
        <span className="min-w-0 truncate font-normal">
          {d.meeting_title ? `${d.meeting_title}, ` : ""}
          <LocalStamp iso={d.decided_at} mode="day" />
        </span>
      </p>
      <Link
        href={decisionHref(d)}
        className={`mt-1.5 block max-w-[60ch] rounded-ctl text-[15px] leading-snug underline-offset-4 hover:underline ${
          tone === "now" ? "font-semibold text-ink" : "text-ink-3"
        }`}
      >
        {d.content}
        <span className="sr-only"> (open the decision)</span>
      </Link>
    </div>
  );
}

function ReversalRow({
  reversal: r,
  onSettled,
  onServerSettled,
}: {
  reversal: DecisionReversal;
  onSettled: (s: ReversalStatus) => void;
  onServerSettled: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
      {reversalKind(r) === "reopened" ? (
        <ReopenedLine d={r.old_decision} />
      ) : (
      <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
        <DecisionLine tone="before" label="Was" d={r.old_decision} />
        <span aria-hidden className="hidden h-full items-center text-ink-4 md:flex">
          <ArrowRight size={18} weight="bold" />
        </span>
        <DecisionLine tone="now" label="Now" d={r.new_decision} />
      </div>
      )}
      <div className="min-w-0 rounded-ctl bg-bg-2 px-3.5 py-3 lg:bg-transparent lg:p-0">
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-3">
          <GitDiff size={14} aria-hidden />
          Your task
          {r.action.due_date ? <Chip tone="outline">Due {dayMonth(r.action.due_date)}</Chip> : null}
        </p>
        <p className="mt-1 max-w-[65ch] text-[15px] leading-snug text-ink">{r.action.content}</p>
        <ReversalActions
          reversalId={r.id}
          status={r.status}
          task={taskOf(r)}
          label={r.action.content}
          onSettled={onSettled}
          onServerSettled={onServerSettled}
        />
      </div>
    </div>
  );
}
