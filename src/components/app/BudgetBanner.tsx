"use client";

import { useEffect, useRef, useState } from "react";
import { Lightning, Warning, X } from "@phosphor-icons/react";
import { LinkButton } from "@/components/ui/Button";

/* The workspace's AI allowance, on every page (billing-metering-service `GET /billing/status`).

   - Used up: everyone sees that AI is paused, because every Myte stops answering and no new
     meeting starts. Admins get the way back on (credits or a bigger plan); members are told
     their admin can do it. Not dismissible: it is true on every page until it is fixed. It sits
     in the page's flow as a card, and publishes its height as `--ai-banner-h` so a page sized to
     the viewport (Ask Myte) shrinks by it instead of being cut off at the bottom.
   - 75%, 90% and 95%: admins only, matching the in-app alerts billing sends them. Each step can
     be dismissed for the browser session and comes back at the next step. */

const STEPS = [95, 90, 75] as const;

export function BudgetBanner({ blocked, percent, isAdmin }: { blocked: boolean; percent: number | null; isAdmin: boolean }) {
  const step = !blocked && isAdmin && percent !== null ? STEPS.find((s) => percent >= s) ?? null : null;
  const key = step ? `mytheus:budget-banner:${step}` : null;
  const [hidden, setHidden] = useState(true);
  const paused = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = paused.current;
    const root = document.documentElement;
    if (!blocked || !el) return;
    const set = () => root.style.setProperty("--ai-banner-h", `${Math.ceil(el.getBoundingClientRect().height) + 16}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--ai-banner-h");
    };
  }, [blocked]);

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
      <div ref={paused} role="alert" className="mb-4 rounded-card border border-line bg-priority-high-soft px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex min-w-0 items-start gap-2.5 text-[14px] leading-relaxed text-ink">
            <Lightning size={18} weight="fill" className="mt-0.5 shrink-0 text-priority-high" aria-hidden />
            <span className="min-w-0">
              <span className="font-semibold">AI is paused.</span> This workspace has used this month&rsquo;s AI allowance, so Mytes, Ask Myte,
              Talk and new meetings are off until it is topped up.
              {isAdmin ? null : " Your workspace admin can turn it back on."}
            </span>
          </p>
          {isAdmin ? (
            <LinkButton href="/workspace/billing/plans" size="sm" className="shrink-0 self-start sm:self-auto">
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
