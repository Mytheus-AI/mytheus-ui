"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

/* Reads the page again from the server (the figures are live, and each read is audited, so the
   page never polls on its own). The time beside it says when the figures were read. */
export function RefreshButton({ readAt }: { readAt: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] tabular-nums text-ink-3" aria-live="polite">
        {pending ? "Reading again" : `Read at ${readAt}`}
      </span>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => router.refresh())}>
        <ArrowClockwise size={16} aria-hidden className={pending ? "motion-safe:animate-spin" : undefined} />
        Refresh
      </Button>
    </div>
  );
}
