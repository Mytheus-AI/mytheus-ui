"use client";

import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, SealCheck, Scales } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { confirmCandidate, dismissCandidate } from "@/app/actions/candidates";
import type { DashboardReviewItem } from "@/lib/api/types";

/** The "Needs you" queue: `/bff/dashboard` `needs_review`, the decisions and tasks your agents
 *  detected in your meetings that nobody has confirmed or dismissed yet. Confirm is the only
 *  thing that commits (`core-api` writes the row and emits the event); Dismiss records nothing.
 *  Both go through the same Server Actions as the meeting room, and the page refreshes after
 *  so the header counts, tasks and decisions agree with what was just settled. */
export function NeedsYou({
  items,
  failed,
  className,
  style,
}: {
  items: DashboardReviewItem[];
  failed: boolean;
  className?: string;
  style?: CSSProperties;
}) {
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
    <section aria-labelledby="needs-you-title" className={className} style={style}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="needs-you-title" className="display flex items-center gap-2.5 text-[24px] text-ink-display">
          Needs you
          {!failed && open.length > 0 ? (
            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-signal-soft px-2 text-[13px] font-semibold text-signal-deep">
              {open.length}
            </span>
          ) : null}
        </h2>
        <p className="text-[13.5px] text-ink-3">Detected by your agents. Nothing is final until someone confirms.</p>
      </div>

      {failed ? (
        <Card className="p-5">
          <p role="alert" className="text-[14px] text-ink-3">
            We could not load what is waiting for you. Nothing was lost; reload the page to try again.
          </p>
        </Card>
      ) : open.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {open.map((item) => {
            const Icon = item.kind === "decision" ? Scales : CheckSquare;
            return (
              <li key={item.id}>
                <Card className="p-0">
                  <article className="px-4 py-4 sm:px-[22px] sm:py-[18px]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-ink-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-2 px-2.5 py-1 font-semibold text-ink-2">
                        <Icon size={14} aria-hidden />
                        {item.kind === "decision" ? "Proposed decision" : "Proposed task"}
                      </span>
                      <Link href={`/meetings/${item.meeting_id}`} className="truncate hover:text-ink">
                        {item.meeting_title ?? "Untitled meeting"}
                      </Link>
                    </div>
                    <h3 className="mb-1 mt-2.5 text-[16px] font-semibold leading-snug text-ink">{item.content}</h3>
                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy !== null}
                        onClick={() => act(item, "confirm")}
                        className="min-h-[40px]"
                      >
                        {busy === item.id ? "Saving" : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => act(item, "dismiss")}
                        className="min-h-[40px]"
                      >
                        Dismiss
                      </Button>
                      {error?.id === item.id ? (
                        <span role="status" className="text-[13px] text-priority-high">
                          {error.message}
                        </span>
                      ) : null}
                    </div>
                  </article>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="p-0">
          <div className="px-6 pb-8 pt-6 text-center">
            <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-full bg-bg-2 text-ink-3">
              <SealCheck size={24} aria-hidden />
            </div>
            <h3 className="text-[16px] font-semibold text-ink">You are all caught up</h3>
            <p className="mx-auto mt-1.5 max-w-[40ch] text-[14px] text-ink-3">
              Decisions and tasks your agents detect in your meetings wait here until someone confirms or dismisses them.
            </p>
          </div>
        </Card>
      )}
    </section>
  );
}
