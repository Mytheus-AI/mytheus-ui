"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

/* Renders inside the Settings layout, under its title and tabs: the frayed-line error with Retry. */
export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState title="We could not load your settings" onRetry={reset} digest={error.digest} />;
}
