"use client";

import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ClipboardText, MagnifyingGlass, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { cardClass } from "@/components/ui/Card";
import { FieldMsg, fieldClass } from "@/components/ui/Form";
import { RemoveButton } from "@/components/ui/RemoveButton";
import { notifyError, notifySuccess } from "@/lib/toast";
import { createTerm, deleteTerm, updateTerm } from "@/app/actions/org-brain";
import {
  BRAIN_LIMITS,
  GLOSSARY_KINDS,
  KIND_LABEL,
  filterTerms,
  kindCounts,
  sortTerms,
  validateTerm,
  type FieldErrors,
  type GlossaryKind,
  type GlossaryTerm,
  type TermField,
} from "@/lib/api/org-brain-types";
import { GlossaryImport } from "./GlossaryImport";

/* Vocabulary (ADR-0039 A2): the company's own words, so agents understand them and captions
   spell them. A fast list: search, kinds as filter chips, an add row that stays open for the next
   term, edit in place, and "Paste a list" for bulk. Adds, edits and removals show at once and
   roll back with the server's reason if it refuses. Members see the same list without controls. */

const L = BRAIN_LIMITS.glossary;
const KIND_OPTIONS = GLOSSARY_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));
const COLS = "md:grid-cols-[minmax(150px,1fr)_118px_minmax(0,2fr)_auto]";

type Draft = { term: string; kind: GlossaryKind; definition: string; aliases: string };
const EMPTY_DRAFT: Draft = { term: "", kind: "product", definition: "", aliases: "" };

const toDraft = (t: GlossaryTerm): Draft => ({
  term: t.term,
  kind: t.kind,
  definition: t.definition ?? "",
  aliases: t.aliases.join(", "),
});
const splitAliases = (s: string) => s.split(/[,;]/).map((a) => a.trim()).filter(Boolean);

let tempSeq = 0;

const KIND_TONE: Record<GlossaryKind, ChipTone> = {
  product: "accent",
  customer: "low",
  codename: "medium",
  acronym: "neutral",
  person: "neutral",
  other: "neutral",
};

function KindChip({ kind }: { kind: GlossaryKind }) {
  return <Chip tone={KIND_TONE[kind]}>{KIND_LABEL[kind]}</Chip>;
}

