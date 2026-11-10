"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, X } from "@phosphor-icons/react";
import { createMeeting } from "@/app/actions/meetings";
import { AgendaEditor, type AgendaPerson } from "./AgendaEditor";
import { validateAgenda, type AgendaDraftRow, type AgendaRowErrors } from "./agenda-editor-model";
import { MemberPicker, type PickableMember } from "./MemberPicker";
import { useDialogKeys } from "./useDialogKeys";

/* "New meeting": the primary button on the meetings hub (and its empty state) and its dialog. Start now creates the
   meeting from this minute and goes straight to its join screen; Schedule creates it at the
   chosen local date and time and opens its detail page. Times are read in the browser, so they
   are the visitor's own time zone, and sent as ISO 8601 with the offset already applied.

   ADR-0038 D11 adds three optional parts: "Follow-up to" (one of your recent meetings), the host
   (you by default, or one of the people you invite) and an agenda (title, owner, minutes). Owners
   are chosen from the people in the meeting; un-inviting someone who owns an item flags it. */

/** An earlier meeting the new one can follow up. */
export type FollowUpOption = { id: string; title: string; startTime: string };
/** The signed-in person, as the host and owner pickers name them. */
export type NewMeetingMe = { id: string; name: string };

const followDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

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

export function NewMeeting({
  members,
  openFromLink = false,
  recent = [],
  me = null,
}: {
  members: PickableMember[] | null;
  /** Your recent meetings, newest first, for "Follow-up to". */
  recent?: FollowUpOption[];
  /** You, for the host and owner pickers. Null when the member list could not be loaded. */
  me?: NewMeetingMe | null;
  /** Open the dialog when the page is reached with `?new=1` (the sidebar's New meeting button).
      Set on one instance only, so a page with two buttons opens one dialog. */
  openFromLink?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const ids = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<When>("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [hostId, setHostId] = useState("");
  const [previousId, setPreviousId] = useState("");
  const [agenda, setAgenda] = useState<AgendaDraftRow[]>([]);
  const [agendaErrors, setAgendaErrors] = useState<Record<string, AgendaRowErrors>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Everyone who will be in the meeting: you, then the people picked so far.
  const inMeeting = useMemo<AgendaPerson[]>(() => {
    const byId = new Map((members ?? []).map((m) => [m.id, m.name]));
    const list: AgendaPerson[] = me ? [{ id: me.id, name: `${me.name} (you)` }] : [];
    for (const id of invitees) list.push({ id, name: byId.get(id) ?? "Invited member" });
    return list;
  }, [members, me, invitees]);

  // A host who is no longer invited falls back to you.
  useEffect(() => {
    if (hostId && !invitees.includes(hostId)) setHostId("");
  }, [hostId, invitees]);

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
    setHostId("");
    setPreviousId("");
    setAgenda([]);
    setAgendaErrors({});
    setError(null);
    setOpen(true);
  };

  useDialogKeys(dialogRef, open, close, () => titleRef.current?.focus());

  const wantsNew = openFromLink && params.get("new") === "1";
  useEffect(() => {
    if (!wantsNew) return;
    show();
    router.replace(pathname, { scroll: false });
    // `show` only resets local fields; running once per arrival is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew]);

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

    const participantIds = [...(me ? [me.id] : []), ...invitees];
    const checked = validateAgenda(agenda, participantIds);
    if (!checked.ok) {
      setAgendaErrors(checked.rows);
      return setError(checked.message);
    }
    setAgendaErrors({});

    setBusy(true);
    setError(null);
    const result = await createMeeting({
      title,
      scheduledStart: start.toISOString(),
      durationMinutes: duration,
      participantIds: invitees,
      hostUserId: hostId || null,
      previousMeetingId: previousId || null,
      agenda: checked.items.map(({ title: t, owner_user_id, duration_minutes }) => ({ title: t, owner_user_id, duration_minutes })),
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
      <button ref={openerRef} type="button" className="mx-btn tap" onClick={show}>
        <CalendarPlus size={18} weight="bold" aria-hidden="true" />
        New meeting
      </button>

      {open && (
        <div className="mh-new-layer">
          <button type="button" className="mh-new-scrim" aria-label="Close" onClick={close} tabIndex={-1} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${ids}-h`} className="mh-new is-wide">
            <form onSubmit={submit} noValidate>
              <div className="mh-new-head">
                <h2 id={`${ids}-h`}>New meeting</h2>
                <button type="button" className="cx-icon-btn sm tap" aria-label="Close" onClick={close}>
                  <X size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>

              <div className="mh-new-body">
                <label className="mh-new-field" htmlFor={`${ids}-title`}>
                  <span>Title</span>
                  <input
                    ref={titleRef}
                    id={`${ids}-title`}
                    value={title}
                    maxLength={500}
                    placeholder="Weekly product standup"
                    autoComplete="off"
                    aria-invalid={error === "Give the meeting a title." ? true : undefined}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>

                <fieldset className="mh-new-when">
                  <legend>When</legend>
                  <div className="mh-new-seg" role="radiogroup" aria-label="When">
                    {(["now", "later"] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        role="radio"
                        aria-checked={when === w}
                        className="mh-new-seg-opt tap"
                        onClick={() => setWhen(w)}
                      >
                        {w === "now" ? "Start now" : "Schedule"}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className={`mh-new-row${when === "later" ? " is-three" : ""}`}>
                  {when === "later" && (
                    <>
                      <label className="mh-new-field" htmlFor={`${ids}-date`}>
                        <span>Date</span>
                        <input id={`${ids}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                      </label>
                      <label className="mh-new-field" htmlFor={`${ids}-time`}>
                        <span>Time</span>
                        <input id={`${ids}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                      </label>
                    </>
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
                </div>

                <div className="mh-new-field">
                  <span>
                    Invite
                    {invitees.length > 0 ? <small className="mh-new-hint">{invitees.length} selected</small> : null}
                  </span>
                  <MemberPicker members={members} selected={invitees} onChange={setInvitees} />
                </div>

                <div className="mh-new-row ag-new-pair">
                  <label className="mh-new-field" htmlFor={`${ids}-host`}>
                    <span>Host</span>
                    <select id={`${ids}-host`} value={hostId} onChange={(e) => setHostId(e.target.value)}>
                      <option value="">{me ? `${me.name} (you)` : "You"}</option>
                      {inMeeting
                        .filter((p) => p.id !== me?.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="mh-new-field" htmlFor={`${ids}-prev`}>
                    <span>
                      Follow-up to <small className="mh-new-hint">Optional</small>
                    </span>
                    <select
                      id={`${ids}-prev`}
                      value={previousId}
                      disabled={recent.length === 0}
                      aria-describedby={recent.length === 0 ? `${ids}-prev-note` : undefined}
                      onChange={(e) => setPreviousId(e.target.value)}
                    >
                      <option value="">{recent.length === 0 ? "No earlier meetings" : "Not a follow-up"}</option>
                      {recent.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}, {followDate.format(new Date(m.startTime))}
                        </option>
                      ))}
                    </select>
                    {recent.length === 0 ? (
                      <small id={`${ids}-prev-note`} className="mh-new-hint">
                        Meetings you have had show here.
                      </small>
                    ) : null}
                  </label>
                </div>

                <fieldset className="mh-new-when ag-new-agenda">
                  <legend>
                    Agenda <small className="mh-new-hint">Optional, up to 20 items</small>
                  </legend>
                  <AgendaEditor
                    rows={agenda}
                    onChange={(rows) => {
                      setAgenda(rows);
                      if (Object.keys(agendaErrors).length > 0) setAgendaErrors({});
                    }}
                    people={inMeeting}
                    errors={agendaErrors}
                    meetingMinutes={duration}
                    disabled={busy}
                  />
                </fieldset>

                {error && (
                  <p className="mh-new-error" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="mh-new-acts">
                <button type="button" className="mx-btn is-outline tap" onClick={close} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="mx-btn tap" disabled={busy}>
                  {busy ? "Creating..." : when === "now" ? "Create and join" : "Schedule meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
