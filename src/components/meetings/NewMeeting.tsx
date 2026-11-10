"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, LockSimple, Sparkle, X } from "@phosphor-icons/react";
import { createMeeting, draftAgenda } from "@/app/actions/meetings";
import type { MeetingTemplate, OrgGoal } from "@/lib/api/meeting-brain-types";
import { AgendaEditor, type AgendaPerson } from "./AgendaEditor";
import {
  mergeDraftedAgenda,
  templateDraft,
  validateAgenda,
  type AgendaDraftRow,
  type AgendaRowErrors,
} from "./agenda-editor-model";
import { MeetingPrecheckHint } from "./MeetingPrecheckHint";
import { MemberPicker, type PickableMember } from "./MemberPicker";
import { useDialogKeys } from "./useDialogKeys";

/* "New meeting": the primary button on the meetings hub (and its empty state) and its dialog. Start now creates the
   meeting from this minute and goes straight to its join screen; Schedule creates it at the
   chosen local date and time and opens its detail page. Times are read in the browser, so they
   are the visitor's own time zone, and sent as ISO 8601 with the offset already applied.

   ADR-0038 D11 adds three optional parts: "Follow-up to" (one of your recent meetings), the host
   (you by default, or one of the people you invite) and an agenda (title, owner, minutes). Owners
   are chosen from the people in the meeting; un-inviting someone who owns an item flags it.

   ADR-0039 adds: a meeting type (fills the length, the agenda and Confidential), a Confidential
   switch, "Draft the agenda" from the type and the meeting this follows up (each drafted item
   says where it came from), and a company goal on each agenda item when the workspace has goals.
   Nothing is saved until Create. On a wide screen the details and the agenda sit side by side. */

/** An earlier meeting the new one can follow up. */
export type FollowUpOption = { id: string; title: string; startTime: string };
/** The signed-in person, as the host and owner pickers name them. */
export type NewMeetingMe = { id: string; name: string };

const followDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

type When = "now" | "later";
const DURATIONS = [15, 30, 45, 60, 90] as const;

/** "1 hr 30 min" style for a length that is not one of the usual five. */
function lengthLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** What picking a type will fill, said in one line. */
function typeFills(t: MeetingTemplate): string {
  const parts = [lengthLabel(t.default_duration_minutes)];
  if (t.agenda.length > 0) parts.push(`${t.agenda.length} agenda ${t.agenda.length === 1 ? "item" : "items"}`);
  if (t.confidential) parts.push("confidential");
  return `Fills ${parts.join(", ")}.`;
}

