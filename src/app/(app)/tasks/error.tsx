"use client";

import { useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export default function TasksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1240px]">
      <div
        role="alert"
        className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-16 text-center"
      >
        <WarningCircle size={36} className="text-priority-high" aria-hidden />
        <h1 className="mt-4 text-[17px] font-semibold text-ink">Tasks did not load</h1>
        <p className="mt-2 max-w-sm text-[13.5px] text-ink-3">
          We could not reach the task service just now. Nothing was lost. Try again in a moment.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
