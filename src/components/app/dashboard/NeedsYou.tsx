"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckSquare, Scales, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { cardClass } from "@/components/ui/Card";
import { Chip, Count } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TextLink } from "@/components/ui/TextLink";
import { confirmCandidate, dismissCandidate } from "@/app/actions/candidates";
import { warnAfterAccept } from "@/components/promises/ledger/accept-warning";
import { graceful } from "@/lib/toast";
import type { DashboardReviewItem } from "@/lib/api/types";

/** The "Needs you" queue: `/bff/dashboard` `needs_review`, the decisions and tasks your Mytes
 *  detected in your meetings that nobody has confirmed or dismissed yet. Confirm is the only
 *  thing that commits (`core-api` writes the row and emits the event); Dismiss records nothing.
 *  Both go through the same Server Actions as the meeting room after a short grace period with
 *  Undo (the toast says "Decision confirmed"), and the page refreshes after so the header
 *  counts, tasks and decisions agree with what was just settled. The full queue, with the
 *  updates you owe and your notifications, is the Inbox.
 *  A proposed decision wears amber (needs attention), a proposed task blue (informs). */
export function NeedsYou({ items, failed }: { items: DashboardReviewItem[]; failed: boolean }) {
  const router = useRouter();
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const open = items.filter((i) => !settled.has(i.id));

  const act = (item: DashboardReviewItem, verb: "confirm" | "dismiss") => {
    const decision = item.kind === "decision";
    graceful({
      message: verb === "confirm" ? (decision ? "Decision confirmed" : "Task confirmed") : decision ? "Decision dismissed" : "Task dismissed",
      apply: () => setSettled((s) => new Set(s).add(item.id)),
      revert: () =>
        setSettled((s) => {
          const next = new Set(s);
          next.delete(item.id);
          return next;
        }),
      commit: async () => {
        const result = await (verb === "confirm" ? confirmCandidate : dismissCandidate)(item.kind, item.id);
        if (result.ok || result.gone) startTransition(() => router.refresh());
        // Promise ledger: a task you just took on, checked against your week.
        if (result.ok && verb === "confirm" && item.kind === "action") void warnAfterAccept(item.id, (href) => router.push(href));
        return result.ok ? { ok: true } : { ok: false, message: result.message, gone: result.gone };
      },
    });
  };

  return (
    <section aria-labelledby="needs-you-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id="needs-you-title" className="display flex items-center gap-2.5 text-[22px] text-ink-display">
          Needs you
          {!failed && open.length > 0 ? <Count n={open.length} label="waiting" tone="accent" /> : null}
        </h2>
        <TextLink href="/inbox?filter=review">Open in Inbox</TextLink>
      </div>
      <p className="-mt-2 mb-3 text-[14px] text-ink-3">Detected by your Mytes. Nothing is final until someone confirms.</p>

      {failed ? (
        <div className={cardClass({ flush: true, className: "pt-[18px]" })}>
          <ErrorState
            variant="inline"
            title="We could not load what is waiting for you"
            text="Nothing was lost. Your Mytes keep every detection until someone confirms or dismisses it."
          />
        </div>
      ) : open.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-live="polite">
          {open.map((item) => {
            const decision = item.kind === "decision";
            const Icon = decision ? Scales : CheckSquare;
            return (
              <li key={item.id}>
                <article className={cardClass()}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-ink-3">
                    <Chip tone={decision ? "medium" : "low"} icon={<Icon size={14} weight="fill" />}>
                      {decision ? "Proposed decision" : "Proposed task"}
                    </Chip>
                    <Link
                      href={`/meetings/${item.meeting_id}`}
                      className="min-w-0 truncate rounded-ctl underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      {item.meeting_title ?? "Untitled meeting"}
                    </Link>
                  </div>
                  <h3 className="mb-1 mt-2.5 max-w-[64ch] text-[17px] font-semibold leading-snug text-ink">{item.content}</h3>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => act(item, "confirm")}>
                      <Check size={15} weight="bold" aria-hidden />
                      {decision ? "Confirm decision" : "Confirm task"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => act(item, "dismiss")}>
                      <X size={15} aria-hidden />
                      Dismiss
                    </Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          art="done"
          title="You are all caught up"
          description="Decisions and tasks your Mytes detect in your meetings wait here until someone confirms or dismisses them."
        />
      )}
    </section>
  );
}
