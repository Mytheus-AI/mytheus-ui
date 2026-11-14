"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Repeat } from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { textareaClass } from "@/components/ui/Form";
import { createRoutine, updateRoutine } from "@/app/actions/myte-v2";
import { notifyError, notifySuccess } from "@/lib/toast";
import { browserTimeZone } from "@/lib/timezone";
import { CADENCE_LABEL, CADENCES, WEEKDAYS, checkRoutineDraft, hourLabel, nextRunWords, zoneOptions, type RoutineDraft } from "@/lib/ask-myte/routines";
import type { AskScope, Cadence, Routine } from "@/lib/ask-myte/types";

/* "Make this a routine" (ADR-0049 F5): the question to ask each time, how often (every day,
   every weekday, or one day a week), at what hour, in which time zone (the browser's by default),
   and a live preview of the next run. Used from any answer, the composer's /routine shortcut and
   the Routines card on Your Myte. Runs happen the next time you open Mytheus after they are due;
   the dialog says so. */

export function RoutineDialog({
  open,
  onClose,
  question = "",
  scope = null,
  editing = null,
  onSaved,
  myteName = "your Myte",
}: {
  open: boolean;
  onClose: () => void;
  /** the question to start from (an answer's question, or what was typed) */
  question?: string;
  scope?: AskScope | null;
  /** an existing routine to change */
  editing?: Routine | null;
  onSaved?: (r: Routine) => void;
  myteName?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<RoutineDraft>(() => fresh(question, editing));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(fresh(question, editing));
      setError(null);
    }
  }, [open, question, editing]);

  const zones = useMemo(() => zoneOptions(draft.timezone).map((z) => ({ value: z, label: z.replace(/_/g, " ") })), [draft.timezone]);
  const preview = nextRunWords(draft, new Date());
  const set = (patch: Partial<RoutineDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    const checked = checkRoutineDraft(draft);
    if (!checked.ok) {
      setError({ field: checked.field, message: checked.message });
      return;
    }
    setBusy(true);
    const res = editing ? await updateRoutine(editing.id, checked.value) : await createRoutine(checked.value, scope);
    setBusy(false);
    if (!res.ok) {
      setError({ field: "form", message: res.message });
      notifyError(res.message);
      return;
    }
    notifySuccess(editing ? "Routine updated" : "Routine saved");
    onSaved?.(res.routine);
    onClose();
  };

  const labelCls = "mb-1 block text-[13px] font-semibold text-ink-3";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={editing ? "Change this routine" : "Make this a routine"}
      description={`${myteName} asks it for you on a schedule, and the answer waits for you the next time you open Mytheus.`}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div>
          <label htmlFor={`${id}-q`} className={labelCls}>
            Ask each time
          </label>
          <textarea
            id={`${id}-q`}
            rows={3}
            maxLength={2000}
            value={draft.question}
            aria-invalid={error?.field === "question" || undefined}
            aria-describedby={error?.field === "question" ? `${id}-err` : undefined}
            onChange={(e) => set({ question: e.target.value })}
            className={textareaClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span id={`${id}-c`} className={labelCls}>
              How often
            </span>
            <Dropdown
              labelledBy={`${id}-c`}
              label="How often"
              size="lg"
              value={draft.cadence}
              onChange={(v) => set({ cadence: v as Cadence, weekday: v === "weekly" ? draft.weekday ?? 0 : null })}
              options={CADENCES.map((c) => ({ value: c, label: CADENCE_LABEL[c] }))}
            />
          </div>
          {draft.cadence === "weekly" ? (
            <div>
              <span id={`${id}-w`} className={labelCls}>
                On
              </span>
              <Dropdown
                labelledBy={`${id}-w`}
                label="Day of the week"
                size="lg"
                value={String(draft.weekday ?? 0)}
                onChange={(v) => set({ weekday: Number(v) })}
                options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
              />
            </div>
          ) : null}
          <div>
            <span id={`${id}-h`} className={labelCls}>
              At
            </span>
            <Dropdown
              labelledBy={`${id}-h`}
              label="Hour"
              size="lg"
              value={String(draft.hour)}
              onChange={(v) => set({ hour: Number(v) })}
              options={Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: hourLabel(h) }))}
            />
          </div>
          <div className={draft.cadence === "weekly" ? "" : "sm:col-span-1"}>
            <span id={`${id}-z`} className={labelCls}>
              Time zone
            </span>
            <Dropdown labelledBy={`${id}-z`} label="Time zone" size="lg" value={draft.timezone} onChange={(v) => set({ timezone: v })} options={zones} />
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-ctl bg-bg-2 px-3.5 py-3 text-[14px] leading-relaxed text-ink-2">
          <Repeat size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
          <span>
            {preview ? (
              <>
                Next: <span className="font-semibold text-ink">{preview}</span>. It runs when you next open Mytheus after that, and lands in a new
                conversation.
              </>
            ) : (
              "Pick when it should run."
            )}
          </span>
        </p>

        {error ? (
          <p id={`${id}-err`} className="text-[14px] text-priority-high" role="alert">
            {error.message}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !draft.question.trim()}>
            {busy ? "Saving" : editing ? "Save routine" : "Make it a routine"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function fresh(question: string, editing: Routine | null): RoutineDraft {
  if (editing) return { question: editing.question, cadence: editing.cadence, weekday: editing.weekday, hour: editing.hour, timezone: editing.timezone };
  return { question: question.trim(), cadence: "weekly", weekday: 0, hour: 9, timezone: browserTimeZone() };
}
