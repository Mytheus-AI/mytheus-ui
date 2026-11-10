"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

/* Renders inside the My work layout, under its title and tabs: the frayed-line error with Retry. */
export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState title="We could not load your tasks" onRetry={reset} digest={error.digest} />;
}
