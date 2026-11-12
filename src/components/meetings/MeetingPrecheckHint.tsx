"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowSquareOut, ChatCircleDots, CheckCircle, Gavel, Lightbulb, VideoCamera, X } from "@phosphor-icons/react";
import { askForStatusInstead } from "@/app/actions/meeting-precheck";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { MeetingPrecheck } from "@/lib/api/only-mytheus-types";
import {
  PRECHECK_DEBOUNCE_MS,
  askableActions,
  askedSummary,
  changedMeaningfully,
  hasHints,
  precheckSignature,
  shortDate,
  shouldPrecheck,
} from "@/lib/meeting-precheck";
import { notifyError, notifySuccess } from "@/lib/toast";

/* "Should this be a meeting?" inside the new-meeting dialog (only-Mytheus wave, contract section
   3). As you type the title and agenda, your Myte quietly checks, about 700 ms after you stop:
   whether this was already decided, whether some agenda items are only status updates (one button
   asks their owners for a status instead), and which recent meetings covered it.

   It never blocks and is never a dialog of its own: a calm panel you can hide, which stays hidden
   until the text changes meaningfully. While a check runs, the panel already on screen dims a
   little instead of a spinner appearing; a failed check is one quiet line. Links open in a new
   tab so the meeting you are drafting is not lost. New hints are announced politely. */

type Result = MeetingPrecheck & { degraded?: boolean };
type Asked = { title: string; detail: string | null };

