"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Sparkle, Target, Trash } from "@phosphor-icons/react";
import { Dropdown } from "@/components/ui/Dropdown";
import { AGENDA_LIMITS } from "@/lib/api/meeting-agenda-types";
import type { OrgGoal } from "@/lib/api/meeting-brain-types";
import {
  DRAFT_SOURCE_LABEL,
  addRow,
  canAddRow,
  moveRow,
  plannedMinutes,
  removeRow,
  retitleRow,
  updateRow,
  type AgendaDraftRow,
  type AgendaRowErrors,
} from "./agenda-editor-model";

/* The agenda editor (ADR-0038 D11), in the New meeting dialog and on the meeting page: one row
   per item with its title, an owner from the meeting's people and its minutes; add, remove, and
   move up or down with buttons (no drag, so it works from the keyboard and a screen reader the
   same). At most 20 items. Validation lives in `agenda-editor-model.ts`; this only shows its
   messages next to the field they belong to.

   ADR-0039 adds a second, quieter line per row: the company goal the item serves (only when the
   workspace has active goals) and, for a drafted row, where it came from. */

export type AgendaPerson = { id: string; name: string };

export function AgendaEditor({
  rows,
  onChange,
  people,
  errors = {},
  meetingMinutes,
  disabled = false,
  goals = [],
}: {
  rows: AgendaDraftRow[];
  onChange: (rows: AgendaDraftRow[]) => void;
  /** Who can own an item: the meeting's participants, the host included. */
  people: AgendaPerson[];
  errors?: Record<string, AgendaRowErrors>;
  /** The meeting's length, to say when the time boxes run past it. */
  meetingMinutes?: number;
  disabled?: boolean;
  /** Active company goals (ADR-0039 B3). The goal picker is hidden when there are none. */
  goals?: OrgGoal[];
}) {
  const uid = useId();
  const goalIds = new Set(goals.map((g) => g.id));
  const [announce, setAnnounce] = useState("");
  const planned = plannedMinutes(rows);
  const over = meetingMinutes !== undefined && planned > meetingMinutes;
  const known = new Set(people.map((p) => p.id));

  const focusLater = (id: string, fallback?: string) =>
    window.requestAnimationFrame(() => {
      const el = document.getElementById(id) as HTMLButtonElement | null;
      if (el && !el.disabled) el.focus();
      else if (fallback) document.getElementById(fallback)?.focus();
    });

  const move = (row: AgendaDraftRow, index: number, dir: -1 | 1) => {
    const next = moveRow(rows, row.key, dir);
    if (next === rows) return;
    onChange(next);
    setAnnounce(`${row.title.trim() || "Item"} moved to position ${index + dir + 1} of ${rows.length}.`);
    const which = dir === -1 ? "up" : "down";
    focusLater(`${uid}-${row.key}-${which}`, `${uid}-${row.key}-${which === "up" ? "down" : "up"}`);
  };

  const remove = (row: AgendaDraftRow, index: number) => {
    const next = removeRow(rows, row.key);
    onChange(next);
    setAnnounce(`${row.title.trim() || "Item"} removed.`);
    const neighbour = next[Math.min(index, next.length - 1)];
    focusLater(neighbour ? `${uid}-${neighbour.key}-title` : `${uid}-add`);
  };

  const add = () => {
    const next = addRow(rows);
    if (next === rows) return;
    onChange(next);
    const added = next[next.length - 1];
    window.requestAnimationFrame(() => document.getElementById(`${uid}-${added.key}-title`)?.focus());
  };

  return (
    <div className="ag-ed">
      {rows.length === 0 ? (
        <p className="ag-ed-empty">No agenda yet. Add the topics to cover and the meeting agent tracks them during the call.</p>
      ) : (
        <ol className="ag-ed-list">
          {rows.map((row, i) => {
            const e = errors[row.key] ?? {};
            const base = `${uid}-${row.key}`;
            const n = i + 1;
            const describedBy = (field: keyof AgendaRowErrors) => (e[field] ? `${base}-${field}-err` : undefined);
            return (
              <li key={row.key} className="ag-ed-row" role="group" aria-label={`Agenda item ${n}`}>
                <span className="ag-ed-num" aria-hidden="true">
                  {n}
                </span>
                <div className="ag-ed-fields">
                  <label className="ag-ed-title" htmlFor={`${base}-title`}>
                    <span className="sr-only">Item {n} title</span>
                    <input
                      id={`${base}-title`}
                      value={row.title}
                      maxLength={AGENDA_LIMITS.titleMax}
                      placeholder="What to cover"
                      autoComplete="off"
                      disabled={disabled}
                      aria-invalid={e.title ? true : undefined}
                      aria-describedby={describedBy("title")}
                      onChange={(ev) => onChange(retitleRow(rows, row.key, ev.target.value))}
                    />
                  </label>
                  <div className="ag-ed-owner">
                    <Dropdown
                      id={`${base}-owner`}
                      label={`Item ${n} owner`}
                      size="md"
                      value={row.ownerId}
                      disabled={disabled}
                      invalid={Boolean(e.owner)}
                      describedBy={describedBy("owner")}
                      options={[
                        { value: "", label: "No owner" },
                        ...people.map((p) => ({ value: p.id, label: p.name })),
                        ...(row.ownerId && !known.has(row.ownerId) ? [{ value: row.ownerId, label: "Not in this meeting" }] : []),
                      ]}
                      onChange={(v) => onChange(updateRow(rows, row.key, { ownerId: v }))}
                    />
                  </div>
                  <label className="ag-ed-min" htmlFor={`${base}-min`}>
                    <span className="sr-only">Item {n} minutes</span>
                    <input
                      id={`${base}-min`}
                      inputMode="numeric"
                      value={row.minutes}
                      placeholder="Min"
                      autoComplete="off"
                      maxLength={3}
                      disabled={disabled}
                      aria-invalid={e.minutes ? true : undefined}
                      aria-describedby={describedBy("minutes")}
                      onChange={(ev) => onChange(updateRow(rows, row.key, { minutes: ev.target.value.replace(/[^\d]/g, "") }))}
                    />
                  </label>
                  <span className="ag-ed-acts">
                    <button
                      id={`${base}-up`}
                      type="button"
                      className="cx-icon-btn sm tap"
                      aria-label={`Move item ${n} up`}
                      disabled={disabled || i === 0}
                      onClick={() => move(row, i, -1)}
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      id={`${base}-down`}
                      type="button"
                      className="cx-icon-btn sm tap"
                      aria-label={`Move item ${n} down`}
                      disabled={disabled || i === rows.length - 1}
                      onClick={() => move(row, i, 1)}
                    >
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="cx-icon-btn sm tap"
                      aria-label={`Remove item ${n}`}
                      disabled={disabled}
                      onClick={() => remove(row, i)}
                    >
                      <Trash size={16} aria-hidden="true" />
                    </button>
                  </span>
                </div>
                {goals.length > 0 || row.source ? (
                  <div className="ag-ed-sub">
                    {goals.length > 0 ? (
                      <div className="ag-ed-goal">
                        <Dropdown
                          id={`${base}-goal`}
                          label={`Item ${n} goal`}
                          size="sm"
                          shape="round"
                          icon={<Target size={15} />}
                          value={row.goalId ?? ""}
                          disabled={disabled}
                          options={[
                            { value: "", label: "No goal" },
                            ...goals.map((g) => ({ value: g.id, label: g.title, description: g.period ?? undefined })),
                            ...(row.goalId && !goalIds.has(row.goalId) ? [{ value: row.goalId, label: "A goal that is no longer active" }] : []),
                          ]}
                          onChange={(v) => onChange(updateRow(rows, row.key, { goalId: v }))}
                        />
                      </div>
                    ) : null}
                    {row.source ? (
                      <span className="ag-ed-src">
                        <Sparkle size={12} aria-hidden="true" />
                        {DRAFT_SOURCE_LABEL[row.source]}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {e.title || e.owner || e.minutes ? (
                  <div className="ag-ed-errs">
                    {(["title", "owner", "minutes"] as const).map((f) =>
                      e[f] ? (
                        <p key={f} id={`${base}-${f}-err`} className="ag-ed-err">
                          {e[f]}
                        </p>
                      ) : null,
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <div className="ag-ed-foot">
        <button
          id={`${uid}-add`}
          type="button"
          className="mx-btn is-outline is-sm tap"
          disabled={disabled || !canAddRow(rows)}
          onClick={add}
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          Add item
        </button>
        <span className={`ag-ed-sum${over ? " is-over" : ""}`}>
          {rows.length >= AGENDA_LIMITS.maxItems
            ? `${AGENDA_LIMITS.maxItems} items, the most an agenda can hold`
            : planned > 0
              ? over
                ? `${planned} min planned, longer than the ${meetingMinutes} min meeting`
                : `${planned} min planned`
              : null}
        </span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
