"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowCounterClockwise, Check, LockSimple, Plus, PlugsConnected, Waveform } from "@phosphor-icons/react";
import { addAssumption, editAssumption, readDecisionWhy, removeAssumption } from "@/app/actions/decision-why";
import { Button } from "@/components/ui/Button";
import { CardFoot, CardHead, cardClass } from "@/components/ui/Card";
import { Count } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { Bone } from "@/components/ui/Page";
import type { Assumption, DecisionWhy, Load } from "@/lib/api/why-blast-types";
import {
  EMPTY_DRAFT,
  LIMITS,
  WHY_POLL,
  dayLabel,
  draftOf,
  focusIdOf,
  orderAssumptions,
  sourcesLine,
  type AssumptionDraft,
} from "@/lib/decision-why";
import { graceful, notifySuccess } from "@/lib/toast";
import { AssumptionForm } from "./AssumptionForm";
import { AssumptionRow } from "./AssumptionRow";
import { BrokenAssumption } from "./BrokenAssumption";

/* "Why we decided" on a decision's page (#why): the reasons the decision rests on, each watched by
   the agent. Read on the server with the page; this island re-reads on Retry and while the agent is
   still reading the decision (every 5 s for a minute), and keeps the owner's edits in place.

   - pending: a skeleton row, "Reading the decision for the reasons behind it";
   - empty: what that means, and (the owner) Add a reason;
   - a broken reason: the hero card above the rest, with the owner's three choices;
   - none / forbidden: who can see this; error: the frayed line with Retry.
   `?assumption={id}` (the notification's link) scrolls to that reason and marks it for a moment. */

const HEAD_ID = "why-h";

