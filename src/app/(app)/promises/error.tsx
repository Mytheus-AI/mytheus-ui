"use client";

import { RouteError } from "@/components/app/RouteError";

export default function PromisesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Promises"
      title="Your promises did not load"
      text="We could not reach the service that keeps them just now. Nothing was lost. Try again in a moment."
    />
  );
}