type Notice = { tone: "info" | "error"; text: string } | null;

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
  templates = [],
  goals = [],
}: {
  members: PickableMember[] | null;
  /** The workspace's meeting types (ADR-0039 B1); null when they could not be loaded. */
  templates?: MeetingTemplate[] | null;
  /** Active company goals (A4); the goal picker hides when there are none. */
  goals?: OrgGoal[];
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
  const [templateId, setTemplateId] = useState("");
  const [confidential, setConfidential] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const template = templates?.find((t) => t.id === templateId) ?? null;
  const lengths = useMemo(
    () => Array.from(new Set<number>([...DURATIONS, duration])).sort((a, b) => a - b),
    [duration],
  );

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
    setTemplateId("");
    setConfidential(false);
    setDrafting(false);
    setNotice(null);
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

  const editAgenda = (rows: AgendaDraftRow[]) => {
    setAgenda(rows);
    if (Object.keys(agendaErrors).length > 0) setAgendaErrors({});
  };

  // A meeting type fills the length, Confidential and its agenda items, replacing only items an
  // earlier type put there. "No type" takes those items back out.
  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates?.find((x) => x.id === id) ?? null;
    const merged = mergeDraftedAgenda(agenda, t ? templateDraft(t) : [], ["template"]);
    editAgenda(merged.rows);
    if (!t) return setNotice(null);
    setDuration(t.default_duration_minutes);
    setConfidential(t.confidential);
    setNotice({
      tone: "info",
      text: `Filled from ${t.name}: ${lengthLabel(t.default_duration_minutes)}${
        merged.added ? `, ${merged.added} agenda ${merged.added === 1 ? "item" : "items"}` : ""
      }${t.confidential ? ", confidential" : ""}.${merged.dropped ? ` ${merged.dropped} left out to stay within 20 items.` : ""}`,
    });
  };

  const canDraft = Boolean(previousId || templateId);
  const draft = async () => {
    if (!canDraft || drafting) return;
    setDrafting(true);
    setNotice(null);
    const res = await draftAgenda({ previousMeetingId: previousId || null, templateId: templateId || null });
    setDrafting(false);
    if (!res.ok) return setNotice({ tone: "error", text: res.message });
    if (res.items.length === 0) {
      return setNotice({ tone: "info", text: "Nothing to draft: no type items and nothing left open from the earlier meeting." });
    }
    // Owners of drafted items join the invite list when they are workspace members, so the
    // owner can stay on the item; anyone else's item is left without an owner.
    const byId = new Map((members ?? []).map((m) => [m.id, m.name]));
    const inMeetingIds = new Set([...(me ? [me.id] : []), ...invitees]);
    const added: string[] = [];
    const items = res.items.map((it) => {
      const owner = it.owner_user_id;
      if (!owner || inMeetingIds.has(owner)) return it;
      if (byId.has(owner)) {
        inMeetingIds.add(owner);
        added.push(owner);
        return it;
      }
      return { ...it, owner_user_id: null };
    });
    if (added.length > 0) setInvitees((cur) => [...cur, ...added.filter((id) => !cur.includes(id))]);
    const merged = mergeDraftedAgenda(agenda, items);
    editAgenda(merged.rows);
    const who = added.map((id) => byId.get(id) ?? "a teammate");
    setNotice({
      tone: "info",
      text: `Drafted ${merged.added} ${merged.added === 1 ? "item" : "items"}. Review them before you create the meeting.${
        who.length ? ` Invited ${who.join(", ")}, who ${who.length === 1 ? "owns an item" : "own items"}.` : ""
      }${merged.dropped ? ` ${merged.dropped} left out to stay within 20 items.` : ""}`,
    });
  };

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
      agenda: checked.items.map(({ title: t, owner_user_id, duration_minutes, goal_id }) => ({
        title: t,
        owner_user_id,
        duration_minutes,
        goal_id: goal_id ?? null,
      })),
      confidential,
      templateId: templateId || null,
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
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${ids}-h`} className="mh-new is-wide is-brain">
            <form onSubmit={submit} noValidate>
              <div className="mh-new-head">
                <h2 id={`${ids}-h`}>New meeting</h2>
                <button type="button" className="cx-icon-btn sm tap" aria-label="Close" onClick={close}>
                  <X size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>

              <div className="mh-new-body nm-body">
                <div className="nm-col">
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

                  <label className="mh-new-field" htmlFor={`${ids}-type`}>
                    <span>
                      Meeting type <small className="mh-new-hint">Optional</small>
                    </span>
                    <select
                      id={`${ids}-type`}
                      value={templateId}
                      disabled={!templates || templates.length === 0 || busy}
                      aria-describedby={`${ids}-type-note`}
                      onChange={(e) => pickTemplate(e.target.value)}
                    >
                      <option value="">
                        {templates === null ? "Couldn't load meeting types" : templates.length === 0 ? "No meeting types yet" : "No type"}
                      </option>
                      {(templates ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <small id={`${ids}-type-note`} className="mh-new-hint">
                      {templates === null
                        ? "Meeting types couldn't be loaded. You can still set everything by hand."
                        : templates.length === 0
                          ? "A workspace admin can add types, like a weekly sync, in Company brain."
                          : template
                            ? [template.description, typeFills(template)].filter(Boolean).join(" ")
                            : "A type fills the length, the agenda and whether it is confidential."}
                    </small>
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
                        {lengths.map((d) => (
                          <option key={d} value={d}>
                            {lengthLabel(d)}
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

                  <div className="nm-conf">
                    <button
                      id={`${ids}-conf`}
                      type="button"
                      role="switch"
                      aria-checked={confidential}
                      aria-describedby={`${ids}-conf-note`}
                      className="nm-switch tap"
                      disabled={busy}
                      onClick={() => setConfidential((v) => !v)}
                    >
                      <span className="nm-switch-track" aria-hidden="true">
                        <span className="nm-switch-knob" />
                      </span>
                      <span className="nm-switch-label">
                        <LockSimple size={15} aria-hidden="true" />
                        Confidential
                      </span>
                    </button>
                    <small id={`${ids}-conf-note`} className="mh-new-hint">
                      Kept out of topic watch, and never shown in other meetings to people who weren&rsquo;t in this one.
                    </small>
                  </div>
                </div>

                <div className="nm-col nm-agenda">
                  <MeetingPrecheckHint
                    title={title}
                    agenda={agenda.map((r) => r.title)}
                    participantIds={[...(me ? [me.id] : []), ...invitees]}
                  />
                  <fieldset className="mh-new-when ag-new-agenda">
                    <legend>
                      Agenda <small className="mh-new-hint">Optional, up to 20 items</small>
                    </legend>
                    <div className="nm-draft">
                      <button
                        type="button"
                        className="mx-btn is-outline is-sm tap"
                        disabled={!canDraft || drafting || busy}
                        aria-describedby={`${ids}-draft-note`}
                        onClick={() => void draft()}
                      >
                        <Sparkle size={16} aria-hidden="true" />
                        {drafting ? "Drafting..." : "Draft the agenda"}
                      </button>
                      <small id={`${ids}-draft-note`} className="mh-new-hint">
                        {canDraft
                          ? `From ${[template ? "the meeting type" : null, previousId ? "what the earlier meeting left open" : null]
                              .filter(Boolean)
                              .join(" and ")}. Nothing is saved until you create the meeting.`
                          : "Pick a meeting type or a meeting this follows up, and your agent drafts it."}
                      </small>
                    </div>
                    {notice ? (
                      <p className={`nm-notice${notice.tone === "error" ? " is-error" : ""}`} role={notice.tone === "error" ? "alert" : "status"}>
                        {notice.text}
                      </p>
                    ) : null}
                    <AgendaEditor
                      rows={agenda}
                      onChange={editAgenda}
                      people={inMeeting}
                      errors={agendaErrors}
                      meetingMinutes={duration}
                      disabled={busy || drafting}
                      goals={goals}
                    />
                  </fieldset>
                </div>

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
