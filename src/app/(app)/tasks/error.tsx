"use client";

import { RouteError } from "@/components/app/RouteError";

export default function TasksError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Tasks"
      title="Your tasks did not load"
      text="We could not reach the task service just now. Nothing was lost. Try again in a moment."
    />
  );
}
