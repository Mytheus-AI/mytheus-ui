"use client";

import { useState } from "react";
import type { Interruption } from "@/lib/api/listening-types";
import { responseText } from "@/lib/listening";
import { AnswerButtons, AnswerOutcome, useInterruptionResponses, type Answer } from "./responses";

/* An interruption in the Inbox: the same three answers as the live toast while its meeting is
   live and nothing was answered yet; afterwards, what you did (or that the meeting ended). */

export function InboxInterruption({ interruption }: { interruption: Interruption | null }) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const r = useInterruptionResponses((_id, a) => setAnswer(a));
  if (!interruption) return null;
  const done = responseText(answer ?? interruption.response);
  return (
    <div className="mt-3">
      {interruption.quote ? (
        <blockquote className="mb-3 max-w-[75ch] rounded-ctl bg-bg-2 px-3.5 py-2.5 font-display text-[15px]  leading-snug text-ink-2">
          &ldquo;{interruption.quote}&rdquo;
        </blockquote>
      ) : null}
      {done ? (
        <AnswerOutcome text={done} />
      ) : interruption.can_respond ? (
        <AnswerButtons
          interruption={interruption}
          joining={r.joining === interruption.id}
          onJoin={() => void r.join(interruption)}
          onView={() => r.openView(interruption)}
          onHold={() => r.openHold(interruption)}
        />
      ) : (
        <p className="text-[13.5px] text-ink-3">{interruption.meeting_status === "live" ? "Answered." : "The meeting has ended. What happened is in your evening digest."}</p>
      )}
      {r.dialogs}
    </div>
  );
}
