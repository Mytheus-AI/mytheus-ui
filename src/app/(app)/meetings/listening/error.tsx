"use client";

import { RouteError } from "@/components/app/RouteError";

/* The Listening page reads each panel with `apiSafe`, so a panel failure degrades in place. This
   catches the rest (the session or the page itself failing to render). */
export default function ListeningError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Listening"
      title="Listening did not load"
      text="Your choices and rules are safe, and your agent keeps listening. Try again in a moment."
    />
  );
}
