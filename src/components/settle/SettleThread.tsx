"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Lightning } from "@phosphor-icons/react";
import { Chip } from "@/components/ui/Chip";
import type { Settlement } from "@/lib/api/why-blast-types";
import { dayLabel } from "@/lib/decision-why";
import { STATUS_CHIP, ownerName } from "@/lib/settlements";
import { SettleMessages } from "./SettleMessages";
import { SettleOutcomes } from "./SettleOutcomes";
import { SettleSides } from "./SettleSides";

/* A settle thread (My work, To settle): two confirmed decisions from different teams that may
   clash, owned by the viewer and one other person. Only those two can open it. The two decisions
   side by side with the agent's reason, then the conversation beside the three ways to settle it.
   Every write answers the whole thread, which replaces what is shown. */

export function SettleThread({ initial }: { initial: Settlement }) {
  const [s, setS] = useState(initial);
  useEffect(() => setS(initial), [initial]);
  const chip = STATUS_CHIP[s.status];

  return (
    <div>
      <Link
        href="/work/settle"
        className="mb-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-ctl px-1 text-[14px] font-semibold text-ink-3 hover:text-ink"
      >
        <ArrowLeft size={14} weight="bold" aria-hidden />
        All decisions to settle
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-[1_1_320px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="display text-[clamp(22px,2.4vw,26px)] text-ink-display">Two decisions may clash</h2>
            <Chip tone={chip.tone} icon={s.status === "open" ? <Lightning size={13} weight="bold" /> : <CheckCircle size={13} weight="fill" />}>
              {chip.label}
            </Chip>
          </div>
          <p className="mt-1 max-w-[75ch] text-[15px] text-ink-3">
            Opened {dayLabel(s.created_at)}. Only you and {ownerName(s.theirs)} can see this thread.
          </p>
        </div>
      </div>

      <section aria-label="The two decisions" className="rounded-card border border-line bg-surface px-4 py-[18px] shadow-warm-1 sm:px-[22px]">
        <SettleSides settlement={s} onChange={setS} />
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SettleMessages settlement={s} onChange={setS} />
        <SettleOutcomes settlement={s} onChange={setS} />
      </div>
    </div>
  );
}
