"use client";

import { RouteError } from "@/components/app/RouteError";

export default function PersonError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Person"
      title="This profile did not load"
      text="We could not reach the people directory just now. Nothing was lost. Try again in a moment."
    />
  );
}
