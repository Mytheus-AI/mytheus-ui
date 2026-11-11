"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeSlash, ShareFat, Sparkle, UsersThree } from "@phosphor-icons/react";
import { shareSettleWording } from "@/app/actions/settlements";
import { Said } from "@/components/decision-why/AssumptionRow";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { Settlement, SettleSide } from "@/lib/api/why-blast-types";
import { dayLabel } from "@/lib/decision-why";
import { hiddenLine, ownerName, sideHref } from "@/lib/settlements";
import { notifyError, notifySuccess } from "@/lib/toast";

/* The two decisions, mine and theirs, side by side (stacked on a phone), and the agent's reason
   they may clash. Theirs keeps its wording hidden until its owner shares it; mine offers Share my
   wording when the other owner may not have been in my meeting. */

function sure(confidence: number): string {
  if (confidence >= 0.85) return "Your agent is fairly sure";
  if (confidence >= 0.7) return "Your agent thinks so, but is not certain";
  return "Your agent is unsure";
}

function Side({ side, label, settlement, onChange }: { side: SettleSide; label: string; settlement: Settlement; onChange: (s: Settlement) => void }) {
  const [busy, setBusy] = useState(false);
  const href = sideHref(side);
  const share = async () => {
    setBusy(true);
    const res = await shareSettleWording(settlement.id);
    setBusy(false);
    if (!res.ok) {
      notifyError(res.message);
      return;
    }
    notifySuccess("Wording shared", { description: `${ownerName(settlement.theirs)} can read your decision in this thread now.` });
    onChange(res.data);
  };

  return (
    <section aria-label={label} className={`min-w-0 rounded-card px-4 py-4 sm:px-5 ${side.mine ? "bg-surface-2" : "border border-line bg-surface"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-semibold text-ink-3">{label}</p>
        {side.team ? (
          <Chip tone="outline" icon={<UsersThree size={13} />}>
            {side.team}
          </Chip>
        ) : null}
        {side.mine && side.shared ? <Chip tone="ok">Shared in this thread</Chip> : null}
      </div>
      {side.visible && side.content ? (
        <>
          <p className="mt-2 text-[17px] font-semibold leading-snug text-ink">{side.content}</p>
          {side.quote ? <Said quote={side.quote} by={side.quote_speaker} className="mt-2.5" /> : null}
        </>
      ) : (
        <p className="mt-2 flex items-start gap-2 text-[15px] leading-snug text-ink-2">
          <EyeSlash size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
          {hiddenLine(side)}
        </p>
      )}
      <p className="mt-3 text-[13px] text-ink-3">
        {side.meeting_title ? (
          href ? (
            <Link href={href} className="font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:decoration-signal">
              {side.meeting_title}
            </Link>
          ) : (
            <span className="font-semibold text-ink-2">{side.meeting_title}</span>
          )
        ) : (
          "A meeting"
        )}
        {side.decided_at ? `, decided ${dayLabel(side.decided_at)}` : ""}
        {!side.mine && side.owner ? `, owned by ${side.owner.name}` : ""}
      </p>
      {side.mine && !side.shared && settlement.status === "open" ? (
        <div className="mt-3.5 border-t border-line pt-3.5">
          <p className="text-[14px] leading-snug text-ink-3">
            If {ownerName(settlement.theirs)} wasn&rsquo;t in your meeting, they only see that your decision exists.
          </p>
          <Button type="button" size="sm" variant="outline" className="mt-2.5" onClick={() => void share()} disabled={busy} aria-busy={busy}>
            <ShareFat size={15} aria-hidden />
            {busy ? "Sharing" : "Share my wording"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function SettleSides({ settlement, onChange }: { settlement: Settlement; onChange: (s: Settlement) => void }) {
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        <Side side={settlement.mine} label="Your decision" settlement={settlement} onChange={onChange} />
        <Side side={settlement.theirs} label={`${ownerName(settlement.theirs).replace(/^the/, "The")}'s decision`} settlement={settlement} onChange={onChange} />
      </div>
      {settlement.rationale ? (
        <p className="mt-4 flex max-w-[78ch] items-start gap-2 text-[15px] leading-relaxed text-ink-2">
          <Sparkle size={17} aria-hidden className="mt-0.5 shrink-0 text-signal" />
          <span>
            <span className="font-semibold text-ink">Why they may clash: </span>
            {settlement.rationale} <span className="text-ink-3">{sure(settlement.confidence)}.</span>
          </span>
        </p>
      ) : null}
    </div>
  );
}
