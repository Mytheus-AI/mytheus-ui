import { ChatCircleText, CheckCircle, Prohibit } from "@phosphor-icons/react/ssr";
import { Card, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { LocalStamp } from "@/components/digest/LocalStamp";
import { fetchDelegatedAnswerLog } from "@/lib/api/delegated-answers";
import type { DelegatedAnswerEntry } from "@/lib/api/only-mytheus-types";
import { logSummary } from "@/lib/delegated-answers";

/* "What my agent said" on a meeting's page after it ended (only-Mytheus wave, contract section 2),
   for the person who sent their agent: every question it was asked, who asked, the statement it
   answered from (or that it had none), and what it said. The log holds only your own agent's
   answers, so nobody else ever sees this. Server component. */

export async function WhatMyAgentSaid({ meetingId }: { meetingId: string }) {
  let items: DelegatedAnswerEntry[];
  try {
    const log = await fetchDelegatedAnswerLog(meetingId);
    items = Array.isArray(log?.items) ? log.items : [];
  } catch {
    return (
      <Card flush as="section" aria-labelledby="agent-said-h">
        <CardHead id="agent-said-h" title="What your agent said" />
        <ErrorState variant="inline" title="This did not load" text="What your agent answered is kept. Try again in a moment." />
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card as="section" tone="well" aria-labelledby="agent-said-h" className="!py-4">
        <h2 id="agent-said-h" className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <ChatCircleText size={17} aria-hidden className="text-ink-3" />
          What your agent said
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-3">Nobody asked your agent anything in this meeting.</p>
      </Card>
    );
  }

  return (
    <Card flush as="section" aria-labelledby="agent-said-h">
      <CardHead id="agent-said-h" title="What your agent said" caption={logSummary(items)} divided />
      <ol className="divide-y divide-line">
        {items.map((e) => (
          <li key={e.id} className="px-4 py-4 sm:px-[22px]">
            <p className="text-[12.5px] text-ink-3">
              {e.asked_by_name ? `${e.asked_by_name} asked` : "Someone asked"}
              {", "}
              <LocalStamp iso={e.created_at} mode="time" />
            </p>
            <h3 className="mt-0.5 max-w-[68ch] text-[15px] font-semibold leading-snug text-ink">{e.question}</h3>
            <blockquote className="mt-2 max-w-[68ch] rounded-ctl bg-bg-2 px-3.5 py-2.5 font-display text-[15px] italic leading-snug text-ink-2">
              {e.answer}
            </blockquote>
            <div className="mt-2 flex flex-wrap items-start gap-x-2.5 gap-y-1.5">
              {e.covered ? (
                <>
                  <Chip tone="ok" icon={<CheckCircle size={13} weight="fill" />}>
                    From your statement
                  </Chip>
                  {e.statement_text ? <span className="min-w-0 flex-[1_1_14rem] text-[14px] leading-snug text-ink-3">{e.statement_text}</span> : null}
                </>
              ) : (
                <Chip tone="medium" icon={<Prohibit size={13} weight="bold" />}>
                  Not pre-approved
                </Chip>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
