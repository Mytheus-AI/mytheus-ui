"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

/** Re-runs the server fetches for this route. Real behaviour: `router.refresh()` re-renders the
 *  Server Component tree, so a transient gateway failure can recover without a full reload. */
export function RetryButton() {
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
      className="min-h-[40px] active:scale-[0.98]"
    >
      <ArrowClockwise
        size={14}
        weight="bold"
        aria-hidden
        className={pending ? "motion-safe:animate-spin" : ""}
      />
      {pending ? "Retrying" : "Retry"}
    </Button>
  );
}
