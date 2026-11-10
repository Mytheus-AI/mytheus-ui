"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Note, fieldClass, textareaClass } from "@/components/settings/primitives";
import { createGoal, deleteGoal, reorderGoals, updateGoal } from "@/app/actions/org-brain";
import {
  BRAIN_LIMITS,
  GOAL_STATUSES,
  GOAL_STATUS_LABEL,
  moveItem,
  reorderPatches,
  sortGoals,
  validateGoal,
  type FieldErrors,
  type GoalField,
  type GoalStatus,
  type OrgGoal,
} from "@/lib/api/org-brain-types";
import { memberMap, type MemberOption } from "./types";
import { FieldMsg, FlashLine, MemberPicker, PersonLine, RemoveButton, useFlash } from "./ui";

/* Goals (ADR-0039 A4): what matters now, in order. Agents link agenda items to them and weigh
   what they keep against them. The active goals as an ordered list (move with the arrow buttons,
   no dragging needed); achieved and dropped ones beside it. Every change shows at once and rolls
   back if the server refuses. */

const L = BRAIN_LIMITS.goals;
const STATUS_OPTIONS = GOAL_STATUSES.map((s) => ({ value: s, label: GOAL_STATUS_LABEL[s] }));
let tempSeq = 0;

type Draft = { title: string; description: string; period: string; status: GoalStatus; owner_user_id: string | null };
const toDraft = (g: OrgGoal): Draft => ({
  title: g.title,
  description: g.description ?? "",
  period: g.period ?? "",
  status: g.status,
  owner_user_id: g.owner_user_id,
});

