"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { addPromise, handOffPromise, renegotiateDate } from "@/app/actions/promises";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CharCount, FieldMsg, fieldClass, textareaClass } from "@/components/ui/Form";
import { MemberPicker, type MemberOption } from "@/components/ui/MemberPicker";
import { LEDGER_LIMITS, addDays, dayWord, shortDay, type CapacityCheck, type LedgerPromise, type RenegotiateResult } from "@/lib/promises/ledger";
import { CapacityNote, useCapacityCheck } from "./CapacityNote";

/* The ledger's three forms, each a `Dialog` (focus in, Tab kept inside, Escape and the scrim close,
   focus back to the opener): add a promise by hand, renegotiate a date, hand a promise off. Each
   validates in place, answers the server's refusal under the field it concerns, and lets the
   capacity check speak while a date is picked. The caller shows the result toast (with Undo). */

const labelClass = "mb-1.5 block text-[14px] font-semibold text-ink";

/* ---------------- add a promise ---------------- */

export function AddPromiseDialog({
  open,
  onClose,
  onAdded,
  members,
  tz,
  today,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (promise: LedgerPromise, capacity: CapacityCheck | null) => void;
  members: readonly MemberOption[] | null;
  tz: string | null;
  today: string;
}) {
  const uid = useId();
  const [content, setContent] = useState("");
  const [due, setDue] = useState("");
  const [recipient, setRecipient] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { check, checking } = useCapacityCheck(due, tz);

  useEffect(() => {
    if (!open) return;
    setContent("");
    setDue("");
    setRecipient(null);
    setLabel("");
    setLink("");
    setShowLink(false);
    setError(null);
  }, [open]);

  const others = members?.filter((m) => !m.isYou) ?? null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Say what you promised.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await addPromise(
      { content, dueAt: due || null, recipientUserId: recipient, recipientLabel: recipient ? null : label, sourceLink: link || null },
      tz,
    );
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onAdded(res.promise, res.capacity);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={saving}
      title="Add a promise"
      description="Something you said you would do, anywhere: a call, a hallway, a message. Only you see it."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor={`${uid}-content`} className={labelClass}>
            What you promised
          </label>
          <textarea
            id={`${uid}-content`}
            rows={2}
            maxLength={LEDGER_LIMITS.content}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Send Priya the revised pricing deck"
            aria-invalid={Boolean(error && !content.trim())}
            aria-describedby={`${uid}-err`}
            className={textareaClass}
          />
          <div className="mt-1 flex justify-end">
            <CharCount n={content.length} max={LEDGER_LIMITS.content} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-due`} className={labelClass}>
              Due
            </label>
            <input id={`${uid}-due`} type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <span id={`${uid}-to`} className={labelClass}>
              Promised to
            </span>
            {others && others.length ? (
              <MemberPicker
                members={others}
                value={recipient}
                onChange={setRecipient}
                label="Promised to"
                allowNone
                noneLabel="Someone outside the workspace"
                placeholder="Pick a colleague"
              />
            ) : null}
          </div>
        </div>
        {!recipient ? (
          <div>
            <label htmlFor={`${uid}-label`} className={labelClass}>
              {others && others.length ? "Or name them" : "Who it was promised to"}
            </label>
            <input
              id={`${uid}-label`}
              maxLength={LEDGER_LIMITS.recipient}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Acme, the design team"
              className={fieldClass}
            />
          </div>
        ) : null}
        {showLink ? (
          <div>
            <label htmlFor={`${uid}-link`} className={labelClass}>
              Link to where you promised it
            </label>
            <input id={`${uid}-link`} type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={fieldClass} />
          </div>
        ) : (
          <button type="button" onClick={() => setShowLink(true)} className="text-[14px] font-semibold text-ink-2 underline-offset-4 hover:underline">
            Add a link to the message
          </button>
        )}
        <CapacityNote check={check} checking={checking} onUseSuggested={setDue} />
        <FieldMsg id={`${uid}-err`} error={error} />
        <div className="flex flex-wrap justify-end gap-2.5 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Adding..." : "Add promise"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- renegotiate a date ---------------- */

export type RenegotiateTarget = {
  kind: "commitment" | "action";
  id: string;
  content: string;
  due: string | null;
  /** who will be asked, when known; null: nobody else asked for it (or unknown, for an action) */
  askName: string | null;
  /** the date to start from (a notification's suggestion) */
  suggested?: string | null;
};

export function RenegotiateDialog({
  target,
  onClose,
  onDone,
  tz,
  today,
}: {
  target: RenegotiateTarget | null;
  onClose: () => void;
  onDone: (result: RenegotiateResult, target: RenegotiateTarget) => void;
  tz: string | null;
  today: string;
}) {
  const uid = useId();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exclude = target ? { kind: target.kind, id: target.id } : undefined;
  const { check, checking } = useCapacityCheck(date, tz, exclude);

  useEffect(() => {
    if (!target) return;
    setDate(target.suggested ?? (target.due && target.due >= today ? addDays(target.due, 1) : addDays(today, 1)));
    setNote("");
    setError(null);
  }, [target, today]);

  if (!target) return null;
  const asks = target.kind === "commitment" ? Boolean(target.askName) : true;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("Pick the new date.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await renegotiateDate({ target: target.kind, targetId: target.id, proposedDue: date, note: asks ? note : null });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onDone(res.result, target);
  };

  const word = date ? dayWord(date, today) : "";
  return (
    <Dialog
      open
      onClose={onClose}
      busy={saving}
      title="Renegotiate the date"
      description={
        <>
          <span className="font-semibold text-ink-2">{target.content}</span>
          {target.due ? <> is due {shortDay(target.due)}.</> : <> has no date yet.</>}
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor={`${uid}-date`} className={labelClass}>
            New date
          </label>
          <input
            id={`${uid}-date`}
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={`${uid}-err ${uid}-how`}
            className={fieldClass}
          />
        </div>
        <CapacityNote check={check} checking={checking} onUseSuggested={setDate} />
        {asks ? (
          <div>
            <label htmlFor={`${uid}-note`} className={labelClass}>
              A note {target.askName ? `for ${target.askName}` : ""} <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <textarea
              id={`${uid}-note`}
              rows={2}
              maxLength={LEDGER_LIMITS.note}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Legal needs one more day with the contract."
              className={textareaClass}
            />
          </div>
        ) : null}
        <p id={`${uid}-how`} className="text-[13.5px] leading-relaxed text-ink-3">
          {target.kind === "commitment"
            ? target.askName
              ? `${target.askName} gets your request and accepts or declines it. The date changes only if they accept.`
              : "Nobody in the workspace asked for this, so the new date applies now. Tell them yourself if someone outside is waiting."
            : "If someone assigned this to you, they get your request and decide. If it is your own task, the date moves now."}
        </p>
        <FieldMsg id={`${uid}-err`} error={error} />
        <div className="flex flex-wrap justify-end gap-2.5 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !date}>
            {saving ? "Sending..." : asks && target.askName ? `Offer ${word}` : `Move to ${word || "that day"}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- hand off ---------------- */

export function HandOffDialog({
  promise,
  members,
  onClose,
  onDone,
}: {
  promise: LedgerPromise | null;
  members: readonly MemberOption[] | null;
  onClose: () => void;
  onDone: (promise: LedgerPromise, name: string | null) => void;
}) {
  const uid = useId();
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!promise) return;
    setTo(null);
    setNote("");
    setError(null);
  }, [promise]);

  if (!promise) return null;
  const others = members?.filter((m) => !m.isYou) ?? [];
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!to) {
      setError("Pick who takes it over.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await handOffPromise(promise.id, to, note || null);
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onDone(res.promise, res.name);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      busy={saving}
      title="Hand off this promise"
      description={
        <>
          <span className="font-semibold text-ink-2">{promise.content}</span>. They get it to confirm or dismiss; it leaves your list once you send it.
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {others.length ? (
          <div>
            <span className={labelClass}>Who takes it over</span>
            <MemberPicker members={others} value={to} onChange={setTo} label="Who takes it over" invalid={Boolean(error && !to)} />
          </div>
        ) : (
          <p className="text-[14px] text-ink-3">There is nobody else in this workspace yet to hand it to.</p>
        )}
        <div>
          <label htmlFor={`${uid}-note`} className={labelClass}>
            A note <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <textarea
            id={`${uid}-note`}
            rows={2}
            maxLength={LEDGER_LIMITS.note}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="You know the customer best."
            className={textareaClass}
          />
        </div>
        <FieldMsg id={`${uid}-err`} error={error} />
        <div className="flex flex-wrap justify-end gap-2.5 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !others.length}>
            {saving ? "Handing off..." : "Hand off"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
