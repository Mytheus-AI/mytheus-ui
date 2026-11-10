"use client";

import { RouteError } from "@/components/app/RouteError";

export default function DigestError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Your weekly digest"
      title="Your digest did not load"
      text="Nothing was lost. Your decisions, tasks and promises are all still where they were. Try again in a moment."
    />
  );
}
