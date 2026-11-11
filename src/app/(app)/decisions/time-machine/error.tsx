"use client";

import { RouteError } from "@/components/app/RouteError";

export default function TimeMachineError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Time machine"
      title="The time machine did not load"
      text="We could not reach the record just now. Nothing was lost. Try again in a moment."
    />
  );
}
