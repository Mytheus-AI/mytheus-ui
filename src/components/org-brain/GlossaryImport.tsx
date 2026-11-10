"use client";

import { useMemo, useState } from "react";
import { WarningCircle, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { textareaClass } from "@/components/settings/primitives";
import { importTerms } from "@/app/actions/org-brain";
import {
  BRAIN_LIMITS,
  GLOSSARY_KINDS,
  KIND_LABEL,
  parseGlossaryImport,
  splitNewAndExisting,
  type GlossaryKind,
  type GlossaryTerm,
} from "@/lib/api/org-brain-types";
import { FlashLine, useFlash } from "./ui";

/* "Paste a list" (ADR-0039 A2 import): one term per line, "term: definition" understood, with a
   live preview of what will be added, what will update an existing term (the import upserts by
   term) and which lines cannot be used and why. Paste on the left, the preview on the right. */

const L = BRAIN_LIMITS.glossary;
const KIND_OPTIONS = GLOSSARY_KINDS.map((k) => ({ value: k, label: `Default: ${KIND_LABEL[k].toLowerCase()}` }));

export function GlossaryImport({
  existing,
  onImported,
  onClose,
}: {
  existing: GlossaryTerm[];
  onImported: (list: GlossaryTerm[], count: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [defaultKind, setDefaultKind] = useState<GlossaryKind>("other");
  const [acronyms, setAcronyms] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();

  const parsed = useMemo(() => {
    const p = parseGlossaryImport(text, { defaultKind, detectAcronyms: acronyms });
    // A term already in the vocabulary keeps its kind: the import updates its definition and
    // spellings, and changing a kind is done in the table, deliberately.
    const kindOf = new Map(existing.map((t) => [t.term.toLowerCase(), t.kind] as const));
    return { ...p, rows: p.rows.map((r) => ({ ...r, kind: kindOf.get(r.term.toLowerCase()) ?? r.kind })) };
  }, [text, defaultKind, acronyms, existing]);
  const { added, updated } = useMemo(() => splitNewAndExisting(parsed.rows, existing), [parsed.rows, existing]);
  const roomLeft = L.maxTerms - existing.length;
  const overCap = added.length > roomLeft;
  const count = parsed.rows.length;

  const run = async () => {
    if (!count || overCap || busy) return;
    setBusy(true);
    setFlash({ tone: "busy", text: `Importing ${count} ${count === 1 ? "term" : "terms"}` });
    const res = await importTerms(parsed.rows.map(({ term, kind, definition, aliases }) => ({ term, kind, definition, aliases })));
    setBusy(false);
    if (res.ok) {
      setText("");
      onImported(res.data, count);
    } else setFlash({ tone: "error", text: res.message });
  };

  return (
    <section
      id="glossary-import"
      aria-labelledby="glossary-import-h"
      className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1"
    >
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-[18px] sm:px-[22px]">
        <div>
          <h3 id="glossary-import-h" className="text-[17px] font-semibold text-ink">
            Paste a list
          </h3>
          <p className="mt-1 max-w-[64ch] text-[14px] leading-relaxed text-ink-3">
            One term per line. Write <span className="font-semibold text-ink-2">term: definition</span> to add a definition, and put other
            spellings in brackets: <span className="text-ink-2">Nimbus (NMB): our invoicing product</span>. A term already in the
            vocabulary is updated, not repeated.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close paste a list"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink focus-visible:!rounded-ctl"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="grid gap-px border-t border-line bg-line lg:grid-cols-2">
        <div className="flex flex-col gap-3 bg-surface px-4 py-4 sm:px-[22px]">
          <label htmlFor="glossary-paste" className="text-[14px] font-semibold text-ink">
            Your list
          </label>
          <textarea
            id="glossary-paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={11}
            spellCheck={false}
            placeholder={"Nimbus: our invoicing product\nARR: annual recurring revenue\nAcme Accounting (Acme): our largest customer\nProject Halo"}
            className={`${textareaClass} !resize-y font-mono !text-[14px]`}
            aria-describedby="glossary-paste-help"
          />
          <p id="glossary-paste-help" className="text-[13px] text-ink-3">
            Up to {L.importMax} terms at a time. Bullets and numbering are ignored.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="w-[220px]">
              <Select value={defaultKind} onChange={setDefaultKind} options={KIND_OPTIONS} label="Kind for terms without one" size="sm" />
            </div>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2.5 text-[14px] text-ink-2">
              <input
                type="checkbox"
                checked={acronyms}
                onChange={(e) => setAcronyms(e.target.checked)}
                className="h-[18px] w-[18px] cursor-pointer rounded-[5px] accent-[var(--signal)]"
              />
              Mark short capitalised terms, like ARR, as acronyms
            </label>
          </div>
        </div>

        <div className="flex min-h-[240px] flex-col bg-surface-2 px-4 py-4 sm:px-[22px]">
          <p className="text-[14px] font-semibold text-ink" aria-live="polite">
            {count === 0 && parsed.problems.length === 0
              ? "The preview appears here as you paste."
              : [
                  added.length ? `${added.length} new` : null,
                  updated.length ? `${updated.length} to update` : null,
                  parsed.problems.length ? `${parsed.problems.length} cannot be used` : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
          </p>
          {parsed.repeated || parsed.overLimit ? (
            <p className="mt-1 text-[13px] text-ink-3">
              {parsed.repeated ? `${parsed.repeated} repeated ${parsed.repeated === 1 ? "line" : "lines"} skipped. ` : ""}
              {parsed.overLimit ? `${parsed.overLimit} past the limit of ${L.importMax} left out.` : ""}
            </p>
          ) : null}

          {count > 0 ? (
            <ul className="mt-3 max-h-[280px] divide-y divide-line overflow-y-auto rounded-ctl border border-line bg-surface" aria-label="Terms to import">
              {parsed.rows.map((r) => {
                const isUpdate = updated.includes(r);
                return (
                  <li key={r.line} className="flex items-start gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-ink">
                        {r.term}
                        {r.aliases.length ? <span className="font-normal text-ink-3"> also {r.aliases.join(", ")}</span> : null}
                      </span>
                      <span className={`block truncate text-[13.5px] ${r.definition ? "text-ink-3" : "text-ink-4"}`}>
                        {r.definition ?? "No definition"}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-bg-2 px-2 py-[2px] text-[12.5px] font-semibold text-ink-2">{KIND_LABEL[r.kind]}</span>
                    {isUpdate ? (
                      <span className="shrink-0 rounded-full bg-priority-low-soft px-2 py-[2px] text-[12.5px] font-semibold text-priority-low">Update</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {parsed.problems.length ? (
            <ul className="mt-3 space-y-1.5" aria-label="Lines that cannot be used">
              {parsed.problems.slice(0, 6).map((p) => (
                <li key={p.line} className="flex items-start gap-2 text-[13.5px] text-priority-medium">
                  <WarningCircle size={15} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    Line {p.line}: {p.reason} <span className="text-ink-3">{p.text.slice(0, 48)}</span>
                  </span>
                </li>
              ))}
              {parsed.problems.length > 6 ? <li className="text-[13px] text-ink-3">And {parsed.problems.length - 6} more.</li> : null}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
        <Button type="button" onClick={run} disabled={!count || overCap || busy} aria-busy={busy || undefined} className="focus-visible:!rounded-ctl">
          {busy ? "Importing" : count ? `Import ${count} ${count === 1 ? "term" : "terms"}` : "Import"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="focus-visible:!rounded-ctl">
          Cancel
        </Button>
        <FlashLine
          flash={
            flash ??
            (overCap ? { tone: "error", text: `That is ${added.length} new terms, and there is room for ${roomLeft} (the limit is ${L.maxTerms}).` } : null)
          }
        />
      </div>
    </section>
  );
}
