"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

/** Re-runs this route's server reads (`router.refresh()`), so a passing gateway failure recovers
 *  without a full reload. */
export function RetryRead() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="min-h-[40px]"
    >
      <ArrowClockwise size={14} weight="bold" aria-hidden className={pending ? "motion-safe:animate-spin" : ""} />
      {pending ? "Retrying" : "Retry"}
    </Button>
  );
}
