"use client";

import { RouteError } from "@/components/app/RouteError";

export default function InboxError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Inbox"
      title="Your inbox did not load"
      text="Your notifications, updates and detections are safe. Try again in a moment."
    />
  );
}
