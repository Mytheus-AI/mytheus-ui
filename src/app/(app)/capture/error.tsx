"use client";

import { RouteError } from "@/components/app/RouteError";

export default function CaptureError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Capture"
      title="Capture did not load"
      text="We could not reach the service that lists your meetings just now. Nothing was lost. Try again in a moment."
    />
  );
}
