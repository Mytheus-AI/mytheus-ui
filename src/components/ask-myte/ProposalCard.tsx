"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BookmarkSimple,
  CalendarBlank,
  CalendarPlus,
  ChatsCircle,
  Check,
  CheckSquare,
  Handshake,
  LinkSimple,
  ListPlus,
  NotionLogo,
  SlackLogo,
  Sparkle,
  UserPlus,
  ArrowSquareOut,
  FileText,
} from "@phosphor-icons/react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { Avatar } from "@/components/ui/Avatar";
import { Button, LinkButton } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dropdown } from "@/components/ui/Dropdown";
import { fieldClass, textareaClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { MemberPicker } from "@/components/meetings/MemberPicker";
// The member picker's look lives with the meetings screens (scoped under .mx-meet).
import "@/styles/meeting-hub.css";
import { confirmMyteProposal, type ConfirmOutcome } from "@/app/actions/myte-threads";
import { myteMembers, myteReach, type PickMember } from "@/app/actions/myte-v2";
import { notifyError, notifySuccess } from "@/lib/toast";
import { browserTimeZone } from "@/lib/timezone";
import { agentSeedFor } from "@/lib/realtime/agent-persona";
import { exportAvailability, type DestinationsLoad } from "@/lib/decision-reach";
import { CONFIRM_LABEL, DESTINATION_NAME, KIND_LABEL, inputsToIso, integrationFor, isoToInputs, proposalProblem, proposalSummary, slotWords } from "@/lib/ask-myte/proposals";
import type { Proposal } from "@/lib/ask-myte/reducer";
import type { AttendanceChoice, ExportDestination, PeerQuestion, ProposalEvent, ProposalKind } from "@/lib/ask-myte/types";
import { PeerQuestionCard } from "./PeerQuestionCard";

export { proposalSummary };

/* A Myte proposal (ADR-0047 D4, ADR-0049 F3): a dashed card that saves nothing until Confirm.
   Each kind shows what it will do in its own shape (a meeting with its time and faces, a Slack
   message as it will read, the teammate's Myte you are about to ask), Edit opens that kind's form,
   and Confirm calls the same server action the rest of the app uses for that write. A kind that
   needs a tool which is not connected says so and links to Settings. After a confirm the card
   shows what was made (the meeting, the share link with Copy, the export) and the Myte hops. */

const ICON: Record<ProposalKind, typeof Sparkle> = {
  task: CheckSquare,
  promise: Handshake,
  agenda_item: ListPlus,
  attendance: CalendarBlank,
  schedule_meeting: CalendarPlus,
  invite_people: UserPlus,
  slack_post: SlackLogo,
  export_decisions: FileText,
  share_decision: LinkSimple,
  ask_myte: ChatsCircle,
  memory: BookmarkSimple,
};

const NAMED_TOOL: Record<ExportDestination, string> = { notion: "Notion", confluence: "Confluence", slack: "Slack" };

type Done = { label: string; href: string | null; outcome?: ConfirmOutcome | null };

const labelCls = "mb-1 block text-[13px] font-semibold text-ink-3";

export function ProposalCard({
  proposal,
  onSettled,
  threadId = null,
  isAdmin = false,
  peer = null,
}: {
  proposal: Proposal;
  /** confirmed (with what was saved) or set aside, or brought back */
  onSettled: (status: Proposal["status"], edits?: Partial<ProposalEvent>) => void;
  /** the thread it belongs to (a peer question and a memory link back to it) */
  threadId?: string | null;
  isAdmin?: boolean;
  /** a confirmed ask_myte: the question as core-api has it now */
  peer?: PeerQuestion | null;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [draft, setDraft] = useState<ProposalEvent>(() => stripStatus(proposal));
  const [target, setTarget] = useState<string>("");
  const [reach, setReach] = useState<DestinationsLoad | null>(null);
  const id = useId();
  const tool = integrationFor(draft);

  // The tool this kind needs: is it connected, and where can it go.
  useEffect(() => {
    if (!tool || proposal.status !== "open") return;
    let live = true;
    setReach(null);
    void myteReach(tool).then((r) => {
      if (!live) return;
      setReach(r);
      if (r.kind === "live" && r.destinations[0] && tool !== "slack") setTarget((t) => t || r.destinations[0].id);
    });
    return () => {
      live = false;
    };
  }, [tool, proposal.status]);

  const availability = tool && reach ? exportAvailability(tool, reach, isAdmin) : null;
  const blocked = availability && !availability.enabled ? availability : null;
  const problem = proposalProblem(draft);
  const set = (patch: Partial<ProposalEvent>) => setDraft((d) => ({ ...d, ...patch }));

  const confirm = async () => {
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (draft.kind === "slack_post") {
      // No route posts to Slack for a person: copy the message, then they paste it.
      try {
        await navigator.clipboard.writeText(draft.text ?? "");
      } catch {
        setError("Your browser didn't let me copy it. Select the message and copy it yourself.");
        return;
      }
      setEditing(false);
      setDone({ label: "Message copied", href: null });
      notifySuccess("Message copied");
      onSettled("confirmed", { text: draft.text, channel: draft.channel });
      return;
    }
    setBusy(true);
    const res = await confirmMyteProposal(proposal, { ...diff(proposal, draft), target: target || null }, browserTimeZone(), threadId);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      notifyError(res.message);
      return;
    }
    setEditing(false);
    setDone({ label: res.done, href: res.href, outcome: res.outcome ?? null });
    notifySuccess(res.done);
    onSettled("confirmed", diff(proposal, draft));
  };

  /* ---------------- confirmed ---------------- */
  if (proposal.status === "confirmed") {
    const outcome = done?.outcome ?? null;
    if (proposal.kind === "ask_myte") {
      const q = outcome?.type === "peer" ? outcome.question : peer;
      if (q) return <PeerQuestionCard initial={q} />;
    }
    return <ConfirmedCard proposal={{ ...proposal, ...draft }} done={done} />;
  }

  if (proposal.status === "dismissed") {
    return (
      <div className="flex items-center gap-3 rounded-card border border-dashed border-line-2 px-4 py-2.5 text-[14px] text-ink-3">
        <span className="min-w-0 flex-1">Set aside: {proposalSummary(proposal)}</span>
        <Button size="sm" variant="ghost" onClick={() => onSettled("open")}>
          Show again
        </Button>
      </div>
    );
  }

  /* ---------------- open ---------------- */
  const Icon = ICON[proposal.kind] ?? Sparkle;
  const editable = proposal.kind !== "share_decision";
  const needsTarget = proposal.kind === "export_decisions" && draft.destination !== "slack";

  return (
    <section aria-labelledby={`${id}-k`} className="rounded-card border-[1.5px] border-dashed border-signal-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-signal-soft text-signal-ink">
          <Icon size={16} weight="bold" />
        </span>
        <p id={`${id}-k`} className="min-w-0 text-[13px] font-semibold text-signal-ink">
          <span className="sr-only">Myte suggests: </span>
          {KIND_LABEL[proposal.kind]}
        </p>
      </div>

      {editing ? (
        <form
          className="mt-4 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          <EditFields id={id} draft={draft} set={set} target={target} setTarget={setTarget} reach={reach} />
          {error ? (
            <p className="text-[14px] text-priority-high" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy || !!blocked}>
              {busy ? "Saving" : CONFIRM_LABEL[proposal.kind]}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-3">
            <Preview p={draft} target={target} reach={reach} />
          </div>
          {needsTarget && reach?.kind === "live" && reach.connected && reach.destinations.length > 0 ? (
            <div className="mt-3 max-w-[360px]">
              <span id={`${id}-dest-l`} className={labelCls}>
                {draft.destination === "notion" ? "Put it under" : "Put it in"}
              </span>
              <Dropdown
                labelledBy={`${id}-dest-l`}
                label={draft.destination === "notion" ? "Notion page" : "Confluence space"}
                value={target}
                onChange={setTarget}
                size="md"
                options={reach.destinations.map((d) => ({ value: d.id, label: d.name }))}
              />
            </div>
          ) : null}
          {blocked ? (
            <Note tone="warning" className="mt-3">
              <span>{blocked.message}</span>{" "}
              {blocked.reason === "not_connected" || blocked.reason === "not_configured" ? (
                <Link href="/settings/integrations" className="font-semibold underline underline-offset-4">
                  Open integrations
                </Link>
              ) : null}
            </Note>
          ) : null}
          {error ? (
            <p className="mt-2 text-[14px] text-priority-high" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void confirm()} disabled={busy || !!blocked || (tool !== null && tool !== "slack" && reach === null)}>
              {busy ? "Saving" : proposal.kind === "slack_post" ? "Copy message" : CONFIRM_LABEL[proposal.kind]}
            </Button>
            {editable ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={busy}>
                Edit
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => onSettled("dismissed")} disabled={busy}>
              Not now
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function stripStatus(p: Proposal): ProposalEvent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { status, ...rest } = p;
  return rest;
}

/** Only what Edit changed, so a confirm sends the person's words and nothing else. */
function diff(before: ProposalEvent, after: ProposalEvent): Partial<ProposalEvent> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(after)) if (JSON.stringify(v) !== JSON.stringify((before as unknown as Record<string, unknown>)[k])) out[k] = v;
  return out as Partial<ProposalEvent>;
}

/* ---------------- what each kind looks like ---------------- */

function Faces({ ids, names }: { ids: string[]; names: string[] }) {
  if (!ids.length) return null;
  const shown = ids.slice(0, 6);
  return (
    <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-2" aria-label="People">
      {shown.map((uid, i) => (
        <li key={uid} className="inline-flex items-center gap-1.5 text-[14px] text-ink-2">
          <Avatar name={names[i] || "Teammate"} id={uid} size="sm" />
          {names[i] || "A teammate"}
        </li>
      ))}
      {ids.length > shown.length ? <li className="self-center text-[14px] text-ink-3">and {ids.length - shown.length} more</li> : null}
    </ul>
  );
}

function Quote({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <blockquote className="rounded-ctl bg-surface-2 px-3.5 py-2.5 text-[15px] leading-relaxed text-ink">
      {label ? <span className="sr-only">{label}: </span> : null}
      {children}
    </blockquote>
  );
}

function Preview({ p, target, reach }: { p: ProposalEvent; target: string; reach: DestinationsLoad | null }) {
  switch (p.kind) {
    case "schedule_meeting": {
      const when = slotWords(p.start, p.end);
      return (
        <div>
          <p className="display text-[19px] leading-snug text-ink">{p.title}</p>
          {when ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[14px] text-ink-2">
              <CalendarBlank size={15} aria-hidden className="text-ink-3" />
              {when}
            </p>
          ) : null}
          <Faces ids={p.attendee_ids ?? []} names={p.attendee_names ?? []} />
          {p.note ? <p className="mt-2 text-[14px] text-ink-3">{p.note}</p> : null}
        </div>
      );
    }
    case "invite_people":
      return (
        <div>
          <p className="text-[15.5px] leading-snug text-ink">{proposalSummary(p)}</p>
          <Faces ids={p.user_ids ?? []} names={p.user_names ?? []} />
        </div>
      );
    case "slack_post":
      return (
        <div>
          <p className="text-[14px] font-semibold text-ink-2">{p.channel ? `To ${p.channel}` : "To a Slack channel you pick"}</p>
          <div className="mt-2">
            <Quote label="Message">
              <span className="whitespace-pre-line">{p.text}</span>
            </Quote>
          </div>
          <p className="mt-2 text-[13.5px] text-ink-3">Mytheus can&apos;t post as you yet. I&apos;ll copy it so you can paste it in Slack.</p>
        </div>
      );
    case "export_decisions": {
      const dest = p.destination ?? "notion";
      const DestIcon = dest === "notion" ? NotionLogo : dest === "slack" ? SlackLogo : FileText;
      const where = reach?.kind === "live" && reach.connected ? reach.destinations.find((d) => d.id === target)?.name : null;
      return (
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl border border-line bg-surface-2 text-ink">
            <DestIcon size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[15.5px] leading-snug text-ink">{proposalSummary(p)}</p>
            <p className="mt-0.5 text-[13.5px] text-ink-3">
              {dest === "slack" ? "Each decision record, with what it follows from, as a Slack message." : where ? `Into ${where}, with what each decision follows from.` : `As ${NAMED_TOOL[dest]} pages, with what each decision follows from.`}
            </p>
          </div>
        </div>
      );
    }
    case "share_decision":
      return (
        <div>
          <Quote label="Decision">{p.title.replace(/^Share:\s*/i, "")}</Quote>
          <p className="mt-2 text-[13.5px] text-ink-3">Anyone with the link can read this decision record, as you see it. You can turn the link off on the decision page.</p>
        </div>
      );
    case "ask_myte":
      return (
        <div className="flex items-start gap-3">
          <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
            <AgentOrb seed={agentSeedFor(null, p.person_id ?? "")} size={48} label={`${p.person_name || "Their"}'s Myte`} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-semibold leading-snug text-ink">{proposalSummary(p)}</p>
            <div className="mt-2">
              <Quote label="Question">{p.question}</Quote>
            </div>
            <p className="mt-2 text-[13.5px] text-ink-3">
              {(p.person_name || "They").split(/\s+/)[0]} reviews the answer before it is sent, and sees only your question.
            </p>
          </div>
        </div>
      );
    case "memory":
      return (
        <div>
          <Quote label="Remember">{p.text}</Quote>
          <p className="mt-2 text-[13.5px] text-ink-3">You can see and delete what I remember on Your Myte.</p>
        </div>
      );
    case "attendance":
      return (
        <>
          <p className="text-[15.5px] leading-snug text-ink">{proposalSummary(p)}</p>
          {p.note ? <p className="mt-1 text-[14px] text-ink-3">It will say: {p.note}</p> : null}
        </>
      );
    default:
      return <p className="text-[15.5px] leading-snug text-ink">{proposalSummary(p)}</p>;
  }
}

/* ---------------- each kind's Edit form ---------------- */

let membersCache: Promise<PickMember[] | null> | null = null;
function loadMembers() {
  membersCache ??= myteMembers().catch(() => null);
  return membersCache;
}

function useMembers(on: boolean) {
  const [members, setMembers] = useState<PickMember[] | null | undefined>(undefined);
  useEffect(() => {
    if (on) void loadMembers().then(setMembers);
  }, [on]);
  return members;
}

function EditFields({
  id,
  draft,
  set,
  target,
  setTarget,
  reach,
}: {
  id: string;
  draft: ProposalEvent;
  set: (p: Partial<ProposalEvent>) => void;
  target: string;
  setTarget: (v: string) => void;
  reach: DestinationsLoad | null;
}) {
  const people = draft.kind === "schedule_meeting" || draft.kind === "invite_people";
  const members = useMembers(people);
  const names = (ids: string[]) => ids.map((x) => members?.find((m) => m.id === x)?.name ?? "");

  switch (draft.kind) {
    case "schedule_meeting": {
      const s = isoToInputs(draft.start);
      const e = isoToInputs(draft.end);
      return (
        <>
          <div>
            <label htmlFor={`${id}-t`} className={labelCls}>
              Title
            </label>
            <input id={`${id}-t`} value={draft.title} maxLength={200} onChange={(ev) => set({ title: ev.target.value })} className={fieldClass} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`${id}-d`} className={labelCls}>
                Date
              </label>
              <input
                id={`${id}-d`}
                type="date"
                value={s.date}
                onChange={(ev) => set({ start: inputsToIso(ev.target.value, s.time || "09:00"), end: inputsToIso(ev.target.value, e.time || "09:30") })}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor={`${id}-s`} className={labelCls}>
                Starts
              </label>
              <input id={`${id}-s`} type="time" step={300} value={s.time} onChange={(ev) => set({ start: inputsToIso(s.date, ev.target.value) })} className={fieldClass} />
            </div>
            <div>
              <label htmlFor={`${id}-e`} className={labelCls}>
                Ends
              </label>
              <input id={`${id}-e`} type="time" step={300} value={e.time} onChange={(ev) => set({ end: inputsToIso(s.date || e.date, ev.target.value) })} className={fieldClass} />
            </div>
          </div>
          <div>
            <span className={labelCls}>Who to invite</span>
            {members === undefined ? (
              <p className="text-[14px] text-ink-3">Loading your workspace</p>
            ) : (
              <div className="mx-meet">
                <MemberPicker
                  members={members}
                  selected={draft.attendee_ids ?? []}
                  onChange={(ids) => set({ attendee_ids: ids, attendee_names: names(ids) })}
                  emptyHint="You'll be in it. Add anyone else who should be."
                />
              </div>
            )}
          </div>
        </>
      );
    }
    case "invite_people":
      return (
        <div>
          <span className={labelCls}>Who to add</span>
          {members === undefined ? (
            <p className="text-[14px] text-ink-3">Loading your workspace</p>
          ) : (
            <div className="mx-meet">
              <MemberPicker members={members} selected={draft.user_ids ?? []} onChange={(ids) => set({ user_ids: ids, user_names: names(ids) })} />
            </div>
          )}
        </div>
      );
    case "slack_post":
      return (
        <>
          <div>
            <label htmlFor={`${id}-c`} className={labelCls}>
              Channel (optional)
            </label>
            <input id={`${id}-c`} value={draft.channel ?? ""} placeholder="#general" maxLength={80} onChange={(ev) => set({ channel: ev.target.value || null })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor={`${id}-m`} className={labelCls}>
              Message
            </label>
            <textarea id={`${id}-m`} rows={5} maxLength={4000} value={draft.text ?? ""} onChange={(ev) => set({ text: ev.target.value })} className={textareaClass} />
          </div>
        </>
      );
    case "export_decisions":
      return (
        <>
          <div className="max-w-[360px]">
            <span id={`${id}-to`} className={labelCls}>
              Export to
            </span>
            <Dropdown
              labelledBy={`${id}-to`}
              label="Export to"
              size="lg"
              value={draft.destination ?? "notion"}
              onChange={(v) => {
                set({ destination: v as ExportDestination });
                setTarget("");
              }}
              options={(["notion", "confluence", "slack"] as const).map((d) => ({ value: d, label: DESTINATION_NAME[d] }))}
            />
          </div>
          {draft.destination === "slack" ? (
            <div>
              <label htmlFor={`${id}-ch`} className={labelCls}>
                Slack channel id (leave empty for a direct message to you)
              </label>
              <input id={`${id}-ch`} value={target} placeholder="C0123ABCD" onChange={(ev) => setTarget(ev.target.value)} className={fieldClass} />
            </div>
          ) : reach?.kind === "live" && reach.destinations.length ? (
            <div className="max-w-[360px]">
              <span id={`${id}-pg`} className={labelCls}>
                {draft.destination === "notion" ? "Put it under" : "Put it in"}
              </span>
              <Dropdown labelledBy={`${id}-pg`} label="Where it goes" size="lg" value={target} onChange={setTarget} options={reach.destinations.map((d) => ({ value: d.id, label: d.name }))} />
            </div>
          ) : null}
        </>
      );
    case "ask_myte":
      return (
        <div>
          <label htmlFor={`${id}-q`} className={labelCls}>
            Your question for {(draft.person_name || "their").split(/\s+/)[0]}&apos;s Myte
          </label>
          <textarea id={`${id}-q`} rows={3} maxLength={1000} value={draft.question ?? ""} onChange={(ev) => set({ question: ev.target.value })} className={textareaClass} />
        </div>
      );
    case "memory":
      return (
        <div>
          <label htmlFor={`${id}-r`} className={labelCls}>
            What I should remember
          </label>
          <textarea id={`${id}-r`} rows={2} maxLength={300} value={draft.text ?? ""} onChange={(ev) => set({ text: ev.target.value })} className={textareaClass} />
        </div>
      );
    case "attendance":
      return (
        <>
          <div>
            <span className={labelCls}>Who goes</span>
            <Dropdown
              label="Who goes"
              value={draft.choice ?? "agent"}
              onChange={(v) => set({ choice: v as AttendanceChoice })}
              options={[
                { value: "agent", label: "Send my Myte" },
                { value: "attend", label: "I'll attend myself" },
              ]}
            />
          </div>
          {draft.choice !== "attend" ? (
            <div>
              <label htmlFor={`${id}-n`} className={labelCls}>
                What your Myte should say for you
              </label>
              <textarea id={`${id}-n`} rows={3} maxLength={2000} value={draft.note ?? ""} onChange={(ev) => set({ note: ev.target.value })} className={textareaClass} />
            </div>
          ) : null}
        </>
      );
    default: {
      const hasDate = draft.kind === "task" || draft.kind === "promise";
      return (
        <>
          <div>
            <label htmlFor={`${id}-t`} className={labelCls}>
              Title
            </label>
            <input id={`${id}-t`} value={draft.title} maxLength={500} onChange={(ev) => set({ title: ev.target.value })} className={fieldClass} />
          </div>
          {hasDate ? (
            <div>
              <label htmlFor={`${id}-due`} className={labelCls}>
                Due date
              </label>
              <input id={`${id}-due`} type="date" value={draft.due_date?.slice(0, 10) ?? ""} onChange={(ev) => set({ due_date: ev.target.value || null })} className={`${fieldClass} sm:w-auto`} />
            </div>
          ) : null}
        </>
      );
    }
  }
}

/* ---------------- after Confirm ---------------- */

function ConfirmedCard({ proposal, done }: { proposal: ProposalEvent; done: Done | null }) {
  const outcome = done?.outcome ?? null;
  return (
    <div className="rounded-card border border-line bg-ok-soft px-4 py-3 text-[14px]" role="status">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Check size={16} weight="bold" aria-hidden className="text-ok" />
        <span className="min-w-0 flex-1 text-ink-2">
          <span className="font-semibold text-ink">{done?.label ?? "Done"}.</span> {proposalSummary(proposal)}
        </span>
        {outcome?.type === "meeting" ? (
          <LinkButton href={`/meetings/${outcome.id}`} size="sm" variant="outline">
            Open meeting
          </LinkButton>
        ) : proposal.kind === "slack_post" ? (
          <a href="https://app.slack.com/client" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-signal-ink underline-offset-4 hover:underline">
            Open Slack
            <ArrowSquareOut size={14} aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : done?.href ? (
          <Link href={done.href} className="font-semibold text-signal-ink underline-offset-4 hover:underline">
            {proposal.kind === "memory" ? "See what I remember" : "Open"}
          </Link>
        ) : null}
      </div>
      {outcome?.type === "share" ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`share-${proposal.id}`}>
            Share link
          </label>
          <input id={`share-${proposal.id}`} readOnly value={outcome.url} onFocus={(e) => e.currentTarget.select()} className={`${fieldClass} h-9 min-w-0 flex-1 text-[14px]`} />
          <CopyButton value={outcome.url} label="Copy link" />
        </div>
      ) : null}
      {outcome?.type === "exports" && outcome.urls.length ? (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {outcome.urls.slice(0, 5).map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-signal-ink underline-offset-4 hover:underline">
              {outcome.urls.length === 1 ? "Open the export" : `Open export ${i + 1}`}
              <ArrowSquareOut size={14} aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ))}
        </p>
      ) : null}
      {outcome?.type === "exports" && outcome.failed > 0 ? <p className="mt-1.5 text-ink-3">{outcome.failed} didn&apos;t go through. Try those from the decision page.</p> : null}
    </div>
  );
}
