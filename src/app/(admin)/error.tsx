"use client";

import { RouteErrorState } from "@/components/ui/ErrorState";

export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      page="Ops console"
      title="We could not load this console"
      text="Something went wrong reaching the platform. Nothing was changed."
      backHref="/ops"
      backLabel="Go to the ops console"
    />
  );
}
