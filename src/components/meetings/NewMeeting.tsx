"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "@phosphor-icons/react";
import { createMeeting } from "@/app/actions/meetings";
import { MemberPicker, type PickableMember } from "./MemberPicker";

/* "New meeting": the header button on the meetings hub and its dialog. Start now creates the
   meeting from this minute and goes straight to its join screen; Schedule creates it at the
   chosen local date and time and opens its detail page. Times are read in the browser, so they
   are the visitor's own time zone, and sent as ISO 8601 with the offset already applied. */

type When = "now" | "later";
const DURATIONS = [15, 30, 45, 60, 90] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today and the next half hour, as the values a date and a time input expect. */
function defaultSlot(): { date: string; time: string } {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function NewMeeting({ members }: { members: PickableMember[] | null }) {
  const router = useRouter();
  const ids = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<When>("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    openerRef.current?.focus();
  };

  const show = () => {
    const slot = defaultSlot();
    setTitle("");
    setWhen("now");
    setDate(slot.date);
    setTime(slot.time);
    setDuration(30);
    setInvitees([]);
    setError(null);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `close` reads `busy`; re-binding on every keystroke of the form is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give the meeting a title.");
    let start: Date;
    if (when === "now") {
      start = new Date();
    } else {
      start = new Date(`${date}T${time}`);
      if (Number.isNaN(start.getTime())) return setError("Pick a date and a time.");
      if (start.getTime() < Date.now() - 60_000) return setError("Pick a time that hasn't passed yet.");
    }

    setBusy(true);
    setError(null);
    const result = await createMeeting({
      title,
      scheduledStart: start.toISOString(),
      durationMinutes: duration,
      participantIds: invitees,
    });
    if (!result.ok) {
      setBusy(false);
      return setError(result.message);
    }
    router.push(when === "now" ? `/meetings/${result.id}/join` : `/meetings/${result.id}`);
    router.refresh();
  };

  return (
    <>
      <button ref={openerRef} type="button" className="btn-accent-sm tap mh-new-open" onClick={show}>
        <Plus size={14} weight="bold" aria-hidden="true" />
        New meeting
      </button>

      {open && (
        <div className="mh-new-layer">
          <button type="button" className="mh-new-scrim" aria-label="Close" onClick={close} tabIndex={-1} />
          <div role="dialog" aria-modal="true" aria-labelledby={`${ids}-h`} className="mh-new">
            <div className="mh-new-head">
              <h2 id={`${ids}-h`}>New meeting</h2>
              <button type="button" className="mh-new-x tap" aria-label="Close" onClick={close}>
                <X size={16} weight="bold" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submit} noValidate>
              <label className="mh-new-field" htmlFor={`${ids}-title`}>
                <span>Title</span>
                <input
                  ref={titleRef}
                  id={`${ids}-title`}
                  value={title}
                  maxLength={500}
                  placeholder="Weekly sync"
                  autoComplete="off"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <fieldset className="mh-new-when">
                <legend>When</legend>
                <div className="mh-new-seg" role="radiogroup">
                  {(["now", "later"] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={when === w}
                      className={`mh-new-seg-opt tap${when === w ? " is-on" : ""}`}
                      onClick={() => setWhen(w)}
                    >
                      {w === "now" ? "Start now" : "Schedule"}
                    </button>
                  ))}
                </div>
              </fieldset>

              {when === "later" && (
                <div className="mh-new-row">
                  <label className="mh-new-field" htmlFor={`${ids}-date`}>
                    <span>Date</span>
                    <input id={`${ids}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </label>
                  <label className="mh-new-field" htmlFor={`${ids}-time`}>
                    <span>Time</span>
                    <input id={`${ids}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </label>
                </div>
              )}

              <label className="mh-new-field" htmlFor={`${ids}-len`}>
                <span>Length</span>
                <select id={`${ids}-len`} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </label>

              <div className="mh-new-field">
                <span>
                  Invite{invitees.length > 0 ? ` · ${invitees.length} selected` : ""}
                </span>
                <MemberPicker members={members} selected={invitees} onChange={setInvitees} />
              </div>

              {error && (
                <p className="mh-new-error" role="alert">
                  {error}
                </p>
              )}

              <div className="mh-new-acts">
                <button type="button" className="btn-ghost-sm tap" onClick={close} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="btn-accent-sm tap" disabled={busy}>
                  {busy ? "Creating…" : when === "now" ? "Create and join" : "Schedule meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
