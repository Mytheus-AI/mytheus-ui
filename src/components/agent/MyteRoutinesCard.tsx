"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { PencilSimple, Plus, Repeat, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { deleteRoutine, updateRoutine } from "@/app/actions/myte-v2";
import { notifyError, notifySuccess } from "@/lib/toast";
import { MAX_ROUTINES, cadenceWords } from "@/lib/ask-myte/routines";
import type { Routine } from "@/lib/ask-myte/types";
import { RoutineDialog } from "@/components/ask-myte/RoutineDialog";

/* Routines (ADR-0049 F5): questions your Myte asks for you on a schedule ("Every Monday at
   09:00: what changed in pricing?"). Each run happens the next time you open Mytheus after it is
   due and lands in a new conversation. Pause, resume, change or delete each one, or add one. */

const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function MyteRoutinesCard({ initial, name }: { initial: Routine[] | null; name: string }) {
  const id = useId();
  const [items, setItems] = useState<Routine[] | null>(initial);
  const [dialog, setDialog] = useState<{ open: boolean; editing: Routine | null }>({ open: false, editing: null });
  const [busy, setBusy] = useState<string | null>(null);

  const saved = (r: Routine) => setItems((list) => (list ?? []).some((x) => x.id === r.id) ? (list ?? []).map((x) => (x.id === r.id ? r : x)) : [...(list ?? []), r]);

  const toggle = async (r: Routine) => {
    setBusy(r.id);
    const res = await updateRoutine(r.id, { enabled: !r.enabled });
    setBusy(null);
    if (!res.ok) return notifyError(res.message);
    saved(res.routine);
    notifySuccess(res.routine.enabled ? "Routine resumed" : "Routine paused");
  };

  const remove = async (r: Routine) => {
    setBusy(r.id);
    const res = await deleteRoutine(r.id);
    setBusy(null);
    if (!res.ok) return notifyError(res.message);
    setItems((list) => (list ?? []).filter((x) => x.id !== r.id));
    notifySuccess("Routine deleted");
  };

  const full = (items?.length ?? 0) >= MAX_ROUTINES;

  return (
    <Card as="section" flush id="myte-routines" aria-labelledby={`${id}-h`} className="scroll-mt-4">
      <CardHead
        id={`${id}-h`}
        title="Routines"
        description={`Questions ${name} asks for you on a schedule. Each answer waits for you the next time you open Mytheus.`}
        right={
          items ? (
            <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, editing: null })} disabled={full} title={full ? `Up to ${MAX_ROUTINES} routines` : undefined}>
              <Plus size={15} aria-hidden />
              Add routine
            </Button>
          ) : null
        }
      />
      {items === null ? (
        <ErrorState variant="inline" title="Your routines couldn't be loaded" text="They are safe and still run. Try again in a moment." />
      ) : items.length === 0 ? (
        <EmptyState
          inCard
          compact
          art="line"
          title="No routines yet"
          description={`"Every Monday at 9, tell me what changed in pricing." Add one here, or press Make this a routine under any answer.`}
        />
      ) : (
        <CardBody className="pt-0">
          <ul className="divide-y divide-line rounded-ctl border border-line">
            {items.map((r) => (
              <li key={r.id} className="px-3.5 py-3">
                <div className="flex items-start gap-3">
                  <Repeat size={16} aria-hidden className={`mt-1 shrink-0 ${r.enabled ? "text-signal" : "text-ink-4"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[15px] leading-snug ${r.enabled ? "text-ink" : "text-ink-3"}`}>{r.question}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
                      <span className="font-semibold text-ink-2">{cadenceWords(r)}</span>
                      {r.enabled ? (
                        r.next_run_at ? <span>next {WHEN.format(new Date(r.next_run_at))}</span> : null
                      ) : (
                        <Chip>Paused</Chip>
                      )}
                      {r.last_thread_id ? (
                        <Link href={`/ask?t=${r.last_thread_id}`} className="font-semibold text-signal-ink underline-offset-4 hover:underline">
                          Last answer
                        </Link>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 pl-7">
                  <Button size="sm" variant="ghost" onClick={() => void toggle(r)} disabled={busy === r.id} aria-label={`${r.enabled ? "Pause" : "Resume"}: ${r.question}`}>
                    {r.enabled ? "Pause" : "Resume"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ open: true, editing: r })} disabled={busy === r.id} aria-label={`Change: ${r.question}`}>
                    <PencilSimple size={15} aria-hidden />
                    Change
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(r)} disabled={busy === r.id} aria-label={`Delete: ${r.question}`}>
                    <Trash size={15} aria-hidden />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      )}
      <RoutineDialog open={dialog.open} editing={dialog.editing} myteName={name} onClose={() => setDialog({ open: false, editing: null })} onSaved={saved} />
    </Card>
  );
}