export function DecisionWhySection({
  decisionId,
  initial,
  focusAssumptionId,
}: {
  decisionId: string;
  initial: Load<DecisionWhy>;
  /** overrides `?assumption=` (tests) */
  focusAssumptionId?: string | null;
}) {
  const params = useSearchParams();
  const focusId = focusIdOf(focusAssumptionId ?? params?.get("assumption"));
  const [load, setLoad] = useState<Load<DecisionWhy>>(initial);
  const [retrying, setRetrying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [lit, setLit] = useState<string | null>(focusId);
  const addBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => setLoad(initial), [initial]);

  const reread = useCallback(async () => {
    const next = await readDecisionWhy(decisionId);
    // A failed re-read never replaces what is already on screen.
    setLoad((prev) => (next.ok || !prev.ok ? next : prev));
    return next;
  }, [decisionId]);

  const retry = async () => {
    setRetrying(true);
    await reread();
    setRetrying(false);
  };

  const why = load.ok ? load.data : null;
  const pending = why?.state === "pending";

  // While the agent is still reading the decision, ask again every 5 s for a minute.
  useEffect(() => {
    if (!pending) return;
    setSlow(false);
    const started = Date.now();
    const t = window.setInterval(() => {
      if (Date.now() - started > WHY_POLL.forMs) {
        window.clearInterval(t);
        setSlow(true);
        return;
      }
      void reread().then((r) => {
        if (r.ok && r.data.state === "ready") window.clearInterval(t);
      });
    }, WHY_POLL.everyMs);
    return () => window.clearInterval(t);
  }, [pending, reread]);

  // Arriving from the notification: scroll to that reason, focus it, mark it for a moment.
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || !focusId || !why || why.state !== "ready") return;
    const el = document.getElementById(`assumption-${focusId}`);
    if (!el) return;
    landed.current = true;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
    const t = window.setTimeout(() => setLit(null), 2600);
    return () => window.clearTimeout(t);
  }, [focusId, why]);

  const replace = (a: Assumption) =>
    setLoad((prev) =>
      prev.ok ? { ok: true, data: { ...prev.data, assumptions: prev.data.assumptions.map((x) => (x.id === a.id ? a : x)) } } : prev,
    );

  const save = async (id: string | "new", d: AssumptionDraft): Promise<string | null> => {
    const res = id === "new" ? await addAssumption(decisionId, d) : await editAssumption(id, d);
    if (!res.ok) return res.message;
    if (id === "new") {
      setLoad((prev) => (prev.ok ? { ok: true, data: { ...prev.data, assumptions: [...prev.data.assumptions, res.data] } } : prev));
      notifySuccess("Reason added", { description: "Your Myte watches it from now on." });
    } else {
      replace(res.data);
      notifySuccess("Reason saved");
    }
    setEditing(null);
    return null;
  };

  const remove = (a: Assumption) => {
    graceful({
      message: "Reason removed",
      apply: () => setHidden((s) => new Set(s).add(a.id)),
      revert: () =>
        setHidden((s) => {
          const n = new Set(s);
          n.delete(a.id);
          return n;
        }),
      commit: () => removeAssumption(a.id),
    });
  };

  /* ---------------- frame ---------------- */

  const frame = (body: ReactNode, opts: { right?: ReactNode; foot?: ReactNode } = {}) => (
    <section id="why" aria-labelledby={HEAD_ID} className={`${cardClass({ flush: true, clip: false })} scroll-mt-24`}>
      <CardHead
        id={HEAD_ID}
        title="Why we decided"
        description={
          why
            ? why.can_edit
              ? "The reasons this decision rests on. Your Myte watches each one and tells you if one stops being true."
              : `The reasons this decision rests on. Your Myte watches each one and tells ${why.owner?.name ?? "its owner"} if one stops being true.`
            : "The reasons this decision rests on, watched by your Myte."
        }
        right={opts.right}
        divided
      />
      {body}
      {opts.foot}
    </section>
  );

  if (!load.ok) {
    if (load.reason === "error") {
      return frame(
        <div className="pt-4">
          <ErrorState
            variant="inline"
            title="We couldn't load the reasons for this decision"
            text="The decision itself is safe. This is usually a passing problem reaching the workspace."
            onRetry={() => void retry()}
          />
          {retrying ? <span className="sr-only" role="status">Retrying</span> : null}
        </div>,
      );
    }
    return frame(
      <div className="px-4 py-[18px] sm:px-[22px]">
        <Note>
          <span className="inline-flex items-center gap-1.5">
            <LockSimple size={15} aria-hidden className="shrink-0" />
            Only people who were in this decision&rsquo;s meeting can see why it was made.
          </span>
        </Note>
      </div>,
    );
  }

  const data = load.data;
  const sources = (
    <CardFoot className="rounded-b-card !gap-y-1.5 text-[13px] text-ink-3">
      <span className="sr-only">Sources your Myte watches:</span>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {sourcesLine(data.sources).map((s) => {
          const on = s.state === "connected" || s.state === "watched";
          return (
            <li key={s.label} className={`inline-flex items-center gap-1.5 ${on ? "text-ink-2" : "text-ink-3"}`}>
              {s.state === "watched" ? (
                <Waveform size={14} aria-hidden />
              ) : on ? (
                <Check size={14} weight="bold" aria-hidden className="text-ok" />
              ) : (
                <PlugsConnected size={14} aria-hidden />
              )}
              {s.label}
            </li>
          );
        })}
      </ul>
      {data.sources.checked_at ? <span className="ml-auto">Checked {dayLabel(data.sources.checked_at)}</span> : null}
    </CardFoot>
  );

  if (data.state === "pending") {
    return frame(
      <div className="px-4 py-[18px] sm:px-[22px]" role="status" aria-live="polite">
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[104px_minmax(0,1fr)]">
          <Bone className="h-6 w-20 !rounded-full" />
          <div className="space-y-2.5">
            <Bone className="h-4 w-[78%]" />
            <Bone className="h-4 w-[52%]" />
            <div className="flex gap-1.5 pt-1">
              <Bone className="h-6 w-24 !rounded-full" />
              <Bone className="h-6 w-28 !rounded-full" />
            </div>
          </div>
        </div>
        <p className="mt-4 font-display text-[16px]  text-ink-3">
          {slow ? "This is taking longer than usual. Your Myte is still reading the decision." : "Reading the decision for the reasons behind it"}
        </p>
        {slow ? (
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => void retry()} disabled={retrying}>
            {retrying ? "Checking" : "Check again"}
          </Button>
        ) : null}
      </div>,
      { foot: sources },
    );
  }

  const live = orderAssumptions(data.assumptions.filter((a) => !hidden.has(a.id)));
  const broken = live.filter((a) => a.status === "broken" && a.open_break);
  const watching = live.filter((a) => !(a.status === "broken" && a.open_break));
  const atLimit = live.length >= LIMITS.perDecision;

  const addButton =
    data.can_edit && editing !== "new" ? (
      <Button
        ref={addBtn}
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setEditing("new")}
        disabled={atLimit}
        title={atLimit ? `A decision can hold ${LIMITS.perDecision} reasons` : undefined}
      >
        <Plus size={15} weight="bold" aria-hidden />
        Add a reason
      </Button>
    ) : live.length ? (
      <Count n={live.length} label={live.length === 1 ? "reason" : "reasons"} />
    ) : null;

  const closeEditor = () => {
    const was = editing;
    setEditing(null);
    window.setTimeout(() => {
      if (was === "new") addBtn.current?.focus();
      else if (was) document.getElementById(`assumption-${was}`)?.focus();
    }, 0);
  };

  return frame(
    <>
      {data.reopened ? (
        <div className="px-4 pt-4 sm:px-[22px]">
          <Note tone="warning">
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <ArrowCounterClockwise size={15} weight="bold" aria-hidden />
              <strong className="font-semibold">Reopened {dayLabel(data.reopened.at)}</strong>
              {data.reopened.by ? `by ${data.reopened.by.name}` : null}
            </span>
            <span className="block text-ink-2">
              A reason for it no longer holds. Everyone with a task from this decision was asked to keep, re-scope or close it.
              {data.reopened.note ? ` “${data.reopened.note}”` : ""}
            </span>
          </Note>
        </div>
      ) : null}

      {broken.length ? (
        <div className="space-y-4 px-4 pt-4 sm:px-[22px]">
          {broken.map((a) => (
            <BrokenAssumption
              key={a.id}
              a={a}
              why={data}
              lit={lit === a.id}
              onAssumption={replace}
              onWhy={(w) => setLoad({ ok: true, data: w })}
              onReread={() => void reread()}
            />
          ))}
        </div>
      ) : null}

      {watching.length === 0 && broken.length === 0 && editing !== "new" ? (
        <div className="flex flex-col items-start gap-3 px-4 py-6 sm:flex-row sm:items-center sm:gap-5 sm:px-[22px]">
          <svg viewBox="0 0 120 64" aria-hidden className="mx-draw line-stroke h-12 w-[90px] shrink-0">
            <path pathLength={1} d="M4 50 C24 50 30 50 44 50 C62 50 72 26 60 26 C48 26 50 50 70 50 C86 50 96 50 116 50" />
          </svg>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">No reasons recorded yet</p>
            <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-ink-3">
              {data.can_edit
                ? "Your Myte didn't hear a reason it could watch in what was said. Add what this decision rests on, and you will hear from your Myte if one stops being true."
                : `Your Myte didn't hear a reason it could watch in what was said. ${data.owner?.name ?? "The decision's owner"} can add them.`}
            </p>
          </div>
        </div>
      ) : null}

      {watching.length ? (
        <ol className={`divide-y divide-line ${broken.length ? "mt-4 border-t border-line" : ""}`} aria-label="Reasons being watched">
          {watching.map((a) => (
            <li
              key={a.id}
              id={`assumption-${a.id}`}
              tabIndex={-1}
              className={`scroll-mt-24 px-4 py-[18px] outline-none transition-[background-color,box-shadow] duration-200 ease-[var(--ease-out)] focus-visible:shadow-[inset_0_0_0_2px_var(--signal)] motion-reduce:transition-none sm:px-[22px] ${
                lit === a.id ? "bg-signal-soft shadow-[inset_0_0_0_2px_var(--signal)]" : ""
              }`}
            >
              {editing === a.id ? (
                <AssumptionForm
                  initial={draftOf(a)}
                  statedBy={a.stated_by}
                  saveLabel="Save reason"
                  onSave={(d) => save(a.id, d)}
                  onCancel={closeEditor}
                />
              ) : (
                <AssumptionRow a={a} canEdit={data.can_edit} onEdit={() => setEditing(a.id)} onRemove={() => remove(a)} />
              )}
            </li>
          ))}
        </ol>
      ) : null}

      {editing === "new" ? (
        <div className={`bg-surface-2 px-4 py-[18px] sm:px-[22px] ${live.length || broken.length ? "mt-4 border-t border-line" : ""}`}>
          <h3 className="mb-4 text-[15px] font-semibold text-ink">A new reason</h3>
          <AssumptionForm initial={EMPTY_DRAFT} statedBy={null} saveLabel="Add reason" onSave={(d) => save("new", d)} onCancel={closeEditor} />
        </div>
      ) : (
        <div className="h-1" aria-hidden />
      )}
    </>,
    { right: addButton, foot: sources },
  );
}
