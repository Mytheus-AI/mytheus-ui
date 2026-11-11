"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { BellSimpleSlash, Robot } from "@phosphor-icons/react";
import { Card, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LocalWhen } from "@/components/status/LocalWhen";
import type { Interruption } from "@/lib/api/listening-types";
import { REASON_LABEL, heldReasonText, responseText } from "@/lib/listening";
import { AnswerButtons, AnswerOutcome, useInterruptionResponses, type Answer } from "./responses";

/* What your agent raised for you: every interruption, delivered or held. A delivered one whose
   meeting is still live keeps its three answers; anything else shows what happened. Held ones say
   why in plain words (quiet hours, a focus block, the hourly limit, interruptions off): they are
   in your evening digest instead. */

export function InterruptionList({ items: initial, nowIso, failed = false }: { items: Interruption[]; nowIso: string; failed?: boolean }) {
  const [items, setItems] = useState(initial);
  const answered = useCallback((id: string, answer: Answer) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, response: answer, can_respond: false } : i)));
  }, []);
  const r = useInterruptionResponses(answered);

  return (
    <Card as="section" flush aria-labelledby="raised-h">
      <CardHead id="raised-h" title="What your agent raised" description="Only what needed you. Everything held back is in your evening digest." divided />
      {failed ? (
        <p className="px-4 py-5 text-[14px] text-ink-3 sm:px-[22px]">This list did not load. Nothing was lost: it is all still in your Inbox.</p>
      ) : items.length === 0 ? (
        <div className="px-4 py-6 sm:px-[22px]">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <BellSimpleSlash size={18} className="text-ink-3" aria-hidden />
            Nothing yet
          </p>
          <p className="mt-1 max-w-[56ch] text-[14px] leading-relaxed text-ink-3">
            When your agent listens to a live meeting for you, it pulls you in only when a decision touches your topics, someone asks for you, or a
            promise is made on your behalf.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((i) => {
            const outcome = responseText(i.response);
            return (
              <li key={i.id} id={`interruption-${i.id}`} className="px-4 py-4 sm:px-[22px]">
                <div className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-ctl ${
                      i.status === "delivered" ? "bg-priority-high-soft text-priority-high" : "bg-bg-2 text-ink-3"
                    }`}
                  >
                    <Robot size={17} weight={i.status === "delivered" ? "fill" : "regular"} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-3">
                      {REASON_LABEL[i.reason]}
                      {i.status === "held" ? <Chip tone="outline">{heldReasonText(i.held_reason)}</Chip> : null}
                    </p>
                    <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-ink">{i.title}</h3>
                    {i.quote ? <p className="mt-1 font-display text-[14.5px] italic leading-snug text-ink-2">&ldquo;{i.quote}&rdquo;</p> : null}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-3">
                      <LocalWhen iso={i.created_at} nowIso={nowIso} mode="past" />
                      <Link href={`/meetings/${i.meeting_id}`} className="font-semibold text-ink-2 hover:underline">
                        {i.meeting_title}
                      </Link>
                      {i.moment_url ? (
                        <Link href={i.moment_url} className="font-semibold text-ink-2 hover:underline">
                          The moment
                        </Link>
                      ) : null}
                    </p>
                    <div className="mt-2.5">
                      {i.can_respond ? (
                        <AnswerButtons
                          interruption={i}
                          joining={r.joining === i.id}
                          onJoin={() => void r.join(i)}
                          onView={() => r.openView(i)}
                          onHold={() => r.openHold(i)}
                        />
                      ) : outcome ? (
                        <AnswerOutcome text={outcome} />
                      ) : i.meeting_status !== "live" ? (
                        <p className="text-[13.5px] text-ink-3">The meeting has ended.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {r.dialogs}
    </Card>
  );
}
