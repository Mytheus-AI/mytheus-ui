"use client";

import { useState } from "react";
import { Minus, Plus, Lightning } from "@phosphor-icons/react";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { CREDIT_PACK_CENTS, CREDIT_PACK_TOKENS, dollars, tokensShort } from "@/lib/plans";

/* Extra AI credits on top of any plan: packs of 100,000 tokens, added to this month's allowance
   at once (a paused workspace resumes) and ending with the month. */
export function CreditsCard({ blocked, prefill }: { blocked: boolean; prefill?: { name?: string; email?: string } }) {
  const [packs, setPacks] = useState(1);
  const step = (d: number) => setPacks((p) => Math.min(50, Math.max(1, p + d)));
  return (
    <section
      aria-labelledby="credits-heading"
      className={`rounded-card border bg-surface p-5 sm:p-6 ${blocked ? "border-signal-line shadow-[0_0_0_1px_var(--signal-line),0_0_36px_-6px_var(--signal-glow)]" : "border-line"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-[52ch]">
          <h2 id="credits-heading" className="inline-flex items-center gap-2 text-[19px] font-semibold text-ink">
            <Lightning size={18} weight="fill" className="text-signal" aria-hidden />
            Extra AI credits
          </h2>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-3">
            {blocked
              ? "This month's allowance is used up, so AI is paused for everyone. Credits turn it back on straight away."
              : "Top up this month's allowance on any plan, without changing plans. Credits end with the month."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex h-11 items-center rounded-ctl border border-line-2 bg-bg-2" role="group" aria-label="Credit packs">
            <button type="button" onClick={() => step(-1)} disabled={packs <= 1} aria-label="One pack fewer" className="grid h-11 w-11 place-items-center text-ink-2 hover:text-ink disabled:opacity-40">
              <Minus size={15} aria-hidden />
            </button>
            <span className="min-w-[7.5rem] text-center text-[14.5px] tabular-nums text-ink" aria-live="polite">
              <span className="font-semibold">{tokensShort(packs * CREDIT_PACK_TOKENS)}</span> tokens
            </span>
            <button type="button" onClick={() => step(1)} disabled={packs >= 50} aria-label="One pack more" className="grid h-11 w-11 place-items-center text-ink-2 hover:text-ink disabled:opacity-40">
              <Plus size={15} aria-hidden />
            </button>
          </div>
          <CheckoutButton
            input={{ kind: "credits", packs }}
            prefill={prefill}
            successMessage={`${tokensShort(packs * CREDIT_PACK_TOKENS)} tokens added to this month`}
          >
            Buy for {dollars(packs * CREDIT_PACK_CENTS)}
          </CheckoutButton>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-4">
        {dollars(CREDIT_PACK_CENTS)} per {tokensShort(CREDIT_PACK_TOKENS)} tokens. Paid securely through Razorpay.
      </p>
    </section>
  );
}
