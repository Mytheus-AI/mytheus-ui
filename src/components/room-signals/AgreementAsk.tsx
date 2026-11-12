"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckCircle, LockSimple, NotePencil, Prohibit, ThumbsUp, WarningCircle } from "@phosphor-icons/react";
import { answerAgreementCheck } from "@/app/actions/room-signals";
import { markAlertRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CharCount, FieldMsg, textareaClass } from "@/components/ui/Form";
import type { AgreementAnswer, AgreementCheck } from "@/lib/api/room-signals-types";
import { AGREEMENT_NOTE_MAX, ANSWERS, ANSWER_COPY } from "@/lib/room-signals";
import { notifyError, notifySuccess } from "@/lib/toast";

/* Where do you really stand? (the agreement check). You hedged, stayed quiet or were talked over
   when a decision was made, so you are asked privately: one tap on Support, Have concerns or
   Object sends it. A note is optional, and your answer is anonymous unless you turn on Add my name:
   the decision owner sees totals ("3 of 5 actually support this") and only the notes people put
   their name to. You can change your answer later.

   Keyboard: the three answers are a radio group (one tab stop, the arrows move between them,
   Space or Enter sends the one in focus). */

const ICON = { support: ThumbsUp, concerns: WarningCircle, object: Prohibit } as const;
const TONE = { support: "ok", concerns: "medium", object: "high" } as const;

