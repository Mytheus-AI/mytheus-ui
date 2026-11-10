"use client";

import { RouteError } from "@/components/app/RouteError";

export default function WelcomeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Welcome"
      title="Your welcome brief did not load"
      text="Nothing was lost. Try again in a moment."
    />
  );
}
