"use client";

import { RouteError } from "@/components/app/RouteError";

/* Ask reports a failed answer inside the page; this only catches the page itself failing. */
export default function AskError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Ask Mytheus"
      title="Ask did not load"
      text="Something went wrong opening this page. Your meetings and sources are safe. Try again in a moment."
    />
  );
}
