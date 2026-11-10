"use client";

import { RouteError } from "@/components/app/RouteError";

export default function StatusRequestsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Status requests"
      title="Your status requests did not load"
      text="We could not reach the meeting service just now. Nothing was lost. Try again in a moment."
    />
  );
}