function GoalForm({
  idBase,
  initial,
  members,
  errors,
  submitLabel,
  onSubmit,
  onCancel,
  showStatus,
}: {
  idBase: string;
  initial: Draft;
  members: MemberOption[];
  errors: FieldErrors<GoalField>;
  submitLabel: string;
  onSubmit: (d: Draft) => void;
  onCancel?: () => void;
  showStatus: boolean;
}) {
  const [d, setD] = useState(initial);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const msg = (f: GoalField) => (errors[f] ? `${idBase}-${f}-msg` : undefined);
  return (
    <form
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit(d);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onCancel) {
          e.preventDefault();
          onCancel();
        }
      }}
      className="grid gap-4"
    >
      <div>
        <label htmlFor={`${idBase}-title`} className="mb-1 block text-[13px] font-semibold text-ink-3">
          Goal
        </label>
        <input
          id={`${idBase}-title`}
          value={d.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Move 40 firms onto Nimbus before January"
          autoComplete="off"
          autoFocus={!!onCancel}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={msg("title")}
          className={`${fieldClass} ${errors.title ? "!border-priority-high" : ""}`}
        />
        <FieldMsg id={`${idBase}-title-msg`} error={errors.title} />
      </div>
      <div className={`grid gap-4 ${showStatus ? "md:grid-cols-[140px_minmax(0,1fr)_160px]" : "md:grid-cols-[140px_minmax(0,1fr)]"}`}>
        <div>
          <label htmlFor={`${idBase}-period`} className="mb-1 block text-[13px] font-semibold text-ink-3">
            Period
          </label>
          <input
            id={`${idBase}-period`}
            value={d.period}
            onChange={(e) => set({ period: e.target.value })}
            placeholder="2026-Q4"
            autoComplete="off"
            aria-invalid={errors.period ? true : undefined}
            aria-describedby={msg("period")}
            className={`${fieldClass} ${errors.period ? "!border-priority-high" : ""}`}
          />
          <FieldMsg id={`${idBase}-period-msg`} error={errors.period} />
        </div>
        <div className="min-w-0">
          <span className="mb-1 block text-[13px] font-semibold text-ink-3">Owner</span>
          <MemberPicker
            members={members}
            value={d.owner_user_id}
            onChange={(id) => set({ owner_user_id: id })}
            label="Goal owner"
            allowNone
          />
        </div>
        {showStatus ? (
          <div>
            <span className="mb-1 block text-[13px] font-semibold text-ink-3">Status</span>
            <Select value={d.status} onChange={(s) => set({ status: s })} options={STATUS_OPTIONS} label="Status" />
            <FieldMsg id={`${idBase}-status-msg`} error={errors.status} />
          </div>
        ) : null}
      </div>
      <div>
        <label htmlFor={`${idBase}-description`} className="mb-1 block text-[13px] font-semibold text-ink-3">
          Detail <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id={`${idBase}-description`}
          value={d.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={2}
          placeholder="Why it matters, and how we will know."
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={msg("description")}
          className={`${textareaClass} !resize-y ${errors.description ? "!border-priority-high" : ""}`}
        />
        <FieldMsg id={`${idBase}-description-msg`} error={errors.description} />
      </div>
      {!showStatus && errors.status ? <FieldMsg id={`${idBase}-status-msg`} error={errors.status} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="focus-visible:!rounded-ctl">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="focus-visible:!rounded-ctl">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

const iconBtn =
  "grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors duration-150 hover:bg-bg-2 hover:text-ink focus-visible:!rounded-ctl disabled:pointer-events-none disabled:opacity-35";

export function GoalsEditor({
  initial,
  members,
  canEdit,
  defaultPeriod,
}: {
  initial: OrgGoal[];
  members: MemberOption[] | null;
  canEdit: boolean;
  defaultPeriod: string;
}) {
  const [goals, setGoals] = useState(() => sortGoals(initial));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<FieldErrors<GoalField>>({});
  const [editDraft, setEditDraft] = useState<Draft | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [addDraft, setAddDraft] = useState<Draft>({ title: "", description: "", period: defaultPeriod, status: "active", owner_user_id: null });
  const [addErrors, setAddErrors] = useState<FieldErrors<GoalField>>({});
  const [flash, setFlash] = useFlash();
  const moveRefs = useRef(new Map<string, HTMLButtonElement | null>());

  const people = useMemo(() => memberMap(members ?? []), [members]);
  const active = goals.filter((g) => g.status === "active");
  const rest = goals.filter((g) => g.status !== "active");

  const mark = (id: string, on: boolean) =>
    setPending((p) => {
      const n = new Set(p);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const add = async (d: Draft) => {
    const checked = validateGoal({ ...d, status: "active" }, active.length);
    if (!checked.ok) {
      setAddDraft(d);
      setAddErrors(checked.errors);
      setAddKey((k) => k + 1);
      return;
    }
    setAddErrors({});
    const position = goals.reduce((m, g) => Math.max(m, g.position + 1), 0);
    const tempId = `temp-${++tempSeq}`;
    setGoals((g) => [...g, { id: tempId, ...checked.value, position, created_at: "", updated_at: "" }]);
    mark(tempId, true);
    setAddDraft({ title: "", description: "", period: d.period, status: "active", owner_user_id: null });
    setAddKey((k) => k + 1);
    const res = await createGoal({ ...checked.value, position });
    mark(tempId, false);
    if (res.ok) {
      setGoals((g) => g.map((x) => (x.id === tempId ? res.data : x)));
      setFlash({ tone: "ok", text: "Goal added." });
    } else {
      setGoals((g) => g.filter((x) => x.id !== tempId));
      setAddDraft(d);
      setAddErrors(res.fieldErrors ?? {});
      setAddKey((k) => k + 1);
      setFlash({ tone: "error", text: res.message });
    }
  };

  const save = async (before: OrgGoal, d: Draft) => {
    const activeOthers = active.filter((g) => g.id !== before.id).length;
    const checked = validateGoal(d, activeOthers);
    if (!checked.ok) {
      setEditDraft(d);
      setEditErrors(checked.errors);
      return;
    }
    setEditing(null);
    setGoals((g) => g.map((x) => (x.id === before.id ? { ...x, ...checked.value } : x)));
    mark(before.id, true);
    const res = await updateGoal(before.id, checked.value);
    mark(before.id, false);
    if (res.ok) {
      setGoals((g) => g.map((x) => (x.id === before.id ? res.data : x)));
      setFlash({
        tone: "ok",
        text: before.status !== res.data.status ? `Marked ${GOAL_STATUS_LABEL[res.data.status].toLowerCase()}.` : "Goal saved.",
      });
    } else if (res.gone) {
      setGoals((g) => g.filter((x) => x.id !== before.id));
      setFlash({ tone: "error", text: res.message });
    } else {
      setGoals((g) => g.map((x) => (x.id === before.id ? before : x)));
      setEditing(before.id);
      setEditDraft(d);
      setEditErrors(res.fieldErrors ?? {});
      setFlash({ tone: "error", text: res.message });
    }
  };

  const setStatus = (g: OrgGoal, status: GoalStatus) => void save(g, { ...toDraft(g), status });

  const move = async (index: number, to: number) => {
    const before = goals;
    const nextActive = moveItem(active, index, to);
    const ordered = [...nextActive, ...rest];
    const patches = reorderPatches(ordered);
    if (!patches.length) return;
    const positioned = ordered.map((g, i) => ({ ...g, position: i }));
    setGoals(positioned);
    const id = active[index].id;
    // keep focus on the same arrow of the moved goal, so repeated presses keep moving it
    requestAnimationFrame(() => moveRefs.current.get(`${id}-${to < index ? "up" : "down"}`)?.focus());
    const res = await reorderGoals(patches.filter((p) => !p.id.startsWith("temp-")));
    if (res.ok) {
      setGoals(res.data);
      setFlash({ tone: "ok", text: `Moved to number ${to + 1}.` });
    } else {
      setGoals(before);
      setFlash({ tone: "error", text: res.message });
    }
  };

  const remove = async (g: OrgGoal) => {
    const before = goals;
    setGoals((list) => list.filter((x) => x.id !== g.id));
    const res = await deleteGoal(g.id);
    if (res.ok) setFlash({ tone: "ok", text: "Goal removed." });
    else {
      setGoals(before);
      setFlash({ tone: "error", text: res.message });
    }
  };

  const editable = canEdit;

  const goalBody = (g: OrgGoal) => {
    const owner = g.owner_user_id ? people.get(g.owner_user_id) : null;
    return (
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold leading-snug text-ink">{g.title}</p>
        {g.description ? <p className="mt-1 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-3">{g.description}</p> : null}
        {g.period || g.owner_user_id ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-ink-3">
            {g.period ? <span className="rounded-full bg-bg-2 px-2.5 py-[2px] font-semibold text-ink-2">{g.period}</span> : null}
            {g.owner_user_id ? <PersonLine member={owner} /> : null}
          </div>
        ) : null}
      </div>
    );
  };

  const editor = (g: OrgGoal) => (
    <GoalForm
      idBase={`goal-${g.id}`}
      initial={editDraft ?? toDraft(g)}
      members={members ?? []}
      errors={editErrors}
      submitLabel="Save goal"
      showStatus
      onSubmit={(d) => save(g, d)}
      onCancel={() => {
        setEditing(null);
        setEditErrors({});
      }}
    />
  );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,330px)]">
      <section aria-labelledby="active-goals-h" className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-4 pb-3 pt-[18px] sm:px-[22px]">
          <h3 id="active-goals-h" className="text-[17px] font-semibold text-ink">
            Active goals
          </h3>
          <span className="text-[13px] tabular-nums text-ink-3">
            {active.length} of {L.maxActive}
          </span>
        </div>
        {canEdit && members === null ? (
          <div className="px-4 pb-3 sm:px-[22px]">
            <Note tone="warning">The member list could not be loaded, so owners show as unknown. Goals still save.</Note>
          </div>
        ) : null}

        {active.length === 0 ? (
          <EmptyState
            className="!rounded-none !border-0 !border-t !border-line !bg-transparent"
            title="No active goals"
            description={
              canEdit
                ? "One goal is enough to start. Agents tie agenda items to it and keep what moves it forward."
                : "When an admin sets the company's goals, they appear here."
            }
          />
        ) : (
          <ol aria-label="Active goals, in order" className="divide-y divide-line border-t border-line">
            {active.map((g, i) => {
              const busy = pending.has(g.id);
              return (
                <li key={g.id} aria-busy={busy || undefined} className={`px-4 py-4 transition-opacity duration-150 sm:px-[22px] ${busy ? "opacity-60" : ""}`}>
                  {editing === g.id ? (
                    editor(g)
                  ) : (
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span aria-hidden className="display w-7 shrink-0 pt-0.5 text-right text-[24px] leading-none tabular-nums text-signal-ink">
                        {i + 1}
                      </span>
                      <span className="sr-only">Number {i + 1}: </span>
                      {goalBody(g)}
                      {editable ? (
                        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                          <div className="flex">
                            <button
                              ref={(el) => {
                                moveRefs.current.set(`${g.id}-up`, el);
                              }}
                              type="button"
                              className={iconBtn}
                              disabled={i === 0 || busy}
                              onClick={() => move(i, i - 1)}
                              aria-label={`Move ${g.title} up`}
                              title="Move up"
                            >
                              <ArrowUp size={16} aria-hidden />
                            </button>
                            <button
                              ref={(el) => {
                                moveRefs.current.set(`${g.id}-down`, el);
                              }}
                              type="button"
                              className={iconBtn}
                              disabled={i === active.length - 1 || busy}
                              onClick={() => move(i, i + 1)}
                              aria-label={`Move ${g.title} down`}
                              title="Move down"
                            >
                              <ArrowDown size={16} aria-hidden />
                            </button>
                          </div>
                          <div className="flex">
                            <button
                              type="button"
                              className={iconBtn}
                              disabled={busy}
                              onClick={() => {
                                setEditing(g.id);
                                setEditDraft(null);
                                setEditErrors({});
                              }}
                              aria-label={`Edit ${g.title}`}
                              title="Edit"
                            >
                              <PencilSimple size={16} aria-hidden />
                            </button>
                            <RemoveButton what="this goal" compact disabled={busy} onConfirm={() => remove(g)} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                  {editable && editing !== g.id ? (
                    <div className="mt-2 flex flex-wrap gap-2 pl-10 sm:pl-11">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(g, "achieved")}
                        className="inline-flex h-9 items-center rounded-full border border-line-2 px-3 text-[13.5px] font-semibold text-ink-2 transition-colors hover:border-ok hover:bg-ok-soft hover:text-ok focus-visible:!rounded-full"
                      >
                        Mark achieved
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(g, "dropped")}
                        className="inline-flex h-9 items-center rounded-full border border-transparent px-3 text-[13.5px] font-semibold text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink focus-visible:!rounded-full"
                      >
                        Drop
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {canEdit ? (
          <div className="border-t border-line bg-surface-2 px-4 py-4 sm:px-[22px]">
            {active.length >= L.maxActive ? (
              <p className="text-[14px] text-ink-3">
                {L.maxActive} goals are active, the most there can be. Mark one achieved or dropped to add another.
              </p>
            ) : (
              <>
                <h4 className="mb-3 text-[14px] font-semibold text-ink">Add a goal</h4>
                <GoalForm
                  key={addKey}
                  idBase="new-goal"
                  initial={addDraft}
                  members={members ?? []}
                  errors={addErrors}
                  submitLabel="Add goal"
                  showStatus={false}
                  onSubmit={add}
                />
              </>
            )}
            <FlashLine flash={flash} className="mt-3" />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="past-goals-h" className="rounded-card border border-line bg-surface-2 p-5 xl:sticky xl:top-4">
        <h3 id="past-goals-h" className="text-[15px] font-semibold text-ink">
          Achieved and dropped
        </h3>
        {rest.length === 0 ? (
          <p className="mt-2 text-[14px] leading-relaxed text-ink-3">Goals you mark achieved or drop move here. Agents stop weighing them.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rest.map((g) => {
              const busy = pending.has(g.id);
              return (
                <li key={g.id} className={`rounded-ctl border border-line bg-surface p-3.5 ${busy ? "opacity-60" : ""}`}>
                  {editing === g.id ? (
                    editor(g)
                  ) : (
                    <>
                      <p className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-[2px] text-[12.5px] font-semibold ${
                            g.status === "achieved" ? "bg-ok-soft text-ok" : "bg-bg-2 text-ink-3"
                          }`}
                        >
                          {GOAL_STATUS_LABEL[g.status]}
                        </span>
                        {g.period ? <span className="text-[13px] text-ink-3">{g.period}</span> : null}
                      </p>
                      <p className={`mt-1.5 text-[14.5px] font-semibold leading-snug ${g.status === "dropped" ? "text-ink-3" : "text-ink"}`}>{g.title}</p>
                      {editable ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            disabled={busy || active.length >= L.maxActive}
                            onClick={() => setStatus(g, "active")}
                            className="inline-flex h-9 items-center rounded-ctl px-2.5 text-[13.5px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal focus-visible:!rounded-ctl disabled:opacity-40"
                          >
                            Make active again
                          </button>
                          <RemoveButton what="this goal" compact disabled={busy} onConfirm={() => remove(g)} />
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
