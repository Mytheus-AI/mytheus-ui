"use client";

import { useId, useState } from "react";
import { BookmarkSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CharCount, fieldClass } from "@/components/ui/Form";
import { addMemory, deleteMemory } from "@/app/actions/myte-v2";
import { notifyError, notifySuccess } from "@/lib/toast";
import { LIMITS, type Memory } from "@/lib/ask-myte/types";

/* What your Myte remembers (ADR-0049 F4): the durable preferences and facts you told it, which it
   reads before every answer. Myte proposes one when you state it in a conversation (you confirm);
   here you can add one yourself or delete any. Only you see them. `null` is "could not load". */

const MAX = 100;
const DAY = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

export function MyteMemoryCard({ initial, name }: { initial: Memory[] | null; name: string }) {
  const id = useId();
  const [items, setItems] = useState<Memory[] | null>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const clean = text.trim();
    if (!clean) return;
    setBusy(true);
    setError(null);
    const res = await addMemory(clean);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setItems((list) => [res.memory, ...(list ?? []).filter((m) => m.id !== res.memory.id)]);
    setText("");
    notifySuccess("Remembered");
  };

  const remove = async (m: Memory) => {
    setRemoving(m.id);
    const before = items;
    setItems((list) => (list ?? []).filter((x) => x.id !== m.id));
    const res = await deleteMemory(m.id);
    setRemoving(null);
    if (!res.ok) {
      setItems(before);
      notifyError(res.message);
      return;
    }
    notifySuccess("Forgotten", {
      undo: () => {
        void addMemory(m.text, m.source_thread_id ?? null).then((r) => r.ok && setItems((list) => [r.memory, ...(list ?? [])]));
      },
    });
  };

  return (
    <Card as="section" flush id="myte-memory" aria-labelledby={`${id}-h`} className="scroll-mt-4">
      <CardHead
        id={`${id}-h`}
        title={`What ${name} remembers`}
        description="Things you asked it to keep in mind. It reads them before every answer, and only you see them."
        right={items && items.length ? <span className="text-[13px] tabular-nums text-ink-3">{items.length} of {MAX}</span> : null}
      />
      {items === null ? (
        <ErrorState variant="inline" title="What it remembers couldn't be loaded" text="Nothing was lost. Try again in a moment." />
      ) : (
        <CardBody className="pt-0">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <div className="min-w-0 flex-1">
              <label htmlFor={`${id}-in`} className="sr-only">
                Something for {name} to remember
              </label>
              <input
                id={`${id}-in`}
                value={text}
                maxLength={LIMITS.memoryText}
                onChange={(e) => setText(e.target.value)}
                placeholder="I prefer answers as short bullet lists"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-err` : undefined}
                className={fieldClass}
              />
              {text.length > 240 ? <CharCount n={text.length} max={LIMITS.memoryText} className="mt-1" /> : null}
            </div>
            <Button type="submit" disabled={busy || !text.trim() || items.length >= MAX}>
              {busy ? "Saving" : "Remember"}
            </Button>
          </form>
          {error ? (
            <p id={`${id}-err`} className="mt-2 text-[14px] text-priority-high" role="alert">
              {error}
            </p>
          ) : null}
          {items.length === 0 ? (
            <EmptyState inCard compact art="notes" title="Nothing yet" description={`Tell ${name} something in Ask Myte ("I work Tuesday to Saturday") and it offers to remember it.`} />
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-ctl border border-line">
              {items.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-3.5 py-3">
                  <BookmarkSimple size={16} aria-hidden className="mt-1 shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug text-ink">{m.text}</p>
                    {m.created_at ? <p className="mt-0.5 text-[12.5px] text-ink-3">Since {DAY.format(new Date(m.created_at))}</p> : null}
                  </div>
                  <Button size="sm" variant="ghost" icon onClick={() => void remove(m)} disabled={removing === m.id} aria-label={`Forget: ${m.text}`}>
                    <Trash size={16} aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      )}
    </Card>
  );
}
