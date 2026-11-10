"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise, Plus, Robot, Trash, User } from "@phosphor-icons/react";
import { Doodle } from "@/components/ui/Doodle";
import { setAttendance, type AttendanceSaved } from "@/app/actions/attendance";
import { ATTENDANCE_LIMITS, type Attendance } from "@/lib/api/meeting-brain-types";
import {
  attendanceChanged,
  canAddQuestion,
  draftFrom,
  validateAttendance,
  type AttendanceDraft,
  type AttendanceErrors,
} from "./attendance-model";

/* "Send my agent instead" on the meeting page (mytheus-docs ADR-0039 B5). Before the meeting
   starts you choose: you attend, or your agent attends for you, carrying an update for the room
   (everyone in the meeting sees it) and up to five questions (only you and the host see them).
   Your agent listens and takes notes for you; you get a catch-up after.

   Nothing is saved until you press the button, and it is easy to undo: "Go myself instead" puts
   you back until the meeting starts. Once it has started this shows what you chose, read only. */

export function AttendanceCard({
  meetingId,
  saved: initial,
  editable,
  agent,
  hostName,
}: {
  meetingId: string;
  saved: AttendanceSaved;
  /** Before the meeting starts. */
  editable: boolean;
  /** Your agent's face and name. */
  agent: { name: string; seed: string };
  /** The host, named in the note about who sees the questions; null when you host. */
  hostName: string | null;
}) {
  const router = useRouter();
  const uid = useId();
  const [saved, setSaved] = useState<AttendanceSaved>(initial);
  const [draft, setDraft] = useState<AttendanceDraft>(() => draftFrom(initial));
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<AttendanceErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const sending = saved.attendance === "agent";
  const showForm = editable && (editing || (!sending && draft.attendance === "agent"));
  const changed = attendanceChanged(draft, saved);

  const save = async (next: AttendanceDraft) => {
    const checked = validateAttendance(next);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    setMessage(null);
    const res = await setAttendance(meetingId, next);
    setBusy(false);
    if (!res.ok) return setMessage({ tone: "error", text: res.message });
    setSaved(res.saved);
    setDraft(draftFrom(res.saved));
    setEditing(false);
    setMessage({
      tone: "ok",
      text: res.saved.attendance === "agent" ? `${agent.name} will attend for you.` : "You're attending yourself again.",
    });
    router.refresh();
  };

  const choose = (attendance: Attendance) => {
    setMessage(null);
    if (attendance === "live") {
      // Going back from a saved "send my agent" is its own explicit button, never a radio click.
      if (sending) return void save({ ...draft, attendance: "live" });
      setDraft(draftFrom(saved));
      setEditing(false);
      return;
    }
    setDraft((d) => ({ ...d, attendance: "agent" }));
    setEditing(true);
    window.requestAnimationFrame(() => document.getElementById(`${uid}-update`)?.focus());
  };

  const setQuestion = (i: number, value: string) =>
    setDraft((d) => ({ ...d, questions: d.questions.map((q, j) => (j === i ? value : q)) }));
  const removeQuestion = (i: number) =>
    setDraft((d) => {
      const questions = d.questions.filter((_, j) => j !== i);
      return { ...d, questions: questions.length ? questions : [""] };
    });
  const addQuestion = () => {
    if (!canAddQuestion(draft.questions)) return;
    setDraft((d) => ({ ...d, questions: [...d.questions, ""] }));
    const n = draft.questions.length;
    window.requestAnimationFrame(() => document.getElementById(`${uid}-q-${n}`)?.focus());
  };

  const questionsShown = saved.proxyQuestions;

  return (
    <section className="mx-card mx-card-pad at" aria-labelledby={`${uid}-h`}>
      <div className="mx-card-head">
        <h2 className="mx-card-title" id={`${uid}-h`}>
          {sending ? "Your agent is going for you" : "Can't make it?"}
        </h2>
        {editable ? <span className="mx-card-note">You can change this until it starts</span> : null}
      </div>

      <div className="at-who">
        <span className="at-face" aria-hidden="true">
          <Doodle seed={agent.seed} className="block h-full w-full" />
        </span>
        <p className="mx-help">
          {sending
            ? `${agent.name} attends in your place. It listens, takes notes for you and brings your update and questions. You get a catch-up when it ends.`
            : `Send ${agent.name} instead. It attends for you, shares your update with the room, asks your questions and gives you a catch-up after.`}
        </p>
      </div>

      {editable && !sending ? (
        <div className="at-seg mh-new-seg" role="radiogroup" aria-label="Who attends">
          <button
            type="button"
            role="radio"
            aria-checked={draft.attendance === "live"}
            className="mh-new-seg-opt tap"
            disabled={busy}
            onClick={() => choose("live")}
          >
            <User size={16} aria-hidden="true" />
            I&rsquo;ll be there
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={draft.attendance === "agent"}
            className="mh-new-seg-opt tap"
            disabled={busy}
            onClick={() => choose("agent")}
          >
            <Robot size={16} aria-hidden="true" />
            Send my agent
          </button>
        </div>
      ) : null}

      {showForm ? (
        <form
          className="at-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save({ ...draft, attendance: "agent" });
          }}
        >
          <label className="mh-new-field" htmlFor={`${uid}-update`}>
            <span>
              Your update for the room
              <small className="mh-new-hint">Everyone in the meeting sees it</small>
            </span>
            <textarea
              id={`${uid}-update`}
              className="at-text"
              rows={4}
              value={draft.update}
              maxLength={ATTENDANCE_LIMITS.updateMax}
              placeholder="Where your part stands, what you need, anything the room should know"
              aria-invalid={errors.update ? true : undefined}
              aria-describedby={`${uid}-update-count${errors.update ? ` ${uid}-update-err` : ""}`}
              disabled={busy}
              onChange={(e) => setDraft((d) => ({ ...d, update: e.target.value }))}
            />
            <small id={`${uid}-update-count`} className="at-count">
              {draft.update.length} of {ATTENDANCE_LIMITS.updateMax}
            </small>
            {errors.update ? (
              <small id={`${uid}-update-err`} className="ag-ed-err">
                {errors.update}
              </small>
            ) : null}
          </label>

          <fieldset className="mh-new-when at-qs">
            <legend>
              Questions to ask
              <small className="mh-new-hint">
                Up to {ATTENDANCE_LIMITS.questionsMax}. Only you{hostName ? ` and ${hostName}, the host,` : ""} see them
              </small>
            </legend>
            <ol className="at-q-list">
              {draft.questions.map((q, i) => {
                const err = errors.questions?.[i];
                return (
                  <li key={i} className="at-q">
                    <label className="sr-only" htmlFor={`${uid}-q-${i}`}>
                      Question {i + 1}
                    </label>
                    <input
                      id={`${uid}-q-${i}`}
                      value={q}
                      maxLength={ATTENDANCE_LIMITS.questionMax}
                      placeholder={i === 0 ? "What do you want answered?" : "Another question"}
                      autoComplete="off"
                      disabled={busy}
                      aria-invalid={err ? true : undefined}
                      aria-describedby={err ? `${uid}-q-${i}-err` : undefined}
                      onChange={(e) => setQuestion(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="cx-icon-btn sm tap"
                      aria-label={`Remove question ${i + 1}`}
                      disabled={busy || (draft.questions.length === 1 && !q)}
                      onClick={() => removeQuestion(i)}
                    >
                      <Trash size={16} aria-hidden="true" />
                    </button>
                    {err ? (
                      <small id={`${uid}-q-${i}-err`} className="ag-ed-err at-q-err">
                        {err}
                      </small>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              className="mx-btn is-outline is-sm tap at-add"
              disabled={busy || !canAddQuestion(draft.questions)}
              onClick={addQuestion}
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
              Add a question
            </button>
          </fieldset>

          {errors.form ? (
            <p className="ag-msg" role="alert">
              {errors.form}
            </p>
          ) : null}

          <div className="ag-edit-acts">
            <button
              type="button"
              className="mx-btn is-outline is-sm tap"
              disabled={busy}
              onClick={() => {
                setDraft(draftFrom(saved));
                setErrors({});
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="mx-btn is-sm tap" disabled={busy || (sending && !changed)}>
              {busy ? "Saving..." : sending ? "Save changes" : `Send ${agent.name}`}
            </button>
          </div>
        </form>
      ) : sending ? (
        <div className="at-sent">
          <div className="at-sent-block">
            <h3 className="cf-sub">Your update</h3>
            <p className="at-sent-text">{saved.proxyUpdate ?? "No update. Your agent listens and takes notes for you."}</p>
          </div>
          {questionsShown.length > 0 ? (
            <div className="at-sent-block">
              <h3 className="cf-sub">Your questions</h3>
              <ol className="cf-list at-sent-qs">
                {questionsShown.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {editable ? (
            <div className="ag-edit-acts">
              <button type="button" className="mx-btn is-outline is-sm tap" disabled={busy} onClick={() => choose("live")}>
                <ArrowCounterClockwise size={16} aria-hidden="true" />
                {busy ? "Saving..." : "Go myself instead"}
              </button>
              <button
                type="button"
                className="mx-btn is-sm tap"
                disabled={busy}
                onClick={() => {
                  setEditing(true);
                  window.requestAnimationFrame(() => document.getElementById(`${uid}-update`)?.focus());
                }}
              >
                Edit update
              </button>
            </div>
          ) : (
            <p className="md-foot">It has started, so this can no longer change.</p>
          )}
        </div>
      ) : !editable ? (
        <p className="md-foot">It has started, so who attends can no longer change.</p>
      ) : null}

      {message ? (
        <p className={message.tone === "error" ? "ag-msg" : "at-ok"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
