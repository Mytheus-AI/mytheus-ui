"use client";

import { RouteError } from "@/components/app/RouteError";

export default function DecisionsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Decisions"
      title="The decision log did not load"
      text="We could not reach the decision log just now. Nothing was lost. Try again in a moment."
    />
  );
}