export function AgreementAsk({
  check: initial,
  checkId,
  notificationId,
  decisionLabel,
}: {
  /** null when the check could not be read: the answers still work */
  check: AgreementCheck | null;
  checkId: string;
  notificationId?: string;
  /** the decision, for screen readers */
  decisionLabel?: string;
}) {
  const uid = useId();
  const [check, setCheck] = useState<AgreementCheck | null>(initial);
  const answered = check?.status === "answered" && !!check.answer;
  const [choosing, setChoosing] = useState(!answered);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(check?.note ?? "");
  const [shareName, setShareName] = useState(check?.share_name ?? false);
  const [focus, setFocus] = useState<AgreementAnswer>(check?.answer ?? "support");
  const [busy, setBusy] = useState<AgreementAnswer | "note" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const radios = useRef<Record<AgreementAnswer, HTMLButtonElement | null>>({ support: null, concerns: null, object: null });
  const changeButton = useRef<HTMLButtonElement>(null);

  const send = async (answer: AgreementAnswer, from: AgreementAnswer | "note") => {
    if (note.trim().length > AGREEMENT_NOTE_MAX) {
      setError(`Keep the note to ${AGREEMENT_NOTE_MAX} characters.`);
      setNoteOpen(true);
      return;
    }
    setBusy(from);
    setError(null);
    const res = await answerAgreementCheck(checkId, answer, { note, shareName });
    setBusy(null);
    if (res.ok) {
      setCheck(res.check);
      setChoosing(false);
      setNoteOpen(false);
      if (notificationId) void markAlertRead(notificationId);
      notifySuccess(from === "note" ? "Note saved" : "Answer sent", {
        description: res.check.share_name ? "Sent with your name." : "Sent anonymously. The owner sees totals only.",
      });
      window.requestAnimationFrame(() => changeButton.current?.focus());
      return;
    }
    if (res.gone) {
      setGone(true);
      return;
    }
    if ("field" in res && res.field === "note") setError(res.message);
    else notifyError(res.message, { retry: () => void send(answer, from) });
  };

  const onRadioKey = (e: KeyboardEvent<HTMLButtonElement>, current: AgreementAnswer) => {
    const i = ANSWERS.indexOf(current);
    let next: AgreementAnswer | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = ANSWERS[(i + 1) % ANSWERS.length];
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = ANSWERS[(i - 1 + ANSWERS.length) % ANSWERS.length];
    if (e.key === "Home") next = ANSWERS[0];
    if (e.key === "End") next = ANSWERS[ANSWERS.length - 1];
    if (next) {
      e.preventDefault();
      setFocus(next);
      radios.current[next]?.focus();
    }
  };

  if (gone) {
    return (
      <p className="mt-3 text-[14px] text-ink-3" role="status">
        This question is no longer here. The decision may have been removed.
      </p>
    );
  }

  const noteId = `${uid}-note`;
  const noteMsg = `${uid}-note-msg`;
  const privacy = (
    <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug text-ink-3">
      <LockSimple size={14} className="mt-px shrink-0" aria-hidden />
      {shareName
        ? "Your note goes to the decision's owner with your name. Your answer is still only counted in the totals."
        : "Anonymous by default: the owner sees totals, never who answered what."}
    </p>
  );

  const noteFields = (
    <div className="mt-3 max-w-[640px]">
      <label htmlFor={noteId} className="block text-[14px] font-semibold text-ink">
        A note for the owner (optional)
      </label>
      <textarea
        id={noteId}
        value={note}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        aria-describedby={noteMsg}
        aria-invalid={error ? true : undefined}
        placeholder="What would make this work for you, or what worries you"
        className={`${textareaClass} mt-1.5 w-full`}
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        <FieldMsg id={noteMsg} error={error} />
        <CharCount n={note.trim().length} max={AGREEMENT_NOTE_MAX} />
      </div>
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2.5 text-[14px] font-medium text-ink">
        <span className="relative inline-flex">
          <input
            type="checkbox"
            role="switch"
            checked={shareName}
            onChange={(e) => setShareName(e.target.checked)}
            aria-checked={shareName}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="h-6 w-10 rounded-full border border-line-2 bg-bg-3 transition-colors duration-150 peer-checked:border-pill peer-checked:bg-pill peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--signal)]"
          />
          <span
            aria-hidden
            className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-surface shadow-warm-1 transition-transform duration-150 motion-reduce:transition-none peer-checked:translate-x-4"
          />
        </span>
        Add my name
      </label>
    </div>
  );

  if (!choosing && check?.answer) {
    const a = check.answer;
    const Icon = ICON[a];
    return (
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2" role="status">
          <span className="text-[14px] text-ink-3">You answered</span>
          <Chip tone={TONE[a]} icon={<Icon size={14} weight="fill" />}>
            {ANSWER_COPY[a].label}
          </Chip>
          <Chip icon={<LockSimple size={13} />}>{check.share_name ? "With your name" : "Anonymous"}</Chip>
        </div>
        {check.note ? <p className="mt-2 max-w-[75ch] font-display text-[15px]  leading-snug text-ink-2">&ldquo;{check.note}&rdquo;</p> : null}
        {noteOpen ? (
          <>
            {noteFields}
            {privacy}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void send(a, "note")} disabled={busy !== null} aria-busy={busy === "note" || undefined}>
                {busy === "note" ? "Saving" : "Save note"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)} disabled={busy !== null}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button ref={changeButton} size="sm" variant="outline" onClick={() => setChoosing(true)}>
              Change
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNoteOpen(true)}>
              <NotePencil size={15} aria-hidden />
              {check.note ? "Edit note" : "Add a note"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  const groupLabel = decisionLabel ? `Where you stand on: ${decisionLabel}` : "Where you stand";
  return (
    <div className="mt-3">
      <div role="radiogroup" aria-label={groupLabel} className="flex flex-wrap gap-2">
        {ANSWERS.map((a) => {
          const Icon = ICON[a];
          const checked = check?.answer === a;
          return (
            <button
              key={a}
              ref={(el) => {
                radios.current[a] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={focus === a ? 0 : -1}
              disabled={busy !== null && busy !== a}
              onKeyDown={(e) => onRadioKey(e, a)}
              onFocus={() => setFocus(a)}
              onClick={() => void send(a, a)}
              aria-busy={busy === a || undefined}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition-colors duration-150 disabled:opacity-60 ${
                checked ? "border-pill bg-pill text-pill-on" : "border-line-2 bg-surface text-ink hover:bg-surface-2"
              }`}
            >
              <Icon size={16} weight={checked ? "fill" : "regular"} aria-hidden />
              {busy === a ? "Sending" : ANSWER_COPY[a].label}
            </button>
          );
        })}
      </div>
      {privacy}
      {noteOpen ? (
        noteFields
      ) : (
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          onClick={() => setNoteOpen(true)}
        >
          <NotePencil size={14} aria-hidden />
          Add a note or your name first
        </button>
      )}
      {answered ? (
        <div className="mt-2">
          <Button size="sm" variant="ghost" onClick={() => setChoosing(false)}>
            <CheckCircle size={15} aria-hidden />
            Keep my answer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
