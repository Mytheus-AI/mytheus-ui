"use client";

import { useEffect, useState } from "react";
import { Lightning, Warning, X } from "@phosphor-icons/react";
import { LinkButton } from "@/components/ui/Button";

/* The workspace's AI allowance, on every page (billing-metering-service `GET /billing/status`).

   - Used up: everyone sees that AI is paused, because every Myte stops answering. Admins get the
     way back on (credits or a bigger plan); members are told their admin can do it. Not
     dismissible: it is true on every page until it is fixed.
   - 75%, 90% and 95%: admins only, matching the in-app alerts billing sends them. Each step can
     be dismissed for the browser session and comes back at the next step. */

const STEPS = [95, 90, 75] as const;

export function BudgetBanner({ blocked, percent, isAdmin }: { blocked: boolean; percent: number | null; isAdmin: boolean }) {
  const step = !blocked && isAdmin && percent !== null ? STEPS.find((s) => percent >= s) ?? null : null;
  const key = step ? `mytheus:budget-banner:${step}` : null;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!key) return;
    try {
      setHidden(sessionStorage.getItem(key) === "1");
    } catch {
      setHidden(false);
    }
  }, [key]);

  if (blocked) {
    return (
      <div role="alert" className="sticky top-0 z-40 border-b border-line bg-priority-high-soft px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex min-w-0 items-center gap-2 text-[14px] text-ink">
            <Lightning size={18} weight="fill" className="shrink-0 text-priority-high" aria-hidden />
            <span>
              <span className="font-semibold">AI is paused.</span> This workspace has used this month&rsquo;s AI allowance, so Mytes, Ask
              and live notes are off. Captions and transcription continue.
              {isAdmin ? null : " Your workspace admin can turn it back on."}
            </span>
          </p>
          {isAdmin ? (
            <LinkButton href="/workspace/billing/plans" size="sm">
              Buy credits or upgrade
            </LinkButton>
          ) : null}
        </div>
      </div>
    );
  }

  if (!step || hidden) return null;
  return (
    <div role="status" className="border-b border-line bg-priority-medium-soft px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex min-w-0 items-center gap-2 text-[14px] text-ink">
          <Warning size={18} weight="fill" className="shrink-0 text-priority-medium" aria-hidden />
          <span>
            <span className="font-semibold">{step}% of this month&rsquo;s AI allowance is used.</span> AI pauses for everyone at 100%.
          </span>
        </p>
        <span className="flex items-center gap-2">
          <LinkButton href="/workspace/billing/plans" size="sm" variant="outline">
            Buy credits or upgrade
          </LinkButton>
          <button
            type="button"
            aria-label="Dismiss until the next warning"
            className="grid h-9 w-9 place-items-center rounded-ctl text-ink-3 hover:bg-bg-2 hover:text-ink"
            onClick={() => {
              setHidden(true);
              try {
                if (key) sessionStorage.setItem(key, "1");
              } catch {
                /* private mode: hidden for this page only */
              }
            }}
          >
            <X size={16} aria-hidden />
          </button>
        </span>
      </div>
    </div>
  );
}
