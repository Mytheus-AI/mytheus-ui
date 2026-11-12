"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowClockwise,
  ArrowRight,
  BookmarkSimple,
  ChatCircleText,
  ChatTeardropDots,
  Clock,
  LockSimple,
  Plus,
  Quotes,
  Scales,
  Trash,
} from "@phosphor-icons/react";
import { deleteLateContribution, loadAfterSignals } from "@/app/actions/room-signals";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { textLinkClass } from "@/components/ui/TextLink";
import { LocalWhen } from "@/components/status/LocalWhen";
import type { AfterSignals, AfterSignalsDecision, LateContribution, ResumePoint } from "@/lib/api/room-signals-types";
import type { SignalRead } from "@/lib/api/room-signals";
import {
  RESUME_REASON,
  SIGNAL_LABEL,
  clip,
  durationLabel,
  lateLabel,
  meetingClock,
  momentHref,
  nudgePrompt,
  resumeHeadline,
  strengthChip,
} from "@/lib/room-signals";
import { graceful } from "@/lib/toast";
import { LastWordActions } from "./LastWordActions";
import { LateComposer } from "./LateComposer";

/* After the meeting (a3 room signals), on an ended meeting's page, under the minutes:

   - Your last word (#last-word): private to you. If you started to say something and the room
     moved on, the nudge sits here with the same composer the Inbox has.
   - Late contributions (#late): every point added after the call, with its moment and decision;
     yours can be removed (with Undo). Anyone who was there can add one.
   - Decisions from this meeting: a Weak or Mixed agreement chip where the read says so, and
     "1 late contribution" while the decision is in its first 24 hours.
   - Saved for next time: the open thread the next meeting with these people will open with.

   The analysis lands a few minutes after the call ends; until it has, this says so and checks
   again on its own (every 15 s, for up to 5 minutes). */

const POLL_MS = 15_000;
const POLL_FOR_MS = 5 * 60_000;

export type DecisionLine = { id: string; content: string; status: string };