/** The add and edit row. Enter saves, Escape cancels. */
function TermForm({
  idBase,
  initial,
  errors,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  idBase: string;
  initial: Draft;
  errors: FieldErrors<TermField>;
  busy: boolean;
  submitLabel: string;
  onSubmit: (d: Draft) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const [d, setD] = useState(initial);
  const termRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(d);
    if (!initial.term) {
      // A fresh add row clears and keeps focus for the next term; the parent restores it on failure.
      setD({ ...EMPTY_DRAFT, kind: d.kind });
      termRef.current?.focus();
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };
  const err = (f: TermField) => (errors[f] ? `${idBase}-${f}-msg` : undefined);

  return (
    <form onSubmit={submit} onKeyDown={onKey} noValidate aria-busy={busy || undefined} className={`grid gap-3 md:items-start md:gap-x-4 ${COLS}`}>
      <div className="min-w-0">
        <label htmlFor={`${idBase}-term`} className="mb-1 block text-[12.5px] font-semibold text-ink-3 md:sr-only">
          Term
        </label>
        <input
          ref={termRef}
          id={`${idBase}-term`}
          value={d.term}
          onChange={(e) => set({ term: e.target.value })}
          maxLength={L.term + 20}
          placeholder="Nimbus"
          autoFocus={autoFocus}
          autoComplete="off"
          aria-invalid={errors.term ? true : undefined}
          aria-describedby={err("term")}
          className={`${fieldClass} !h-10 ${errors.term ? "!border-priority-high" : ""}`}
        />
        <FieldMsg id={`${idBase}-term-msg`} error={errors.term} />
        <label htmlFor={`${idBase}-aliases`} className="mb-1 mt-3 block text-[12.5px] font-semibold text-ink-3">
          Other spellings <span className="font-normal">(optional)</span>
        </label>
        <input
          id={`${idBase}-aliases`}
          value={d.aliases}
          onChange={(e) => set({ aliases: e.target.value })}
          placeholder="NMB, Project N"
          autoComplete="off"
          aria-invalid={errors.aliases ? true : undefined}
          aria-describedby={err("aliases")}
          className={`${fieldClass} !h-10 !text-[14px] ${errors.aliases ? "!border-priority-high" : ""}`}
        />
        <FieldMsg id={`${idBase}-aliases-msg`} error={errors.aliases} />
      </div>
      <div className="min-w-0">
        <span className="mb-1 block text-[12.5px] font-semibold text-ink-3 md:sr-only">Kind</span>
        <Select value={d.kind} onChange={(k) => set({ kind: k })} options={KIND_OPTIONS} label="Kind" />
      </div>
      <div className="min-w-0">
        <label htmlFor={`${idBase}-definition`} className="mb-1 block text-[12.5px] font-semibold text-ink-3 md:sr-only">
          Definition
        </label>
        <textarea
          id={`${idBase}-definition`}
          value={d.definition}
          onChange={(e) => set({ definition: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder="Our invoicing product for accounting firms"
          aria-invalid={errors.definition ? true : undefined}
          aria-describedby={err("definition")}
          className={`block w-full resize-y rounded-ctl border bg-surface px-3.5 py-2 text-[14px] leading-snug text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 hover:border-ink-4 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] ${
            errors.definition ? "border-priority-high" : "border-line-2"
          }`}
        />
        <div className="mt-1 flex justify-end">
          <span aria-hidden className={`text-[12.5px] tabular-nums ${d.definition.trim().length > L.definition ? "text-priority-high" : "text-ink-3"}`}>
            {d.definition.trim().length} of {L.definition}
          </span>
        </div>
        <FieldMsg id={`${idBase}-definition-msg`} error={errors.definition} />
      </div>
      <div className="flex items-center gap-1.5 md:justify-end">
        <Button type="submit" size="sm" disabled={busy}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function VocabularyEditor({ initial, canEdit }: { initial: GlossaryTerm[]; canEdit: boolean }) {
  const [terms, setTerms] = useState<GlossaryTerm[]>(() => sortTerms(initial));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<GlossaryKind | null>(null);
  const [adding, setAdding] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [addDraft, setAddDraft] = useState<Draft>(EMPTY_DRAFT);
  const [addErrors, setAddErrors] = useState<FieldErrors<TermField>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<FieldErrors<TermField>>({});
  const [editDraft, setEditDraft] = useState<Draft | null>(null);
  const [importing, setImporting] = useState(false);
  const addBtn = useRef<HTMLButtonElement>(null);

  const counts = useMemo(() => kindCounts(terms), [terms]);
  const shown = useMemo(() => filterTerms(terms, query, kind), [terms, query, kind]);
  const full = terms.length >= L.maxTerms;

  const mark = (id: string, on: boolean) =>
    setPending((p) => {
      const n = new Set(p);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  /* ---- add, optimistic ---- */
  const add = async (d: Draft) => {
    const checked = validateTerm({ ...d, aliases: splitAliases(d.aliases) }, terms);
    if (!checked.ok) {
      setAddDraft(d);
      setAddErrors(checked.errors);
      setAddKey((k) => k + 1);
      return;
    }
    setAddErrors({});
    const tempId = `temp-${++tempSeq}`;
    const temp: GlossaryTerm = { id: tempId, ...checked.value, created_at: "", updated_at: "" };
    setTerms((t) => sortTerms([...t, temp]));
    mark(tempId, true);
    const res = await createTerm(checked.value);
    mark(tempId, false);
    if (res.ok) {
      setTerms((t) => sortTerms(t.map((x) => (x.id === tempId ? res.data : x))));
      notifySuccess("Term added", { description: res.data.term });
    } else {
      setTerms((t) => t.filter((x) => x.id !== tempId));
      setAdding(true);
      setAddDraft(d);
      setAddErrors(res.fieldErrors ?? {});
      setAddKey((k) => k + 1);
      notifyError(res.message);
    }
  };

  /* ---- edit, optimistic ---- */
  const startEdit = (t: GlossaryTerm) => {
    setEditing(t.id);
    setEditDraft(toDraft(t));
    setEditErrors({});
  };
  const save = async (before: GlossaryTerm, d: Draft) => {
    const checked = validateTerm({ ...d, aliases: splitAliases(d.aliases) }, terms, before.id);
    if (!checked.ok) {
      setEditDraft(d);
      setEditErrors(checked.errors);
      return;
    }
    setEditing(null);
    setTerms((t) => sortTerms(t.map((x) => (x.id === before.id ? { ...x, ...checked.value } : x))));
    mark(before.id, true);
    const res = await updateTerm(before.id, checked.value);
    mark(before.id, false);
    if (res.ok) {
      setTerms((t) => sortTerms(t.map((x) => (x.id === before.id ? res.data : x))));
      notifySuccess("Term saved", { description: res.data.term });
    } else if (res.gone) {
      setTerms((t) => t.filter((x) => x.id !== before.id));
      notifyError(res.message);
    } else {
      setTerms((t) => sortTerms(t.map((x) => (x.id === before.id ? before : x))));
      setEditing(before.id);
      setEditDraft(d);
      setEditErrors(res.fieldErrors ?? {});
      notifyError(res.message);
    }
  };

  /* ---- remove, optimistic ---- */
  // Undo after a remove adds the same term back (the server has no restore).
  const restore = async (t: GlossaryTerm) => {
    const res = await createTerm({ term: t.term, kind: t.kind, definition: t.definition, aliases: t.aliases });
    if (res.ok) {
      setTerms((list) => sortTerms([...list, res.data]));
      notifySuccess("Term restored", { description: res.data.term });
    } else notifyError(res.message);
  };

  const remove = async (t: GlossaryTerm) => {
    setTerms((list) => list.filter((x) => x.id !== t.id));
    const res = await deleteTerm(t.id);
    if (res.ok) notifySuccess("Term removed", { description: t.term, undo: () => void restore(t) });
    else {
      setTerms((list) => sortTerms([...list, t]));
      notifyError(res.message);
    }
  };

  const chip = (value: GlossaryKind | null, label: string, n: number) => {
    const on = kind === value;
    return (
      <button
        key={label}
        type="button"
        aria-pressed={on}
        onClick={() => setKind(on && value !== null ? null : value)}
        className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold transition-colors duration-150 ${
          on ? "border-signal bg-signal-soft text-signal-ink" : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
        }`}
      >
        {label}
        <span className={`tabular-nums ${on ? "opacity-80" : "text-ink-3"}`}>{n}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-ink-3">
            <span className="font-semibold tabular-nums text-ink">{terms.length}</span> of {L.maxTerms} terms.{" "}
            {terms.length < L.ready ? `${L.ready - terms.length} more and vocabulary counts toward readiness.` : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={importing}
              aria-controls="glossary-import"
              onClick={() => setImporting((v) => !v)}
              disabled={full}
             
            >
              <ClipboardText size={16} aria-hidden />
              Paste a list
            </Button>
            <Button
              ref={addBtn}
              type="button"
              size="sm"
              disabled={full || adding}
              onClick={() => {
                setAdding(true);
                setAddDraft(EMPTY_DRAFT);
                setAddErrors({});
                setAddKey((k) => k + 1);
              }}
            >
              <Plus size={16} weight="bold" aria-hidden />
              Add term
            </Button>
          </div>
        </div>
      ) : null}

      {canEdit && importing ? (
        <GlossaryImport
          existing={terms}
          onClose={() => setImporting(false)}
          onImported={(list, n) => {
            setTerms(sortTerms(list));
            setImporting(false);
            notifySuccess(n === 1 ? "Term imported" : `${n} terms imported`);
          }}
        />
      ) : null}

      <div className={cardClass({ flush: true })}>
        {/* search and kind filters */}
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:px-[22px] lg:flex-row lg:items-center">
          <div className="relative lg:w-[300px] lg:shrink-0">
            <MagnifyingGlass size={17} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <label htmlFor="glossary-search" className="sr-only">
              Search the vocabulary
            </label>
            <input
              id="glossary-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms, spellings, definitions"
              autoComplete="off"
              className={`${fieldClass} !h-10 !pl-10`}
            />
          </div>
          <div role="group" aria-label="Filter by kind" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            {chip(null, "All", terms.length)}
            {GLOSSARY_KINDS.filter((k) => counts[k] > 0 || kind === k).map((k) => chip(k, KIND_LABEL[k], counts[k]))}
          </div>
        </div>

        {/* column heads, for sighted readers; every row says the same in its own text */}
        {terms.length > 0 || adding ? (
          <div aria-hidden className={`hidden gap-x-4 border-b border-line bg-surface-2 px-[22px] py-2.5 text-[12.5px] font-semibold text-ink-3 md:grid ${COLS}`}>
            <span>Term</span>
            <span>Kind</span>
            <span>Definition</span>
            <span className="w-[88px]" />
          </div>
        ) : null}

        {adding ? (
          <div className="border-b border-line bg-surface-2 px-4 py-4 sm:px-[22px]">
            <p className="mb-3 text-[14px] font-semibold text-ink md:sr-only">New term</p>
            <TermForm
              key={addKey}
              idBase="add"
              initial={addDraft}
              errors={addErrors}
              busy={false}
              submitLabel="Add"
              autoFocus
              onSubmit={add}
              onCancel={() => {
                setAdding(false);
                setAddErrors({});
                addBtn.current?.focus();
              }}
            />
          </div>
        ) : null}

        {terms.length === 0 && !adding ? (
          <EmptyState
            inCard
            art="notes"
            title="No vocabulary yet"
            description={
              canEdit
                ? "Add the words your company uses that an outsider would not know: product names, codenames, acronyms, customers. Or paste a list you already have."
                : "When an admin adds the company's words, they appear here."
            }
          />
        ) : shown.length === 0 && terms.length > 0 ? (
          <div className="flex flex-col items-start gap-2 px-4 py-8 sm:px-[22px]">
            <p className="text-[15px] text-ink-2">Nothing matches{query.trim() ? ` "${query.trim()}"` : ""}{kind ? ` in ${KIND_LABEL[kind].toLowerCase()}s` : ""}.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setKind(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-ctl text-[14px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal"
            >
              <X size={14} aria-hidden />
              Clear the search
            </button>
          </div>
        ) : (
          <ul aria-label={`Vocabulary, ${shown.length} of ${terms.length} terms shown`} className="divide-y divide-line">
            {shown.map((t) => {
              const busy = pending.has(t.id);
              if (editing === t.id && editDraft)
                return (
                  <li key={t.id} className="bg-surface-2 px-4 py-4 sm:px-[22px]">
                    <p className="mb-3 text-[14px] font-semibold text-ink md:sr-only">Edit {t.term}</p>
                    <TermForm
                      idBase={`edit-${t.id}`}
                      initial={editDraft}
                      errors={editErrors}
                      busy={busy}
                      submitLabel="Save"
                      autoFocus
                      onSubmit={(d) => save(t, d)}
                      onCancel={() => {
                        setEditing(null);
                        setEditErrors({});
                      }}
                    />
                  </li>
                );
              return (
                <li
                  key={t.id}
                  aria-busy={busy || undefined}
                  className={`grid gap-x-4 gap-y-1.5 px-4 py-3.5 transition-opacity duration-150 sm:px-[22px] md:items-start ${COLS} ${busy ? "opacity-60" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-[15px] font-semibold text-ink">{t.term}</span>
                      <span className="md:hidden">
                        <KindChip kind={t.kind} />
                      </span>
                    </p>
                    {t.aliases.length ? (
                      <p className="mt-0.5 text-[14px] text-ink-3">
                        <span className="sr-only">Other spellings: </span>
                        <span aria-hidden>also </span>
                        {t.aliases.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="hidden md:block">
                    <KindChip kind={t.kind} />
                  </div>
                  <p className={`min-w-0 text-[14px] leading-relaxed ${t.definition ? "text-ink-2" : "text-ink-3"}`}>
                    {t.definition ?? "No definition"}
                  </p>
                  {canEdit ? (
                    <div className="-ml-2 flex items-center gap-0.5 md:ml-0 md:w-[88px] md:justify-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(t)}
                        aria-label={`Edit ${t.term}`}
                        title={`Edit ${t.term}`}
                        className="grid h-10 w-10 place-items-center rounded-ctl text-ink-3 transition-colors duration-150 hover:bg-bg-2 hover:text-ink disabled:opacity-50"
                      >
                        <PencilSimple size={17} aria-hidden />
                      </button>
                      <RemoveButton what={t.term} compact disabled={busy} onConfirm={() => remove(t)} />
                    </div>
                  ) : (
                    <span className="hidden md:block" />
                  )}
                </li>
              );
            })}
          </ul>
        )}

      </div>
    </div>
  );
}
