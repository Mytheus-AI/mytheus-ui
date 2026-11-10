"use client";

import { RouteError } from "@/components/app/RouteError";

export default function NotificationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Notifications"
      title="Your notifications did not load"
      text="We could not reach the notification service just now. Nothing was lost. Try again in a moment."
    />
  );
}
