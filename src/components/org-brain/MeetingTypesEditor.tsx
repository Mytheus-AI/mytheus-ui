"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Clock, LockSimple, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toggle } from "@/components/settings/Toggle";
import { fieldClass, textareaClass } from "@/components/settings/primitives";
import { createTemplate, deleteTemplate, updateTemplate } from "@/app/actions/org-brain";
import {
  BRAIN_LIMITS,
  agendaMinutes,
  moveItem,
  validateTemplate,
  type FieldErrors,
  type MeetingTemplate,
  type TemplateField,
} from "@/lib/api/org-brain-types";
import { FieldMsg, FlashLine, RemoveButton, useFlash, type Flash } from "./ui";

/* Meeting types (ADR-0039 B1, B2): a name, what it is for, a default length, a starting agenda
   and whether meetings of this type are confidential. Picking one on "New meeting" fills all of
   that in. The types on the left, the one being edited on the right. Optimistic with rollback. */

const L = BRAIN_LIMITS.templates;
const LENGTHS = [15, 30, 45, 60, 90];
let tempSeq = 0;

type Row = { key: string; title: string; minutes: string };
type Draft = { name: string; description: string; minutes: string; agenda: Row[]; confidential: boolean };

let rowSeq = 0;
const row = (title = "", minutes = ""): Row => ({ key: `r${++rowSeq}`, title, minutes });
const toDraft = (t: MeetingTemplate | null): Draft =>
  t
    ? {
        name: t.name,
        description: t.description,
        minutes: String(t.default_duration_minutes),
        agenda: t.agenda.map((a) => row(a.title, a.duration_minutes === null ? "" : String(a.duration_minutes))),
        confidential: t.confidential,
      }
    : { name: "", description: "", minutes: "30", agenda: [row()], confidential: false };

