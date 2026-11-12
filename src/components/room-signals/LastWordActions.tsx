"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChatCircleText, CheckCircle, Clock, Scales, X } from "@phosphor-icons/react";
import { dismissLastWord } from "@/app/actions/room-signals";
import { markAlertRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/Button";
import { textLinkClass } from "@/components/ui/TextLink";
import type { LastWordNudge, LateContribution, NudgeStatus } from "@/lib/api/room-signals-types";
import { clip, meetingClock, momentHref } from "@/lib/room-signals";
import { graceful, notifySuccess } from "@/lib/toast";
import { LateComposer } from "./LateComposer";

/* The last word, settled in place (Inbox row and the after page's "Your last word" card): your own
   partial words in the quiet serif voice, Go to the moment, then Add your point (the composer opens
   right here, Write or Record) or Nothing to add (shown at once, sent after the toast's grace
   period, so Undo never sends it). Once added it says so and links to where it sits; "Nothing to
   add" can be changed back by adding it anyway. */

export function LastWordActions({
  nudge,
  nudgeId,
  meetingId,
  notificationId,
  onContributed,
  showQuote = true,
}: {
  /** null when the nudge could not be read (the row still offers to add the point) */
  nudge: LastWordNudge | null;
  nudgeId: string;
  meetingId: string;
  notificationId?: string;
  onContributed?: (c: LateContribution) => void;
  showQuote?: boolean;
}) {
  const [status, setStatus] = useState<NudgeStatus>(nudge?.status ?? "open");
  const [composing, setComposing] = useState(false);
  const [gone, setGone] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);

  const closeComposer = () => {
    setComposing(false);
    window.requestAnimationFrame(() => addButton.current?.focus());
  };

  const nothingToAdd = () => {
    const before = status;
    graceful({
      message: "Nudge closed",
      apply: () => setStatus("dismissed"),
      revert: () => setStatus(before),
      commit: async () => {
        const res = await dismissLastWord(nudgeId);
        if (res.ok) {
          if (notificationId) void markAlertRead(notificationId);
          return { ok: true };
        }
        if (res.gone) {
          setGone(true);
          return { ok: true };
        }
        return { ok: false, message: res.message };
      },
    });
  };

  if (gone) {
    return (
      <p className="mt-3 text-[14px] text-ink-3" role="status">
        This nudge is no longer here. The meeting may have been removed.
      </p>
    );
  }

  const quote = showQuote && nudge?.quote ? clip(nudge.quote, 240) : null;
  const at = nudge?.at_ms ?? null;

  return (
    <div className="mt-2.5">
      {quote ? (
        <blockquote className="max-w-[75ch] rounded-ctl bg-bg-2 px-3.5 py-2.5 font-display text-[15px]  leading-snug text-ink-2">
          <span className="sr-only">What you started to say: </span>&ldquo;{quote}&rdquo;
        </blockquote>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3">
        <Link href={momentHref(meetingId, at)} className={textLinkClass}>
          <Clock size={13} aria-hidden />
          Go to the moment{at !== null ? ` at ${meetingClock(at)}` : ""}
        </Link>
        {nudge?.decision_id && nudge.decision_content ? (
          <Link href={`/meetings/${meetingId}/decisions/${nudge.decision_id}`} className={`${textLinkClass} min-w-0`}>
            <Scales size={13} aria-hidden />
            <span className="truncate">About: {clip(nudge.decision_content, 70)}</span>
          </Link>
        ) : null}
      </div>

      {status === "contributed" ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-ink-2" role="status">
          <CheckCircle size={17} weight="fill" className="text-ok" aria-hidden />
          Your point was added to the meeting.
          <Link href={`/meetings/${meetingId}#late`} className={textLinkClass}>
            See it
            <ArrowRight size={12} weight="bold" aria-hidden />
          </Link>
        </p>
      ) : composing ? (
        <div className="mt-3 max-w-[720px]">
          <LateComposer
            meetingId={meetingId}
            nudgeId={nudgeId}
            decisionId={nudge?.decision_id ?? null}
            atMs={at}
            onCancel={closeComposer}
            onSent={(c) => {
              setComposing(false);
              setStatus("contributed");
              if (notificationId) void markAlertRead(notificationId);
              notifySuccess("Point added", { description: "Everyone from the meeting can see it, and the host was told." });
              onContributed?.(c);
            }}
          />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button ref={addButton} size="sm" onClick={() => setComposing(true)}>
            <ChatCircleText size={15} aria-hidden />
            {status === "dismissed" ? "Add it anyway" : "Add your point"}
          </Button>
          {status === "open" ? (
            <Button size="sm" variant="ghost" onClick={nothingToAdd}>
              <X size={15} aria-hidden />
              Nothing to add
            </Button>
          ) : (
            <span className="text-[14px] text-ink-3" role="status">
              You said you had nothing to add.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
