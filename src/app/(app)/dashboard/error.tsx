"use client";

import { RouteError } from "@/components/app/RouteError";

/* Home reads every panel with `apiSafe`, so a panel failure degrades in place. This catches the
   rest (the session or the page itself failing to render). */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Home"
      title="Your dashboard did not load"
      text="Your meetings, tasks and decisions are safe. This is a problem on our side. Try again in a moment."
    />
  );
}
