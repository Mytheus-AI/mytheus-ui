"use client";

import { useState } from "react";
import {
  CalendarBlank,
  CaretDown,
  ChartLineUp,
  CheckCircle,
  Eye,
  Handshake,
  PencilSimple,
  Ticket,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { Assumption, Evidence, Person } from "@/lib/api/why-blast-types";
import { KIND_LABEL, resolutionLine, watchParts, watchState, type WatchPart } from "@/lib/decision-why";

/* One reason a decision rests on, as a calm row: the kind, what has to stay true, the words it was
   said in (the quiet italic voice) and by whom, what the agent watches it against, and its state.
   The owner gets Edit and Remove; earlier breaks fold into a small history. */

const WATCH_ICON: Record<WatchPart["kind"], Icon> = { date: CalendarBlank, value: ChartLineUp, jira: Ticket, deal: Handshake };

export function Said({ quote, by, className = "" }: { quote: string; by: Person | null; className?: string }) {
  return (
    <figure className={`min-w-0 ${className}`}>
      <blockquote className="font-display text-[16px] italic leading-snug text-ink-2">&ldquo;{quote}&rdquo;</blockquote>
      {by ? <figcaption className="mt-1 text-[13px] font-semibold text-ink-3">{by.name}</figcaption> : null}
    </figure>
  );
}

export function WatchChips({ a }: { a: Assumption }) {
  const parts = watchParts(a.watch);
  const state = watchState(a);
  const StateIcon = a.status === "broken" ? WarningCircle : a.reconfirmed_at ? CheckCircle : Eye;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="What it is watched against">
      <li>
        <Chip tone={state.tone} icon={<StateIcon size={13} weight={a.status === "broken" ? "fill" : "bold"} />}>
          {state.label}
        </Chip>
      </li>
      {parts.map((p) => {
        const I = WATCH_ICON[p.kind];
        return (
          <li key={p.kind}>
            <Chip tone="outline" icon={<I size={13} />}>
              {p.text}
            </Chip>
          </li>
        );
      })}
    </ul>
  );
}

export function History({ items }: { items: Evidence[] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const id = `hist-${items[0].id}`;
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-ctl px-1 text-[13px] font-semibold text-ink-3 hover:text-ink"
      >
        <CaretDown size={12} weight="bold" aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        {items.length === 1 ? "It stopped holding once before" : `It stopped holding ${items.length} times before`}
      </button>
      <ol id={id} hidden={!open} className="mt-1 space-y-2 border-l-2 border-line pl-3">
        {items.map((e) => (
          <li key={e.id} className="text-[14px] leading-snug text-ink-3">
            <span className="text-ink-2">{e.rationale || "A later meeting contradicted it."}</span> {resolutionLine(e)}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AssumptionRow({
  a,
  canEdit,
  onEdit,
  onRemove,
}: {
  a: Assumption;
  canEdit: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[104px_minmax(0,1fr)_auto]">
      <div className="pt-0.5">
        <Chip tone="neutral">{KIND_LABEL[a.kind]}</Chip>
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-snug text-ink">{a.statement}</p>
        {a.quote ? <Said quote={a.quote} by={a.stated_by} className="mt-2" /> : a.stated_by ? <p className="mt-1 text-[13px] text-ink-3">Said by {a.stated_by.name}</p> : null}
        <div className="mt-3">
          <WatchChips a={a} />
        </div>
        {a.reconfirm_note && a.status === "watching" ? (
          <p className="mt-2 text-[14px] leading-snug text-ink-3">Re-confirmed: &ldquo;{a.reconfirm_note}&rdquo;</p>
        ) : null}
        <History items={a.history} />
      </div>
      {canEdit ? (
        <div className="flex items-start gap-1 sm:justify-end">
          <Button type="button" variant="ghost" size="sm" icon onClick={onEdit} aria-label={`Edit reason: ${a.statement}`}>
            <PencilSimple size={16} aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="sm" icon onClick={onRemove} aria-label={`Remove reason: ${a.statement}`}>
            <Trash size={16} aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
