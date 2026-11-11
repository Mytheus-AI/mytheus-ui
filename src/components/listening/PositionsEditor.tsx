"use client";

import { useId, useState } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Card";
import { CharCount, FieldMsg, TextArea, TextInput } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { notifyError, notifySuccess } from "@/lib/toast";
import { deletePosition, savePosition } from "@/app/actions/listening";
import type { StandingPosition } from "@/lib/api/listening-types";
import { MAX_POSITION, MAX_POSITIONS } from "@/lib/listening";

/* Your lines: positions you are happy for your agent to state for you when you ask it to hold the
   line in a live meeting ("No discount above 10% for SMB without finance"). Your agent never says
   anything that is not here. A topic helps it pick the right lines for an interruption. Removing
   a line offers Undo (it is saved again). */

type Edit = { id: string | null; topic: string; text: string };

export function PositionsEditor({ initial, loaded }: { initial: StandingPosition[]; loaded: boolean }) {
  const uid = useId();
  const [items, setItems] = useState(initial);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!edit) return;
    const text = edit.text.trim();
    if (!text) return setError("Write the line your agent may hold.");
    if (text.length > MAX_POSITION) return setError(`Keep a line under ${MAX_POSITION} characters.`);
    setBusy(true);
    const res = await savePosition(edit.id, { topic: edit.topic, text });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setItems((list) => (edit.id ? list.map((p) => (p.id === edit.id ? res.data : p)) : [...list, res.data]));
    setEdit(null);
    notifySuccess(edit.id ? "Line saved" : "Line added");
  };

  const remove = async (p: StandingPosition) => {
    const before = items;
    setItems((list) => list.filter((x) => x.id !== p.id));
    const res = await deletePosition(p.id);
    if (!res.ok) {
      setItems(before);
      return notifyError(res.message);
    }
    notifySuccess("Line removed", {
      undo: async () => {
        const back = await savePosition(null, { topic: p.topic ?? null, text: p.text });
        if (!back.ok) return notifyError(back.message);
        setItems((list) => [...list, back.data]);
      },
    });
  };

  const full = items.length >= MAX_POSITIONS;

  return (
    <SectionCard
      title="Your lines"
      headingId="lines"
      headingLevel={3}
      description="Positions your agent may state for you when you let it hold the line in a meeting. It says nothing that is not here."
      aside={
        <Button
          size="sm"
          variant="outline"
          disabled={full || edit?.id === null}
          onClick={() => {
            setError(null);
            setEdit({ id: null, topic: "", text: "" });
          }}
        >
          <Plus size={15} weight="bold" aria-hidden />
          Add a line
        </Button>
      }
    >
      {loaded ? null : (
        <div className="px-4 py-4 sm:px-[22px]">
          <Note tone="warning">Your lines did not load. Reload the page to try again.</Note>
        </div>
      )}
      {loaded && items.length === 0 && !edit ? (
        <p className="px-4 py-5 text-[14px] leading-relaxed text-ink-3 sm:px-[22px]">
          No lines yet. Add the positions you hold on topics you care about, for example &ldquo;Pricing: no discount above 10% for SMB without
          finance&rdquo;.
        </p>
      ) : null}
      <ul className="divide-y divide-line">
        {items.map((p) =>
          edit?.id === p.id ? (
            <li key={p.id}>
              <LineForm uid={uid} edit={edit} setEdit={setEdit} error={error} setError={setError} busy={busy} onSubmit={submit} />
            </li>
          ) : (
            <li key={p.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-[22px]">
              <div className="min-w-0 flex-1">
                {p.topic ? <p className="text-[12.5px] font-semibold text-ink-3">{p.topic}</p> : null}
                <p className="text-[15px] leading-snug text-ink">{p.text}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon
                  aria-label={`Edit line: ${p.text}`}
                  onClick={() => {
                    setError(null);
                    setEdit({ id: p.id, topic: p.topic ?? "", text: p.text });
                  }}
                >
                  <PencilSimple size={15} aria-hidden />
                </Button>
                <Button variant="ghost" size="sm" icon aria-label={`Remove line: ${p.text}`} onClick={() => void remove(p)}>
                  <Trash size={15} aria-hidden />
                </Button>
              </div>
            </li>
          ),
        )}
        {edit && edit.id === null ? (
          <li>
            <LineForm uid={uid} edit={edit} setEdit={setEdit} error={error} setError={setError} busy={busy} onSubmit={submit} />
          </li>
        ) : null}
      </ul>
      {full ? <p className="px-4 py-3 text-[13.5px] text-ink-3 sm:px-[22px]">You have {MAX_POSITIONS} lines, the most you can keep. Remove one to add another.</p> : null}
    </SectionCard>
  );
}

function LineForm({
  uid,
  edit,
  setEdit,
  error,
  setError,
  busy,
  onSubmit,
}: {
  uid: string;
  edit: Edit;
  setEdit: (e: Edit | null) => void;
  error: string | null;
  setError: (e: string | null) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  const n = edit.text.trim().length;
  return (
    <div className="space-y-3 bg-surface-2 px-4 py-4 sm:px-[22px]">
      <label htmlFor={`${uid}-topic`} className="grid gap-1.5 text-[14px] font-semibold text-ink-2">
        Topic
        <TextInput
          id={`${uid}-topic`}
          value={edit.topic}
          maxLength={80}
          placeholder="Pricing"
          onChange={(e) => {
            setError(null);
            setEdit({ ...edit, topic: e.target.value });
          }}
        />
      </label>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${uid}-text`} className="text-[14px] font-semibold text-ink-2">
            The line
          </label>
          <CharCount n={n} max={MAX_POSITION} />
        </div>
        <TextArea
          id={`${uid}-text`}
          rows={3}
          className="mt-1.5"
          value={edit.text}
          maxLength={MAX_POSITION + 40}
          placeholder="No discount above 10% for SMB without finance."
          aria-invalid={error ? true : undefined}
          aria-describedby={`${uid}-msg`}
          onChange={(e) => {
            setError(null);
            setEdit({ ...edit, text: e.target.value });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit();
          }}
        />
        <FieldMsg id={`${uid}-msg`} error={error} hint="Write it the way you would say it. Your agent states it as yours." />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEdit(null)} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSubmit} disabled={busy || n === 0} aria-busy={busy || undefined}>
          {busy ? "Saving" : "Save line"}
        </Button>
      </div>
    </div>
  );
}
