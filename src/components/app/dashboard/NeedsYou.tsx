"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckSquare, Scales, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { confirmCandidate, dismissCandidate } from "@/app/actions/candidates";
import type { DashboardReviewItem } from "@/lib/api/types";
import { RetryButton } from "./RetryButton";

/** The "Needs you" queue: `/bff/dashboard` `needs_review`, the decisions and tasks your agents
 *  detected in your meetings that nobody has confirmed or dismissed yet. Confirm is the only
 *  thing that commits (`core-api` writes the row and emits the event); Dismiss records nothing.
 *  Both go through the same Server Actions as the meeting room, and the page refreshes after
 *  so the header counts, tasks and decisions agree with what was just settled.
 *  A proposed decision wears amber (needs attention), a proposed task blue (informs). */
export function NeedsYou({ items, failed }: { items: DashboardReviewItem[]; failed: boolean }) {
  const router = useRouter();
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();
  const open = items.filter((i) => !settled.has(i.id));

  const act = async (item: DashboardReviewItem, verb: "confirm" | "dismiss") => {
    setBusy(item.id);
    setError(null);
    const result = await (verb === "confirm" ? confirmCandidate : dismissCandidate)(item.kind, item.id);
    setBusy(null);
    if (result.ok || result.gone) {
      setSettled((s) => new Set(s).add(item.id));
      startTransition(() => router.refresh());
    }
    if (!result.ok) setError({ id: item.id, message: result.message });
  };

  return (
    <section aria-labelledby="needs-you-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="needs-you-title" className="display flex items-center gap-2.5 text-[24px] text-ink-display">
          Needs you
          {!failed && open.length > 0 ? (
            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-signal-soft px-2 font-sans text-[13px] font-semibold text-signal-ink">
              {open.length}
            </span>
          ) : null}
        </h2>
        <p className="text-[14px] text-ink-3">Detected by your agents. Nothing is final until someone confirms.</p>
      </div>

      {failed ? (
        <div role="alert" className="flex items-start gap-3.5 rounded-card border border-line bg-surface p-5 shadow-warm-1">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink">We could not load what is waiting for you</h3>
            <p className="mb-3.5 mt-1 max-w-[52ch] text-[14px] text-ink-3">
              Nothing was lost. Your agents keep every detection until someone confirms or dismisses it.
            </p>
            <RetryButton />
          </div>
        </div>
      ) : open.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-live="polite">
          {open.map((item) => {
            const decision = item.kind === "decision";
            const Icon = decision ? Scales : CheckSquare;
            return (
              <li key={item.id}>
                <article className="rounded-card border border-line bg-surface px-4 py-4 shadow-warm-1 transition-shadow duration-150 hover:shadow-warm-2 sm:px-[22px] sm:py-[18px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold ${
                        decision
                          ? "bg-priority-medium-soft text-priority-medium"
                          : "bg-priority-low-soft text-priority-low"
                      }`}
                    >
                      <Icon size={14} weight="fill" aria-hidden />
                      {decision ? "Proposed decision" : "Proposed task"}
                    </span>
                    <Link
                      href={`/meetings/${item.meeting_id}`}
                      className="min-w-0 truncate rounded-ctl underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      {item.meeting_title ?? "Untitled meeting"}
                    </Link>
                  </div>
                  <h3 className="mb-1 mt-2.5 max-w-[64ch] text-[16.5px] font-semibold leading-snug text-ink">
                    {item.content}
                  </h3>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busy !== null}
                      aria-busy={busy === item.id}
                      onClick={() => act(item, "confirm")}
                      className="min-h-[40px]"
                    >
                      <Check size={15} weight="bold" aria-hidden />
                      {busy === item.id ? "Saving" : decision ? "Confirm decision" : "Confirm task"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy !== null}
                      onClick={() => act(item, "dismiss")}
                      className="min-h-[40px]"
                    >
                      <X size={15} aria-hidden />
                      Dismiss
                    </Button>
                    {error?.id === item.id ? (
                      <span role="status" className="text-[13.5px] font-medium text-priority-high">
                        {error.message}
                      </span>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="You are all caught up"
          description="Decisions and tasks your agents detect in your meetings wait here until someone confirms or dismisses them."
        />
      )}
    </section>
  );
}
