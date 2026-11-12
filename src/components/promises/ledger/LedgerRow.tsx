"use client";

import { ArrowsLeftRight, CalendarBlank, Check, Clock, User, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { daysBetween, dueText, shortDay, type LedgerPromise } from "@/lib/promises/ledger";
import { PromiseCheck } from "../PromiseCheck";
import { SourceChip } from "./SourceChip";

/* One open promise in the ledger: the round "kept" control, what was promised, then its source
   (a chip that opens the moment or message), who it was promised to, when it is due and any date
   you asked to move, and the three other ways to settle it: renegotiate, hand off, drop. Every one
   is answered by a toast with Undo. Below 640px the controls wrap under the text and show icons
   only (each keeps its full name for assistive tech). */

function DueChip({ due, today }: { due: string; today: string }) {
  const diff = daysBetween(today, due);
  // Late reads red, today amber; drawn as an outlined chip so the coloured text stays AA on the
  // card in both themes.
  const tone = diff < 0 ? "!text-priority-high" : diff === 0 ? "!text-priority-medium" : "";
  return (
    <Chip tone={diff <= 0 ? "outline" : "neutral"} className={tone} icon={<CalendarBlank size={13} />} title={shortDay(due)}>
      {dueText(due, today)}
    </Chip>
  );
}

export function PromiseMeta({ p, today }: { p: LedgerPromise; today: string }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <SourceChip source={p.source} />
      {p.recipient_name ? (
        <Chip tone="neutral" icon={<User size={13} />} className="max-w-[200px]">
          <span className="truncate">To {p.recipient_name}</span>
        </Chip>
      ) : null}
      {p.due_at ? <DueChip due={p.due_at} today={today} /> : p.due_hint ? <Chip tone="outline">{p.due_hint}</Chip> : null}
      {p.pending_proposal ? (
        <Chip tone="low" icon={<Clock size={13} />}>
          Asked {p.pending_proposal.requester_name ?? "them"} for {shortDay(p.pending_proposal.proposed_due)}
        </Chip>
      ) : null}
    </div>
  );
}

export function LedgerRow({
  p,
  today,
  busy,
  focused = false,
  onKept,
  onRenegotiate,
  onHandOff,
  onDrop,
  canHandOff,
}: {
  p: LedgerPromise;
  today: string;
  busy: boolean;
  focused?: boolean;
  onKept: () => void;
  onRenegotiate: () => void;
  onHandOff: () => void;
  onDrop: () => void;
  canHandOff: boolean;
}) {
  return (
    <li
      id={`promise-${p.id}`}
      aria-busy={busy || undefined}
      tabIndex={focused ? -1 : undefined}
      className={`flex flex-wrap items-start gap-x-3.5 gap-y-2 px-4 py-3.5 outline-none sm:flex-nowrap sm:px-5 ${
        focused ? "bg-signal-soft/40" : ""
      }`}
    >
      <PromiseCheck content={p.content} done={false} busy={busy} onToggle={onKept} />
      <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] pt-0.5 sm:basis-0">
        <p className="text-[15px] font-medium leading-snug text-ink">{p.content}</p>
        <PromiseMeta p={p} today={today} />
      </div>
      <div className="flex basis-full items-center justify-end gap-1 pl-[2.6rem] sm:basis-auto sm:pl-0 sm:pt-0.5">
        <Button variant="ghost" size="sm" disabled={busy} onClick={onRenegotiate} aria-label={`Renegotiate the date: ${p.content}`}>
          <CalendarBlank size={15} aria-hidden />
          <span className="hidden md:inline">Renegotiate</span>
        </Button>
        {canHandOff ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onHandOff} aria-label={`Hand off: ${p.content}`}>
            <ArrowsLeftRight size={15} aria-hidden />
            <span className="hidden md:inline">Hand off</span>
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" disabled={busy} onClick={onDrop} aria-label={`Drop: ${p.content}`}>
          <X size={15} weight="bold" aria-hidden />
          <span className="hidden md:inline">Drop</span>
        </Button>
      </div>
    </li>
  );
}

/** A promise your Myte found (or a colleague handed you): the words it heard, and your yes or no. */
export function ReviewRow({
  p,
  today,
  busy,
  focused = false,
  onConfirm,
  onDismiss,
}: {
  p: LedgerPromise;
  today: string;
  busy: boolean;
  focused?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <li id={`promise-${p.id}`} aria-busy={busy || undefined} className={`px-4 py-4 sm:px-5 ${focused ? "bg-signal-soft/40" : ""}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 sm:flex-nowrap">
        <div className="min-w-0 flex-[1_1_100%] sm:flex-1">
          <p className="text-[15px] font-medium leading-snug text-ink">{p.content}</p>
          {p.source.quote ? (
            <blockquote className="mt-1.5 border-l-0 font-display text-[15px]  leading-snug text-ink-3">&ldquo;{p.source.quote}&rdquo;</blockquote>
          ) : null}
          <PromiseMeta p={p} today={today} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" disabled={busy} onClick={onConfirm} aria-label={`Confirm promise: ${p.content}`}>
            <Check size={14} weight="bold" aria-hidden />
            Confirm
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onDismiss} aria-label={`Dismiss: ${p.content}`}>
            Dismiss
          </Button>
        </div>
      </div>
    </li>
  );
}