export function MeetingPrecheckHint({
  title,
  agenda,
  participantIds,
}: {
  title: string;
  agenda: string[];
  participantIds: string[];
}) {
  const signature = useMemo(() => precheckSignature(title, agenda), [title, agenda]);
  const eligible = shouldPrecheck(title, agenda);
  const cache = useRef(new Map<string, Result>());
  const inflight = useRef<AbortController | null>(null);
  const latest = useRef({ title, agenda, participantIds });
  latest.current = { title, agenda, participantIds };

  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState<Record<string, Asked>>({});

  useEffect(() => {
    // Whatever was in flight answers text that no longer exists.
    const stale = inflight.current;
    inflight.current = null;
    stale?.abort();
    if (!eligible) {
      setChecking(false);
      setFailed(false);
      setResult(null);
      return;
    }
    const hit = cache.current.get(signature);
    if (hit) {
      setChecking(false);
      setFailed(false);
      setResult(hit);
      return;
    }
    setChecking(true);
    const timer = window.setTimeout(async () => {
      const ctl = new AbortController();
      inflight.current = ctl;
      try {
        const { title: t, agenda: a, participantIds: p } = latest.current;
        const res = await fetch("/api/meeting-precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t, agenda: a, participant_ids: p }),
          signal: ctl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as Result;
        if (inflight.current !== ctl) return;
        if (!body.degraded) cache.current.set(signature, body);
        setFailed(Boolean(body.degraded));
        setResult(body);
      } catch {
        if (inflight.current === ctl) setFailed(true);
      } finally {
        if (inflight.current === ctl) {
          inflight.current = null;
          setChecking(false);
        }
      }
    }, PRECHECK_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [signature, eligible]);

  useEffect(() => () => inflight.current?.abort(), []);

  const hidden = dismissed !== null && !changedMeaningfully(dismissed, signature);
  useEffect(() => {
    // Text that changed enough brings hints back for good.
    if (dismissed !== null && changedMeaningfully(dismissed, signature)) setDismissed(null);
  }, [dismissed, signature]);

  const show = eligible && !hidden && hasHints(result);
  const askable = result ? askableActions(result) : [];
  const askKey = askable.map((a) => a.id).join(",");
  const done = asked[askKey];

  const ask = async () => {
    if (asking || askable.length === 0) return;
    setAsking(true);
    const res = await askForStatusInstead(askable.map((a) => a.id));
    setAsking(false);
    if (!res.ok) {
      notifyError(res.message, { retry: () => void ask() });
      return;
    }
    const summary = askedSummary(res.asked);
    setAsked((m) => ({ ...m, [askKey]: summary }));
    if (res.asked.requested > 0) notifySuccess(summary.title, { description: summary.detail ?? undefined });
  };

  const now = new Date();
  const statusCount = askable.length;
  const live = show && result ? liveSummary(result, statusCount) : "";

  // `contents`: in the dialog's flex column the hint takes no gap at all until it has something
  // to show (the live line is absolutely positioned, so it is out of the flow).
  return (
    <div className="contents">
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      {show && result ? (
        <section
          aria-labelledby="precheck-h"
          aria-busy={checking}
          className={`rounded-card border border-line bg-surface-2 transition-opacity duration-200 ease-[var(--ease-out)] motion-reduce:transition-none ${
            checking ? "opacity-70" : "opacity-100"
          }`}
        >
          <div className="flex items-start gap-3 px-4 pb-1 pt-3.5">
            <span aria-hidden className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-ctl bg-signal-soft text-signal-ink">
              <Lightbulb size={17} weight="fill" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="precheck-h" className="text-[15px] font-semibold leading-snug text-ink">
                Before you schedule it
              </h3>
              <p className="font-display text-[14px]  leading-snug text-ink-3">Your Myte checked what the team already has</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon
              aria-label="Hide these hints"
              onClick={() => setDismissed(signature)}
            >
              <X size={15} weight="bold" aria-hidden />
            </Button>
          </div>

          <div className="divide-y divide-line px-4">
            {result.already_decided.slice(0, 3).map((d) => (
              <div key={d.decision_id} className="py-3">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
                  <Gavel size={15} aria-hidden className="text-ink-3" />
                  This was already decided on {shortDate(d.decided_at, now)}
                  {d.superseded_by ? <Chip tone="medium">Changed later</Chip> : null}
                </p>
                <blockquote className="mt-1.5 rounded-ctl bg-surface px-3 py-2 font-display text-[15px]  leading-snug text-ink-2">
                  {d.content}
                </blockquote>
                <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                  <NewTabLink href={`/meetings/${d.meeting_id}/decisions/${d.decision_id}`}>See the decision</NewTabLink>
                  <NewTabLink href={`/meetings/${d.meeting_id}`}>{d.meeting_title || "The meeting it came from"}</NewTabLink>
                </p>
              </div>
            ))}

            {statusCount > 0 ? (
              <div className="py-3">
                <p className="flex items-start gap-2 text-[14px] font-semibold leading-snug text-ink">
                  <ChatCircleDots size={15} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
                  <span>
                    {statusCount} of these {statusCount === 1 ? "items is a status update" : "items are status updates"}: send
                    {statusCount === 1 ? " a status request" : " status requests"} instead
                  </span>
                </p>
                <ul className="mt-1.5 space-y-0.5 pl-[23px] text-[14px] leading-snug text-ink-3">
                  {askable.map((a) => (
                    <li key={a.id}>
                      {a.ownerName ? <span className="font-semibold text-ink-2">{a.ownerName}: </span> : null}
                      {a.text}
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 pl-[23px]">
                  {done ? (
                    <p className="flex flex-wrap items-start gap-x-2 gap-y-1 text-[14px] leading-snug" role="status">
                      <CheckCircle size={16} weight="fill" aria-hidden className="mt-px shrink-0 text-ok" />
                      <span className="font-semibold text-ink">{done.title}</span>
                      {done.detail ? <span className="w-full text-ink-3">{done.detail}</span> : null}
                    </p>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled={asking} aria-busy={asking} onClick={() => void ask()}>
                      <ChatCircleDots size={15} aria-hidden />
                      {asking ? "Sending" : statusCount === 1 ? "Send a status request" : `Send ${statusCount} status requests`}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            {result.recent_meetings.length > 0 ? (
              <div className="py-3">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <VideoCamera size={15} aria-hidden className="text-ink-3" />
                  Recent meetings on this
                </p>
                <ul className="mt-1 space-y-0.5 pl-[23px] text-[14px]">
                  {result.recent_meetings.slice(0, 3).map((m) => (
                    <li key={m.meeting_id} className="flex flex-wrap items-baseline gap-x-2">
                      <NewTabLink href={`/meetings/${m.meeting_id}`}>{m.title || "Untitled meeting"}</NewTabLink>
                      <span className="text-[12.5px] text-ink-3">{shortDate(m.when, now)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <p className="px-4 pb-3.5 pt-1 text-[12.5px] text-ink-3">Only a hint. You can still create the meeting as it is.</p>
        </section>
      ) : eligible && failed && !hidden ? (
        <p className="text-[12.5px] text-ink-3">Couldn&rsquo;t check for earlier decisions just now. You can still create the meeting.</p>
      ) : null}
    </div>
  );
}

function NewTabLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[32px] items-center gap-1 rounded-ctl font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal"
    >
      {children}
      <ArrowSquareOut size={13} aria-hidden className="shrink-0 text-ink-3" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** One sentence for screen readers when hints appear or change. */
function liveSummary(r: MeetingPrecheck, statusCount: number): string {
  const parts: string[] = [];
  if (r.already_decided.length > 0) parts.push("this may already be decided");
  if (statusCount > 0) parts.push(`${statusCount} agenda ${statusCount === 1 ? "item looks" : "items look"} like status updates`);
  if (r.recent_meetings.length > 0) parts.push("recent meetings covered it");
  return parts.length ? `Hint from your Myte: ${parts.join(", ")}.` : "";
}