function TemplateForm({
  template,
  all,
  onSaved,
  onRemoved,
  onCancel,
  notify,
}: {
  template: MeetingTemplate | null;
  all: MeetingTemplate[];
  onSaved: (t: MeetingTemplate, tempId?: string) => void;
  onRemoved: (t: MeetingTemplate) => void;
  onCancel: () => void;
  /** the list's status line, which outlives this form */
  notify: (f: Flash) => void;
}) {
  const uid = useId();
  const [d, setD] = useState<Draft>(() => toDraft(template));
  const [errors, setErrors] = useState<FieldErrors<TemplateField>>({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const setRow = (key: string, p: Partial<Row>) => set({ agenda: d.agenda.map((r) => (r.key === key ? { ...r, ...p } : r)) });

  const total = agendaMinutes(d.agenda.map((r) => ({ title: r.title, duration_minutes: Number(r.minutes) || null })));
  const length = Number(d.minutes) || 0;
  const id = (f: string) => `${uid}-${f}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const checked = validateTemplate(
      {
        name: d.name,
        description: d.description,
        default_duration_minutes: d.minutes,
        agenda: d.agenda.map((r) => ({ title: r.title, duration_minutes: r.minutes })),
        confidential: d.confidential,
      },
      all,
      template?.id,
    );
    if (!checked.ok) {
      setErrors(checked.errors);
      setFlash({ tone: "error", text: Object.values(checked.errors).find(Boolean) ?? "Check the details." });
      const first = (["name", "description", "default_duration_minutes", "agenda"] as const).find((f) => checked.errors[f]);
      if (first) document.getElementById(id(first))?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    setFlash({ tone: "busy", text: "Saving" });
    if (template) {
      const optimistic = { ...template, ...checked.value };
      onSaved(optimistic);
      const res = await updateTemplate(template.id, checked.value);
      setBusy(false);
      if (res.ok) {
        onSaved(res.data);
        setFlash({ tone: "ok", text: `${res.data.name} saved.` });
      } else {
        onSaved(template);
        setErrors(res.fieldErrors ?? {});
        setFlash({ tone: "error", text: res.message });
      }
    } else {
      const tempId = `temp-${++tempSeq}`;
      onSaved({ id: tempId, ...checked.value, created_by: null, created_at: "", updated_at: "" });
      const res = await createTemplate(checked.value);
      setBusy(false);
      if (res.ok) {
        notify({ tone: "ok", text: `${res.data.name} added.` });
        onSaved(res.data, tempId);
      } else {
        onRemoved({ id: tempId } as MeetingTemplate);
        setErrors(res.fieldErrors ?? {});
        setFlash({ tone: "error", text: res.message });
      }
    }
  };

  return (
    <form onSubmit={submit} noValidate aria-busy={busy || undefined} aria-labelledby={id("h")} className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <div className="flex items-start justify-between gap-3 px-4 pb-1 pt-[18px] sm:px-[22px]">
        <h3 id={id("h")} className="display text-[22px] text-ink">
          {template ? `Edit ${template.name}` : "New meeting type"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close the editor"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink focus-visible:!rounded-ctl"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="grid gap-5 px-4 py-4 sm:px-[22px]">
        <div>
          <label htmlFor={id("name")} className="mb-1 block text-[14px] font-semibold text-ink">
            Name
          </label>
          <input
            id={id("name")}
            value={d.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Weekly sync"
            autoComplete="off"
            autoFocus={!template}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? id("name-msg") : undefined}
            className={`${fieldClass} ${errors.name ? "!border-priority-high" : ""}`}
          />
          <FieldMsg id={id("name-msg")} error={errors.name} />
        </div>

        <div>
          <label htmlFor={id("description")} className="mb-1 block text-[14px] font-semibold text-ink">
            What it is for <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <textarea
            id={id("description")}
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={2}
            placeholder="A short weekly check on progress and blockers."
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? id("description-msg") : undefined}
            className={`${textareaClass} !resize-y ${errors.description ? "!border-priority-high" : ""}`}
          />
          <FieldMsg id={id("description-msg")} error={errors.description} />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[14px] font-semibold text-ink">Default length</legend>
          <div className="flex flex-wrap items-center gap-1.5">
            {LENGTHS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={d.minutes === String(m)}
                onClick={() => set({ minutes: String(m) })}
                className={`inline-flex h-10 items-center rounded-full border px-3.5 text-[14px] font-semibold tabular-nums transition-colors focus-visible:!rounded-full ${
                  d.minutes === String(m) ? "border-pill bg-pill text-pill-on" : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
                }`}
              >
                {m} min
              </button>
            ))}
            <label className="ml-1 inline-flex items-center gap-2 text-[14px] text-ink-3">
              <span className="sr-only">Length in minutes</span>
              <input
                id={id("default_duration_minutes")}
                type="number"
                inputMode="numeric"
                min={L.durationMin}
                max={L.durationMax}
                value={d.minutes}
                onChange={(e) => set({ minutes: e.target.value })}
                aria-invalid={errors.default_duration_minutes ? true : undefined}
                aria-describedby={id("minutes-msg")}
                className={`${fieldClass} !h-10 !w-[88px] tabular-nums ${errors.default_duration_minutes ? "!border-priority-high" : ""}`}
              />
              minutes
            </label>
          </div>
          <FieldMsg id={id("minutes-msg")} error={errors.default_duration_minutes} hint={`From ${L.durationMin} to ${L.durationMax} minutes.`} />
        </fieldset>

        <fieldset>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <legend className="text-[14px] font-semibold text-ink">Starting agenda</legend>
            <span className={`text-[13px] tabular-nums ${length && total > length ? "text-priority-medium" : "text-ink-3"}`}>
              {total ? `${total} of ${length || "?"} minutes planned` : "Minutes are optional"}
            </span>
          </div>
          <ol id={id("agenda")} tabIndex={-1} className="grid gap-2 rounded-ctl focus-visible:outline-none" aria-label="Agenda items">
            {d.agenda.map((r, i) => (
              <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_76px_auto] items-center gap-1.5">
                <label className="sr-only" htmlFor={id(`t-${r.key}`)}>
                  Agenda item {i + 1}
                </label>
                <input
                  id={id(`t-${r.key}`)}
                  value={r.title}
                  onChange={(e) => setRow(r.key, { title: e.target.value })}
                  placeholder={i === 0 ? "Wins since last week" : "Next item"}
                  autoComplete="off"
                  className={`${fieldClass} !h-10 !text-[14.5px]`}
                />
                <label className="sr-only" htmlFor={id(`m-${r.key}`)}>
                  Minutes for item {i + 1}
                </label>
                <input
                  id={id(`m-${r.key}`)}
                  type="number"
                  inputMode="numeric"
                  min={L.itemMinutesMin}
                  max={L.itemMinutesMax}
                  value={r.minutes}
                  onChange={(e) => setRow(r.key, { minutes: e.target.value })}
                  placeholder="min"
                  className={`${fieldClass} !h-10 !px-2.5 text-center !text-[14.5px] tabular-nums`}
                />
                <span className="flex">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => set({ agenda: moveItem(d.agenda, i, i - 1) })}
                    aria-label={`Move item ${i + 1} up`}
                    className="grid h-10 w-9 place-items-center rounded-ctl text-ink-3 hover:bg-bg-2 hover:text-ink focus-visible:!rounded-ctl disabled:opacity-30"
                  >
                    <ArrowUp size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={i === d.agenda.length - 1}
                    onClick={() => set({ agenda: moveItem(d.agenda, i, i + 1) })}
                    aria-label={`Move item ${i + 1} down`}
                    className="grid h-10 w-9 place-items-center rounded-ctl text-ink-3 hover:bg-bg-2 hover:text-ink focus-visible:!rounded-ctl disabled:opacity-30"
                  >
                    <ArrowDown size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ agenda: d.agenda.filter((x) => x.key !== r.key) })}
                    aria-label={`Remove item ${i + 1}`}
                    className="grid h-10 w-9 place-items-center rounded-ctl text-ink-3 hover:bg-priority-high-soft hover:text-priority-high focus-visible:!rounded-ctl"
                  >
                    <X size={15} aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <FieldMsg id={id("agenda-msg")} error={errors.agenda} />
          <button
            type="button"
            disabled={d.agenda.length >= L.agendaMax}
            onClick={() => set({ agenda: [...d.agenda, row()] })}
            className="mt-2 inline-flex h-10 items-center gap-2 rounded-ctl px-2 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink focus-visible:!rounded-ctl disabled:opacity-40"
          >
            <Plus size={15} weight="bold" aria-hidden />
            Add agenda item
          </button>
        </fieldset>

        <div className="flex items-start justify-between gap-4 rounded-ctl bg-surface-2 px-4 py-3.5">
          <div className="min-w-0">
            <p id={id("conf")} className="text-[15px] font-semibold text-ink">
              Confidential by default
            </p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-3">
              Nothing from these meetings is shown to people who were not in them: no topic alerts, no links from other meetings.
              The host can still change it per meeting.
            </p>
          </div>
          <Toggle checked={d.confidential} onChange={(v) => set({ confidential: v })} labelledBy={id("conf")} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
        <Button type="submit" disabled={busy} className="focus-visible:!rounded-ctl">
          {busy ? "Saving" : template ? "Save meeting type" : "Add meeting type"}
        </Button>
        {template && !template.id.startsWith("temp-") ? (
          <RemoveButton
            what={template.name}
            disabled={busy}
            onConfirm={async () => {
              onRemoved(template);
              const res = await deleteTemplate(template.id);
              if (res.ok) notify({ tone: "ok", text: `${template.name} removed.` });
              else {
                onSaved(template);
                notify({ tone: "error", text: res.message });
              }
            }}
          />
        ) : null}
        <FlashLine flash={flash} />
      </div>
    </form>
  );
}

export function MeetingTypesEditor({ initial, canEdit }: { initial: MeetingTemplate[]; canEdit: boolean }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState<string | "new" | null>(null);
  const [flash, setFlash] = useFlash();

  const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const current = open && open !== "new" ? list.find((t) => t.id === open) ?? null : null;
  const full = list.length >= L.max;

  const onSaved = (t: MeetingTemplate, tempId?: string) => {
    setList((l) => {
      const without = l.filter((x) => x.id !== t.id && x.id !== tempId);
      return [...without, t];
    });
    // the saved copy replaces the optimistic one; the editor follows it to its real id
    if (tempId) setOpen(t.id);
  };
  const onRemoved = (t: MeetingTemplate) => {
    setList((l) => l.filter((x) => x.id !== t.id));
    if (!t.id.startsWith("temp-")) setOpen(null);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section aria-labelledby="types-h" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 id="types-h" className="text-[15px] font-semibold text-ink-3">
            {list.length} {list.length === 1 ? "type" : "types"}
            {canEdit ? <span className="font-normal"> of {L.max}</span> : null}
          </h3>
          {canEdit ? (
            <Button type="button" size="sm" onClick={() => setOpen("new")} disabled={full || open === "new"} className="focus-visible:!rounded-ctl">
              <Plus size={16} weight="bold" aria-hidden />
              New meeting type
            </Button>
          ) : null}
        </div>

        {list.length === 0 ? (
          <EmptyState
            title="No meeting types yet"
            description={
              canEdit
                ? "Save the meetings you run often, like a weekly sync or a customer call, with their length and agenda. New meetings start from them."
                : "When an admin saves the meetings the company runs often, they appear here."
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {sorted.map((t) => {
              const selected = open === t.id;
              const body = (
                <>
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-[16px] font-semibold leading-snug text-ink">{t.name}</span>
                    {t.confidential ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-bg-2 px-2.5 py-[3px] text-[12.5px] font-semibold text-ink-2">
                        <LockSimple size={12} weight="bold" aria-hidden />
                        Confidential
                      </span>
                    ) : null}
                  </span>
                  {t.description ? <span className="mt-1 line-clamp-2 block text-[14px] leading-snug text-ink-3">{t.description}</span> : null}
                  <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} aria-hidden />
                      {t.default_duration_minutes} min
                    </span>
                    <span>
                      {t.agenda.length} agenda {t.agenda.length === 1 ? "item" : "items"}
                    </span>
                  </span>
                  {t.agenda.length ? (
                    <span className="mt-2.5 block border-t border-line pt-2.5 text-[13.5px] leading-relaxed text-ink-2">
                      {t.agenda.slice(0, 3).map((a) => a.title).join(", ")}
                      {t.agenda.length > 3 ? `, and ${t.agenda.length - 3} more` : ""}
                    </span>
                  ) : null}
                </>
              );
              return (
                <li key={t.id} className={t.id.startsWith("temp-") ? "opacity-60" : undefined}>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setOpen(t.id)}
                      aria-pressed={selected}
                      aria-label={`Edit ${t.name}`}
                      className={`block w-full rounded-card border bg-surface p-4 text-left shadow-warm-1 transition-colors duration-150 focus-visible:!rounded-card ${
                        selected ? "border-signal shadow-[0_0_0_3px_var(--signal-soft)]" : "border-line hover:border-line-2 hover:bg-surface-2"
                      }`}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="rounded-card border border-line bg-surface p-4 shadow-warm-1">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <FlashLine flash={flash} className="mt-3" />
      </section>

      {canEdit ? (
        <div className={`min-w-0 lg:sticky lg:top-4 ${open ? "order-first lg:order-none" : ""}`}>
          {open ? (
            <TemplateForm
              key={open}
              template={current}
              all={list}
              onSaved={onSaved}
              onRemoved={onRemoved}
              onCancel={() => setOpen(null)}
              notify={setFlash}
            />
          ) : (
            <div className="hidden rounded-card border border-dashed border-line-2 bg-surface-2 px-6 py-10 text-center lg:block">
              <p className="font-display text-[19px] text-ink">Pick a meeting type to edit it</p>
              <p className="mx-auto mt-1.5 max-w-[42ch] text-[14px] leading-relaxed text-ink-3">
                Or add a new one. Hosts choose a type on New meeting, and its length, agenda and confidentiality fill in.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
