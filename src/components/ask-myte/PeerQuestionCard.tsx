"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { Button } from "@/components/ui/Button";
import { getPeerQuestion, withdrawPeerQuestion } from "@/app/actions/myte-v2";
import { notifyError, notifySuccess } from "@/lib/toast";
import { agentSeedFor } from "@/lib/realtime/agent-persona";
import { PEER_POLL_MS, ago, askerStatus, firstName, peerMyteName } from "@/lib/ask-myte/peer";
import type { PeerQuestion } from "@/lib/ask-myte/types";

/* The asker's side of a question to a teammate's Myte (ADR-0049 F1): a card in the thread with
   that Myte's own plush, waiting until the teammate reviews and sends an answer. It checks again
   every 20 seconds while the page is visible and whenever the window regains focus, then turns
   into the answer signed by the teammate's Myte, or says it was declined (with the reason). While
   it waits, the asker can withdraw it. */

export function PeerQuestionCard({ initial, onChange }: { initial: PeerQuestion; onChange?: (q: PeerQuestion | null) => void }) {
  const [q, setQ] = useState(initial);
  const [checking, setChecking] = useState(false);
  const [gone, setGone] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => setQ(initial), [initial]);

  const refresh = useCallback(async () => {
    setChecking(true);
    const res = await getPeerQuestion(q.id);
    setChecking(false);
    setNow(Date.now());
    if (res.ok) {
      setQ(res.question);
      if (res.question.status !== q.status) onChange?.(res.question);
    } else if (res.status === 404) setGone(true);
  }, [q.id, q.status, onChange]);

  // Poll while waiting and visible; check once more on focus.
  useEffect(() => {
    if (q.status !== "pending" || gone) return;
    let timer: number | null = null;
    const arm = () => {
      if (timer) window.clearInterval(timer);
      timer = document.visibilityState === "visible" ? window.setInterval(() => void refresh(), PEER_POLL_MS) : null;
    };
    const onFocus = () => void refresh();
    const onVis = () => {
      arm();
      if (document.visibilityState === "visible") void refresh();
    };
    arm();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [q.status, gone, refresh]);

  const to = q.to_user;
  const myte = peerMyteName(to);
  const seed = agentSeedFor(to.agent_avatar_seed, to.id);
  const pending = q.status === "pending";

  if (gone) {
    return (
      <div className="rounded-card border border-dashed border-line-2 px-4 py-3 text-[14px] text-ink-3" role="status">
        The question to {myte} was withdrawn.
      </div>
    );
  }

  return (
    <section aria-label={`Question to ${myte}`} className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface-2 ring-1 ring-line">
          <span className="block h-14 w-14">
            <AgentOrb seed={seed} mode="live" state={pending ? "thinking" : q.status === "answered" ? "speaking" : "idle"} size={56} label={myte} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-tight">
            <span className="font-semibold text-ink">{myte}</span>
            {myte === `${firstName(to.name)}'s Myte` ? null : <span className="text-ink-3"> {firstName(to.name)}&apos;s Myte</span>}
          </p>
          <p className="mt-1 text-[13px] text-ink-3" aria-live="polite">
            {pending ? `Waiting for ${myte}` : q.status === "answered" ? `Answered ${q.answered_at ? ago(q.answered_at, now) : ""}` : "Declined"}
          </p>
          <blockquote className="mt-3 rounded-ctl bg-surface-2 px-3.5 py-2.5 text-[15px] leading-relaxed text-ink-2">
            <span className="sr-only">You asked: </span>
            {q.question}
          </blockquote>
        </div>
      </div>

      {q.status === "answered" && q.answer ? (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <p className="sr-only">{myte} answered:</p>
          <p className="whitespace-pre-line text-[16px] leading-[1.65] text-ink-2">{q.answer}</p>
          <p className="mt-3 text-[13px] text-ink-3">{askerStatus(q)}</p>
        </div>
      ) : q.status === "declined" ? (
        <div className="border-t border-line px-4 py-3.5 sm:px-5">
          <p className="text-[15px] text-ink-2">{askerStatus(q)}</p>
          {q.decline_reason ? <p className="mt-1 text-[14px] text-ink-3">&ldquo;{q.decline_reason}&rdquo;</p> : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line bg-surface-2 px-4 py-3 sm:px-5">
          <p className="min-w-0 flex-[1_1_16rem] text-[13.5px] leading-snug text-ink-3">{askerStatus(q)}</p>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={checking}>
              <ArrowClockwise size={15} aria-hidden className={checking ? "motion-safe:animate-spin" : ""} />
              {checking ? "Checking" : "Check now"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const res = await withdrawPeerQuestion(q.id);
                if (!res.ok) return notifyError(res.message);
                setGone(true);
                onChange?.(null);
                notifySuccess("Question withdrawn");
              }}
            >
              Withdraw
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
