"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowCounterClockwise,
  EnvelopeSimple,
  EnvelopeSimpleOpen,
  HourglassMedium,
  LockSimple,
  PaperPlaneTilt,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { sendFollowUp } from "@/app/actions/minutes";
import { Chip } from "@/components/meetings/Chip";
import { notifyError, notifySuccess } from "@/lib/toast";
import { MinutesDialog } from "./MinutesDialog";
import {
  BODY_MAX,
  MAX_GUESTS,
  SUBJECT_MAX,
  addGuests,
  composerPayload,
  composerProblem,
  dispatchSummary,
  guestOutcome,
  type FollowUp,
  type FollowUpDispatch,
} from "./minutes-model";

/* "Send follow-up", the host's composer: who gets it (everyone in the meeting in Mytheus, plus
   external guests by email), and a subject and message drafted from the shared minutes and the
   confirmed outcome, both editable. When this server has no email provider the composer says so
   calmly: participants still get the recap in Mytheus, guests are not emailed until an admin
   connects email. */

export function FollowUpComposer({
  meetingId,
  meetingTitle,
  followUp,
  onSent,
}: {
  meetingId: string;
  meetingTitle: string;
  followUp: FollowUp;
  onSent: (result: FollowUpDispatch) => void;
}) {
  const ids = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const guestInput = useRef<HTMLInputElement>(null);
  const draft = followUp.draft ?? null;
  const fallbackSubject = `Recap: ${meetingTitle}`.slice(0, SUBJECT_MAX);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(draft?.subject ?? fallbackSubject);
  const [body, setBody] = useState(draft?.body ?? "");
  const [guests, setGuests] = useState<string[]>(followUp.guest_emails);
  const [typed, setTyped] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailOff = followUp.email_configured === false;
  const people = draft?.participant_count ?? null;

  const reset = () => {
    setSubject(draft?.subject ?? fallbackSubject);
    setBody(draft?.body ?? "");
    setGuests(followUp.guest_emails);
    setTyped("");
    setGuestError(null);
    setError(null);
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    opener.current?.focus();
  };

  const commitTyped = (): { list: string[]; invalid: number } => {
    if (!typed.trim()) return { list: guests, invalid: 0 };
    const next = addGuests(guests, typed);
    setGuests(next.guests);
    setTyped(next.invalid.join(", "));
    setGuestError(
      next.invalid.length > 0
        ? `${next.invalid.length === 1 ? "That is" : "These are"} not an email address: ${next.invalid.join(", ")}`
        : next.overflow
          ? `At most ${MAX_GUESTS} guests.`
          : null,
    );
    return { list: next.guests, invalid: next.invalid.length };
  };

  const onGuestKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      commitTyped();
    } else if (e.key === "Backspace" && !typed && guests.length > 0) {
      setGuests(guests.slice(0, -1));
    }
  };

  const send = async () => {
    const { list, invalid } = commitTyped();
    if (invalid > 0) {
      setError("Fix or remove the guest address that is not valid.");
      return;
    }
    const d = { subject, body, guests: list };
    const problem = composerProblem(d);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await sendFollowUp(meetingId, composerPayload(d, draft, followUp.guest_emails));
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setOpen(false);
    opener.current?.focus();
    onSent(res.result);
    notifySuccess("Follow-up sent", { description: dispatchSummary(res.result) ?? undefined });
    if (res.result.email_configured === false && (res.result.guests ?? []).length > 0) {
      notifyError("Guests were not emailed", { description: "Email is not connected on this server yet." });
    }
  };

  const last = followUp.last_result ?? null;

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="mx-btn tap"
        disabled={!followUp.can_send}
        title={followUp.can_send ? undefined : "You can send the follow-up once the meeting has ended"}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <PaperPlaneTilt size={18} weight="bold" aria-hidden="true" />
        {followUp.last_sent_at ? "Send follow-up again" : "Send follow-up"}
      </button>

      <MinutesDialog
        open={open}
        onClose={close}
        title="Send the follow-up"
        wide
        initialFocus={`[id="${ids}-subject"]`}
        actions={
          <>
            {draft ? (
              <button type="button" className="mx-btn is-outline tap mn-left" onClick={reset} disabled={busy}>
                <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" />
                Use the drafted text
              </button>
            ) : null}
            <button type="button" className="mx-btn is-outline tap" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="mx-btn tap" onClick={send} disabled={busy} aria-busy={busy}>
              <PaperPlaneTilt size={18} weight="bold" aria-hidden="true" />
              {busy ? "Sending..." : "Send follow-up"}
            </button>
          </>
        }
      >
        {emailOff ? (
          <div className="mn-note" role="note">
            <EnvelopeSimpleOpen size={20} aria-hidden="true" />
            <div>
              <p>
                <strong>Email is not connected yet.</strong> Everyone in the meeting still gets the recap in Mytheus. Guests
                outside it will be emailed once an admin connects an email provider.
              </p>
            </div>
          </div>
        ) : null}
        {followUp.awaiting_minutes ? (
          <div className="mn-note is-quiet" role="note">
            <HourglassMedium size={20} aria-hidden="true" />
            <p>The minutes are still being written. The follow-up sends by itself when they are ready, or you can send it now.</p>
          </div>
        ) : !followUp.minutes_ready ? (
          <div className="mn-note is-quiet" role="note">
            <HourglassMedium size={20} aria-hidden="true" />
            <p>There are no minutes for this meeting yet, so the draft lists confirmed decisions and actions only.</p>
          </div>
        ) : null}
        {followUp.confidential ? (
          <div className="mn-note is-quiet" role="note">
            <LockSimple size={20} aria-hidden="true" />
            <p>
              This meeting is confidential. The email links to a public recap only if you have shared one from the Minutes
              card.
            </p>
          </div>
        ) : null}

        <div className="mn-field">
          <span className="mn-label">To</span>
          <p className="mn-recip">
            <UsersThree size={18} aria-hidden="true" />
            <span>
              {people === null
                ? "Everyone in the meeting"
                : `Everyone in the meeting (${people} ${people === 1 ? "person" : "people"})`}
              <small>In Mytheus, and by email for those who turned email on.</small>
            </span>
          </p>
        </div>

        <div className="mn-field">
          <label className="mn-label" htmlFor={`${ids}-guests`}>
            Guests outside the workspace <small>optional, up to {MAX_GUESTS}</small>
          </label>
          <div className={`mn-chips-input${guestError ? " is-invalid" : ""}`} onClick={() => guestInput.current?.focus()}>
            <ul aria-label="Guests" className="mn-guests">
              {guests.map((g) => (
                <li key={g} className="mn-guest">
                  <EnvelopeSimple size={14} aria-hidden="true" />
                  <span>{g}</span>
                  <button
                    type="button"
                    className="mn-guest-x tap"
                    aria-label={`Remove ${g}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuests(guests.filter((x) => x !== g));
                    }}
                  >
                    <X size={12} weight="bold" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <input
              ref={guestInput}
              id={`${ids}-guests`}
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder={guests.length === 0 ? "name@client.com" : "Add another"}
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setGuestError(null);
              }}
              onKeyDown={onGuestKey}
              onBlur={() => void commitTyped()}
              aria-invalid={guestError ? true : undefined}
              aria-describedby={`${ids}-guests-hint`}
              disabled={guests.length >= MAX_GUESTS}
            />
          </div>
          <small id={`${ids}-guests-hint`} className={guestError ? "mn-field-error" : "mn-hint"} role={guestError ? "alert" : undefined}>
            {guestError ??
              (emailOff
                ? "Saved with the follow-up. They are emailed once email is connected."
                : "Press Enter or a comma after each address. They get the recap and its public link by email.")}
          </small>
        </div>

        <div className="mn-field">
          <label className="mn-label" htmlFor={`${ids}-subject`}>
            Subject
          </label>
          <input
            id={`${ids}-subject`}
            className="mn-input"
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="mn-field">
          <label className="mn-label" htmlFor={`${ids}-body`}>
            Message <small>drafted from the minutes</small>
          </label>
          <textarea
            id={`${ids}-body`}
            className="mn-input mn-textarea"
            value={body}
            rows={14}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            aria-describedby={`${ids}-body-hint`}
          />
          <small id={`${ids}-body-hint`} className="mn-hint">
            Plain text. Lines starting with a hyphen become a list in the email. Personal minutes and promises are never
            included.
          </small>
        </div>

        {error ? (
          <p className="mh-new-error" role="alert">
            {error}
          </p>
        ) : null}

        {last && last.status === "sent" ? (
          <section className="mn-last" aria-labelledby={`${ids}-last`}>
            <h3 id={`${ids}-last`} className="mn-sub">
              Last sent
            </h3>
            <p className="mn-quiet">{dispatchSummary(last)}</p>
            {(last.guests ?? []).length > 0 ? (
              <ul className="mn-deliveries">
                {(last.guests ?? []).map((g) => {
                  const o = guestOutcome(g);
                  return (
                    <li key={g.recipient}>
                      <span>{g.recipient}</span>
                      <Chip tone={o.tone}>{o.label}</Chip>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null}
      </MinutesDialog>
    </>
  );
}
