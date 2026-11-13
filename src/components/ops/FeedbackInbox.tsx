"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cardClass } from "@/components/ui/Card";
import { Note } from "@/components/ui/Note";
import { markFeedback } from "@/app/actions/feedback";
import type { FeedbackStatus, OpsFeedback } from "@/lib/ops";

/* The staff feedback inbox (ADR-0046 D6): every bug report and piece of feedback members sent
   from Settings, newest first. Each can be marked seen or resolved, and the reporter's email is
   there to answer from. */

const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (iso: string) => (Number.isNaN(Date.parse(iso)) ? "" : when.format(new Date(iso)));
const TONE: Record<FeedbackStatus, ChipTone> = { new: "accent", seen: "low", resolved: "ok" };
const LABEL: Record<FeedbackStatus, string> = { new: "New", seen: "Seen", resolved: "Resolved" };

export function FeedbackInbox({ items }: { items: OpsFeedback[] }) {
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const mark = (id: string, status: FeedbackStatus) =>
    start(async () => {
      setBusyId(id);
      setError(null);
      const res = await markFeedback(id, status);
      setBusyId(null);
      if (!res.ok) setError(res.message);
      else router.refresh();
    });

  if (items.length === 0) {
    return (
      <section className={cardClass({ flush: true })}>
        <EmptyState inCard art="search" title="Nothing here" description="Reports members send from Settings, Report a bug, land here." />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Note tone="error">{error}</Note> : null}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((r) => {
          const status = (r.status in LABEL ? r.status : "new") as FeedbackStatus;
          const busy = pending && busyId === r.id;
          return (
            <li key={r.id} className={cardClass({ className: "flex flex-col gap-2.5" })}>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={r.kind === "bug" ? "medium" : "neutral"}>{r.kind === "bug" ? "Bug" : "Feedback"}</Chip>
                <Chip tone={TONE[status]}>{LABEL[status]}</Chip>
                <span className="text-[13px] tabular-nums text-ink-3">{fmt(r.created_at)}</span>
              </div>
              <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink">{r.message}</p>
              {r.page ? <p className="text-[13.5px] text-ink-3">Where: {r.page}</p> : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2.5">
                <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-ink-2">
                  <span className="font-semibold text-ink">{r.org_name ?? "A workspace"}</span>
                  <span className="text-ink-4" aria-hidden>
                    ·
                  </span>
                  <a href={`mailto:${r.reporter_email}`} className="truncate underline decoration-line-2 underline-offset-2 hover:text-ink">
                    {r.reporter_email || "no email"}
                  </a>
                  {r.reporter_email ? <CopyButton value={r.reporter_email} label="Copy email" size="sm" variant="ghost" /> : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {status !== "seen" ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => mark(r.id, "seen")}>
                      Mark seen
                    </Button>
                  ) : null}
                  {status !== "resolved" ? (
                    <Button size="sm" disabled={busy} onClick={() => mark(r.id, "resolved")}>
                      Resolve
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => mark(r.id, "new")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