export function AfterSignalsSection({
  meetingId,
  initial,
  decisions,
  nowIso,
}: {
  meetingId: string;
  initial: SignalRead<AfterSignals>;
  /** the meeting's decisions (proposed and confirmed), for their wording */
  decisions: DecisionLine[];
  nowIso: string;
}) {
  const uid = useId();
  const [read, setRead] = useState(initial);
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const started = useRef(Date.now());
  const addButton = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    const next = await loadAfterSignals(meetingId);
    setChecking(false);
    setRead((prev) => (next.ok || !prev.ok ? next : prev));
  }, [meetingId]);

  const waiting = read.ok && !read.data.analyzed;
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => {
      if (Date.now() - started.current > POLL_FOR_MS) {
        window.clearInterval(id);
        return;
      }
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [waiting, refresh]);

  const addContribution = (c: LateContribution) =>
    setRead((prev) => {
      if (!prev.ok) return prev;
      const items = [c, ...prev.data.late_contributions.filter((x) => x.id !== c.id)];
      const decisionsNext = prev.data.decisions.map((d) =>
        c.decision_id && d.decision_id === c.decision_id ? { ...d, late_contribution_count: d.late_contribution_count + 1 } : d,
      );
      const nudge = prev.data.my_nudge && c.nudge_id === prev.data.my_nudge.id ? { ...prev.data.my_nudge, status: "contributed" as const } : prev.data.my_nudge;
      return { ok: true, data: { ...prev.data, late_contributions: items, decisions: decisionsNext, my_nudge: nudge } };
    });

  const remove = (c: LateContribution) =>
    graceful({
      message: "Contribution removed",
      apply: () => setHidden((h) => new Set(h).add(c.id)),
      revert: () =>
        setHidden((h) => {
          const n = new Set(h);
          n.delete(c.id);
          return n;
        }),
      commit: async () => {
        const res = await deleteLateContribution(c.id, meetingId);
        if (res.ok) void refresh();
        return res.ok ? { ok: true } : { ok: false, message: res.message };
      },
    });

  if (!read.ok) {
    if (read.reason === "none") return null;
    return (
      <section className="mx-card mx-card-pad" aria-labelledby={`${uid}-h`}>
        <h2 className="mx-card-title" id={`${uid}-h`}>
          After the meeting
        </h2>
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-ink-2">
          <p className="min-w-0 flex-1">
            <strong className="font-semibold text-ink">Late points and open threads could not be loaded.</strong> Nothing is lost; try
            again in a moment.
          </p>
          <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={checking}>
            <ArrowClockwise size={15} aria-hidden className={checking ? "motion-safe:animate-spin" : ""} />
            {checking ? "Retrying" : "Retry"}
          </Button>
        </div>
      </section>
    );
  }

  const data = read.data;
  const late = data.late_contributions.filter((c) => !hidden.has(c.id));
  const decisionText = new Map(decisions.map((d) => [d.id, d.content]));
  const flagged = data.decisions;

  return (
    <section className="mx-card mx-card-pad" aria-labelledby={`${uid}-h`} id="after">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 className="display text-[24px] leading-tight text-ink-display" id={`${uid}-h`}>
            After the meeting
          </h2>
          <p className="mt-1 max-w-[64ch] text-[14.5px] leading-relaxed text-ink-3">
            The meeting keeps working once the call ends: points people didn&rsquo;t get to make, how strongly the room agreed, and
            what to pick up next time.
          </p>
        </div>
        {waiting ? (
          <p className="max-w-[40ch] font-display text-[15px]  leading-snug text-ink-3" role="status">
            Your Myte is still reading the meeting. This updates by itself.
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {data.my_nudge ? (
            <div id="last-word" className="scroll-mt-24 rounded-ctl border border-line bg-surface-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-semibold text-ink">Your last word</h3>
                <Chip tone="accent" icon={<LockSimple size={12} />}>
                  Only you see this
                </Chip>
              </div>
              <p className="mt-1 text-[12.5px] font-semibold text-ink-3">{SIGNAL_LABEL[data.my_nudge.kind]}</p>
              <p className="mt-1 max-w-[70ch] text-[15px] font-medium leading-snug text-ink">{nudgePrompt(data.my_nudge)}</p>
              <LastWordActions
                key={data.my_nudge.id}
                nudge={data.my_nudge}
                nudgeId={data.my_nudge.id}
                meetingId={meetingId}
                onContributed={addContribution}
              />
            </div>
          ) : null}

          <div id="late" className="scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                <ChatTeardropDots size={18} aria-hidden />
                Late contributions
                {late.length > 0 ? <Chip className="tabular-nums">{late.length}</Chip> : null}
              </h3>
              {!adding ? (
                <Button ref={addButton} size="sm" variant="outline" onClick={() => setAdding(true)}>
                  <Plus size={15} aria-hidden />
                  Add a late point
                </Button>
              ) : null}
            </div>
            {adding ? (
              <div className="mt-3">
                <LateComposer
                  meetingId={meetingId}
                  onCancel={() => {
                    setAdding(false);
                    window.requestAnimationFrame(() => addButton.current?.focus());
                  }}
                  onSent={(c) => {
                    setAdding(false);
                    addContribution(c);
                  }}
                />
              </div>
            ) : null}
            {late.length === 0 ? (
              <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
                Nothing added since the call ended. If you didn&rsquo;t get to say something, add it here and the host hears about it.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-ctl border border-line">
                {late.map((c) => (
                  <LateItem key={c.id} c={c} meetingId={meetingId} decision={c.decision_id ? decisionText.get(c.decision_id) ?? null : null} nowIso={nowIso} onRemove={() => remove(c)} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <h3 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
              <Scales size={18} aria-hidden />
              Decisions from this meeting
            </h3>
            {flagged.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink-3">No decisions were recorded in this meeting.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {flagged.map((d) => (
                  <DecisionSignalRow key={d.decision_id} d={d} meetingId={meetingId} content={decisionText.get(d.decision_id) ?? "A decision from this meeting"} />
                ))}
              </ul>
            )}
          </div>
          {data.resume_point ? <SavedForNextTime point={data.resume_point} /> : null}
        </div>
      </div>
    </section>
  );
}

function LateItem({
  c,
  meetingId,
  decision,
  nowIso,
  onRemove,
}: {
  c: LateContribution;
  meetingId: string;
  decision: string | null;
  nowIso: string;
  onRemove: () => void;
}) {
  return (
    <li className="px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
        <span className="text-[14px] font-semibold text-ink">{c.mine ? "You" : c.author_name}</span>
        <LocalWhen iso={c.created_at} nowIso={nowIso} mode="past" />
        {c.at_ms !== null ? (
          <Link href={momentHref(meetingId, c.at_ms)} className={textLinkClass}>
            <Clock size={12} aria-hidden />
            At {meetingClock(c.at_ms)}
          </Link>
        ) : null}
        {c.decision_id && decision ? (
          <Link href={`/meetings/${meetingId}/decisions/${c.decision_id}`} className={`${textLinkClass} min-w-0`}>
            <Scales size={12} aria-hidden />
            <span className="truncate">{clip(decision, 60)}</span>
          </Link>
        ) : null}
        {c.mine ? (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={onRemove} aria-label="Remove your late contribution">
            <Trash size={14} aria-hidden />
            <span className="hidden sm:inline">Remove</span>
          </Button>
        ) : null}
      </div>
      {c.body ? <p className="mt-1.5 max-w-[75ch] whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{c.body}</p> : null}
      {c.has_audio ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <audio
            controls
            preload="none"
            src={`/api/late-contributions/${c.id}/audio`}
            className="w-full max-w-[380px]"
            aria-label={`${c.mine ? "Your" : `${c.author_name}'s`} recorded point${c.audio_duration_ms ? `, ${durationLabel(c.audio_duration_ms)}` : ""}`}
          >
            <track kind="captions" />
          </audio>
          {c.audio_duration_ms ? <span className="text-[12.5px] tabular-nums text-ink-3">{durationLabel(c.audio_duration_ms)}</span> : null}
        </div>
      ) : null}
    </li>
  );
}

export function DecisionSignalRow({ d, meetingId, content }: { d: AfterSignalsDecision; meetingId: string; content: string }) {
  const chip = strengthChip(d.agreement);
  return (
    <li>
      <Link
        href={`/meetings/${meetingId}/decisions/${d.decision_id}`}
        className="group flex items-start gap-3 rounded-ctl px-2.5 py-2 hover:bg-surface-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-medium leading-snug text-ink">{clip(content, 160)}</span>
          {chip || (d.in_window && d.late_contribution_count > 0) ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {chip ? (
                <Chip tone={chip.tone} title={chip.hint}>
                  {chip.label}
                </Chip>
              ) : null}
              {d.in_window && d.late_contribution_count > 0 ? (
                <Chip tone="accent" icon={<ChatCircleText size={13} />}>
                  {lateLabel(d.late_contribution_count)}
                </Chip>
              ) : null}
            </span>
          ) : null}
        </span>
        <ArrowRight size={15} className="mt-1 shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
      </Link>
    </li>
  );
}

function SavedForNextTime({ point }: { point: ResumePoint }) {
  const picked = point.status === "continued";
  return (
    <div className="rounded-ctl border border-line bg-bg-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
          <BookmarkSimple size={18} aria-hidden />
          Saved for next time
        </h3>
        <Chip tone={picked ? "ok" : "low"}>{picked ? "Picked up" : point.status === "dismissed" ? "Set aside" : RESUME_REASON[point.reason]}</Chip>
      </div>
      <p className="mt-2 font-display text-[18px] leading-snug text-ink">{resumeHeadline(point)}</p>
      {point.positions.length > 0 ? (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {point.positions.map((p, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-snug text-ink-2">
              <Quotes size={14} className="mt-0.5 shrink-0 text-ink-4" aria-hidden />
              <span>
                <span className="font-semibold text-ink">{p.name ?? "Someone"}:</span> {clip(p.quote, 180)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2.5 text-[13px] text-ink-3">
        {picked
          ? point.continued_in_meeting_id
            ? (
                <>
                  Picked up in{" "}
                  <Link href={`/meetings/${point.continued_in_meeting_id}`} className={textLinkClass}>
                    the next meeting
                  </Link>
                  .
                </>
              )
            : "Picked up in the next meeting."
          : point.status === "dismissed"
            ? "The host set this aside; it won't be pinned again."
            : "The next meeting with these people opens with this pinned, so you can start where you stopped."}
      </p>
    </div>
  );
}
