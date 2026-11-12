"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowBendDownRight,
  CalendarBlank,
  CalendarCheck,
  CalendarPlus,
  Clock,
  Crown,
  Lightning,
  ListChecks,
  LockSimple,
  NotePencil,
  Shapes,
  Sparkle,
  Timer,
  UsersThree,
  VideoCamera,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { createMeeting, draftAgenda } from "@/app/actions/meetings";
import { Dropdown } from "@/components/ui/Dropdown";
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
   Nothing is saved until Create.

   The window (UI polish pass): one popup with a fixed head and foot and a scrolling body. On a
   wide screen two columns, what and when (and the optional agenda) on the left, people, host and
   follow-up on the right, staying in view; one flowing column on a phone. The foot always shows a
   one-line summary of what will happen and the one primary action, named for the mode: Start now
   or Schedule. Every choice from a list is the shared Dropdown. */

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

  const participantCount = 1 + invitees.length;
  const hostName = hostId ? inMeeting.find((p) => p.id === hostId)?.name ?? "Invited member" : "you";
  const whenLine = when === "now" ? "Starts now" : scheduledLine(date, time);
  const summary = `${whenLine}, ${lengthLabel(duration)}, ${
    participantCount === 1 ? "just you" : `${participantCount} people`
  }${hostId ? `, ${hostName} hosts` : ""}${confidential ? ", confidential" : ""}`;
  const typeOptions = [
    {
      value: "",
      label: templates === null ? "Couldn't load meeting types" : templates.length === 0 ? "No meeting types yet" : "No type",
      description: templates && templates.length > 0 ? "Set everything by hand" : undefined,
    },
    ...(templates ?? []).map((t) => ({ value: t.id, label: t.name, description: t.description || typeFills(t) })),
  ];
  const hostOptions = [
    { value: "", label: me ? `${me.name} (you)` : "You" },
    ...inMeeting.filter((p) => p.id !== me?.id).map((p) => ({ value: p.id, label: p.name })),
  ];
  const followOptions = [
    { value: "", label: recent.length === 0 ? "No earlier meetings" : "Not a follow-up" },
    ...recent.map((m) => ({ value: m.id, label: m.title, description: followDate.format(new Date(m.startTime)) })),
  ];
  const titleMissing = error === "Give the meeting a title.";

  return (
    <>
      <button ref={openerRef} type="button" className="mx-btn tap" onClick={show}>
        <CalendarPlus size={18} weight="bold" aria-hidden="true" />
        New meeting
      </button>

      {open && (
        <div className="mh-new-layer nm-layer">
          <button type="button" className="mh-new-scrim" aria-label="Close" onClick={close} tabIndex={-1} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${ids}-h`}
            aria-describedby={`${ids}-lead`}
            className="mh-new nm-win"
          >
            <form onSubmit={submit} noValidate className="nm-form" aria-busy={busy || undefined}>
              <header className="nm-head">
                <div className="nm-head-text">
                  <h2 id={`${ids}-h`}>New meeting</h2>
                  <p id={`${ids}-lead`}>Set it up once. Your Myte takes notes, tracks the agenda and follows up.</p>
                </div>
                <button type="button" className="cx-icon-btn sm tap" aria-label="Close" onClick={close} disabled={busy}>
                  <X size={18} weight="bold" aria-hidden="true" />
                </button>
              </header>

              <div className="nm-scroll">
                <div className="nm-grid">
                  {/* What: the title, the type that fills the rest, and Confidential. */}
                  <section className="nm-sec nm-what" aria-labelledby={`${ids}-what`}>
                    <h3 id={`${ids}-what`} className="nm-sec-h">
                      <NotePencil size={16} aria-hidden="true" />
                      What
                    </h3>
                    <div className="nm-field">
                      <label htmlFor={`${ids}-title`} className="nm-label">
                        Title
                      </label>
                      <input
                        ref={titleRef}
                        id={`${ids}-title`}
                        className="nm-input nm-title"
                        value={title}
                        maxLength={500}
                        placeholder="Weekly product standup"
                        autoComplete="off"
                        aria-invalid={titleMissing ? true : undefined}
                        aria-describedby={titleMissing ? `${ids}-err` : undefined}
                        disabled={busy}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (titleMissing) setError(null);
                        }}
                      />
                    </div>
                    <div className="nm-field">
                      <label htmlFor={`${ids}-type`} className="nm-label">
                        Meeting type <small className="mh-new-hint">Optional</small>
                      </label>
                      <Dropdown
                        id={`${ids}-type`}
                        label="Meeting type"
                        value={templateId}
                        options={typeOptions}
                        disabled={!templates || templates.length === 0 || busy}
                        describedBy={`${ids}-type-note`}
                        icon={<Shapes size={16} />}
                        onChange={pickTemplate}
                      />
                      <small id={`${ids}-type-note`} className={`mh-new-hint${templates === null ? " is-warn" : ""}`}>
                        {templates === null
                          ? "Meeting types couldn't be loaded. You can still set everything by hand."
                          : templates.length === 0
                            ? "A workspace admin can add types, like a weekly sync, in Company brain."
                            : template
                              ? typeFills(template)
                              : "A type fills the length, the agenda and whether it is confidential."}
                      </small>
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
                    <MeetingPrecheckHint
                      title={title}
                      agenda={agenda.map((r) => r.title)}
                      participantIds={[...(me ? [me.id] : []), ...invitees]}
                    />
                  </section>

                  {/* When: start now or schedule, and the length. */}
                  <section className="nm-sec nm-when" aria-labelledby={`${ids}-when`}>
                    <h3 id={`${ids}-when`} className="nm-sec-h">
                      <Clock size={16} aria-hidden="true" />
                      When
                    </h3>
                    <div className="mh-new-seg nm-seg" role="radiogroup" aria-labelledby={`${ids}-when`}>
                      {(["now", "later"] as const).map((w) => (
                        <button
                          key={w}
                          type="button"
                          role="radio"
                          aria-checked={when === w}
                          tabIndex={when === w ? 0 : -1}
                          className="mh-new-seg-opt tap"
                          disabled={busy}
                          onClick={() => setWhen(w)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp") {
                              e.preventDefault();
                              const next = when === "now" ? "later" : "now";
                              setWhen(next);
                              (e.currentTarget.parentElement?.querySelector<HTMLElement>(`[data-when="${next}"]`))?.focus();
                            }
                          }}
                          data-when={w}
                        >
                          {w === "now" ? <Lightning size={16} aria-hidden="true" /> : <CalendarBlank size={16} aria-hidden="true" />}
                          {w === "now" ? "Start now" : "Schedule"}
                        </button>
                      ))}
                    </div>
                    <div className={`nm-when-row${when === "later" ? " is-later" : ""}`}>
                      {when === "later" ? (
                        <>
                          <div className="nm-field">
                            <label htmlFor={`${ids}-date`} className="nm-label">
                              Date
                            </label>
                            <input
                              id={`${ids}-date`}
                              className="nm-input"
                              type="date"
                              value={date}
                              disabled={busy}
                              onChange={(e) => setDate(e.target.value)}
                            />
                          </div>
                          <div className="nm-field">
                            <label htmlFor={`${ids}-time`} className="nm-label">
                              Time
                            </label>
                            <input
                              id={`${ids}-time`}
                              className="nm-input"
                              type="time"
                              value={time}
                              disabled={busy}
                              onChange={(e) => setTime(e.target.value)}
                            />
                          </div>
                        </>
                      ) : null}
                      <div className="nm-field">
                        <label htmlFor={`${ids}-len`} className="nm-label">
                          Length
                        </label>
                        <Dropdown
                          id={`${ids}-len`}
                          label="Length"
                          value={String(duration)}
                          disabled={busy}
                          icon={<Timer size={16} />}
                          options={lengths.map((d) => ({ value: String(d), label: lengthLabel(d) }))}
                          onChange={(v) => setDuration(Number(v))}
                        />
                      </div>
                      {when === "now" ? (
                        <p className="nm-now-note">
                          <VideoCamera size={16} aria-hidden="true" className="nm-now-icon" />
                          Opens the call as soon as you create it. Invite people now or share the link inside.
                        </p>
                      ) : null}
                    </div>
                  </section>

                  {/* Who: invitees with faces and search, the host, and what this follows up. */}
                  <section className="nm-sec nm-people" aria-labelledby={`${ids}-who`}>
                    <h3 id={`${ids}-who`} className="nm-sec-h">
                      <UsersThree size={16} aria-hidden="true" />
                      People
                      <span className="nm-count">
                        {invitees.length === 0 ? "Just you so far" : `You and ${invitees.length} invited`}
                      </span>
                    </h3>
                    <MemberPicker members={members} selected={invitees} onChange={setInvitees} disabled={busy} />
                    <div className="nm-pair">
                      <div className="nm-field">
                        <label htmlFor={`${ids}-host`} className="nm-label">
                          Host
                        </label>
                        <Dropdown
                          id={`${ids}-host`}
                          label="Host"
                          value={hostId}
                          disabled={busy}
                          icon={<Crown size={16} />}
                          describedBy={`${ids}-host-note`}
                          options={hostOptions}
                          onChange={setHostId}
                        />
                        <small id={`${ids}-host-note`} className="mh-new-hint">
                          The host runs the agenda and can end it for everyone.
                        </small>
                      </div>
                      <div className="nm-field">
                        <label htmlFor={`${ids}-prev`} className="nm-label">
                          Follow-up to <small className="mh-new-hint">Optional</small>
                        </label>
                        <Dropdown
                          id={`${ids}-prev`}
                          label="Follow-up to"
                          value={previousId}
                          disabled={recent.length === 0 || busy}
                          describedBy={`${ids}-prev-note`}
                          icon={<ArrowBendDownRight size={16} />}
                          options={followOptions}
                          onChange={setPreviousId}
                        />
                        <small id={`${ids}-prev-note`} className="mh-new-hint">
                          {recent.length === 0
                            ? "Meetings you have had show here."
                            : "Carries over what the earlier meeting left open."}
                        </small>
                      </div>
                    </div>
                  </section>

                  {/* The agenda: optional, drafted or typed. */}
                  <section className="nm-sec nm-agenda" aria-labelledby={`${ids}-ag`}>
                    <div className="nm-sec-row">
                      <h3 id={`${ids}-ag`} className="nm-sec-h">
                        <ListChecks size={16} aria-hidden="true" />
                        Agenda <small className="mh-new-hint">Optional, up to 20 items</small>
                      </h3>
                      <button
                        type="button"
                        className="mx-btn is-outline is-sm tap"
                        disabled={!canDraft || drafting || busy}
                        aria-describedby={`${ids}-draft-note`}
                        aria-busy={drafting || undefined}
                        onClick={() => void draft()}
                      >
                        <Sparkle size={16} aria-hidden="true" />
                        {drafting ? "Drafting..." : "Draft the agenda"}
                      </button>
                    </div>
                    <small id={`${ids}-draft-note`} className="mh-new-hint">
                      {canDraft
                        ? `From ${[template ? "the meeting type" : null, previousId ? "what the earlier meeting left open" : null]
                            .filter(Boolean)
                            .join(" and ")}. Nothing is saved until you create the meeting.`
                        : "Pick a meeting type or a meeting this follows up, and your Myte drafts it."}
                    </small>
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
                  </section>
                </div>
              </div>

              <footer className="nm-foot">
                <div className="nm-foot-text">
                  {error ? (
                    <p id={`${ids}-err`} className="nm-error" role="alert">
                      <WarningCircle size={16} weight="fill" aria-hidden="true" />
                      {error}
                    </p>
                  ) : (
                    <p className="nm-summary" aria-live="polite">
                      {summary}
                    </p>
                  )}
                </div>
                <div className="nm-foot-acts">
                  <button type="button" className="mx-btn is-ghost tap" onClick={close} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className="mx-btn tap nm-primary" disabled={busy} aria-busy={busy || undefined}>
                    {busy ? (
                      <span className="nm-spin" aria-hidden="true" />
                    ) : when === "now" ? (
                      <VideoCamera size={18} weight="fill" aria-hidden="true" />
                    ) : (
                      <CalendarCheck size={18} weight="fill" aria-hidden="true" />
                    )}
                    {busy ? (when === "now" ? "Starting..." : "Scheduling...") : when === "now" ? "Start now" : "Schedule"}
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** "Thu 13 Nov at 10:30" from the date and time inputs, or a nudge when they are not set. */
function scheduledLine(date: string, time: string): string {
  const d = new Date(`${date}T${time}`);
  if (!date || !time || Number.isNaN(d.getTime())) return "Pick a date and a time";
  const day = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const at = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} at ${at}`;
}
