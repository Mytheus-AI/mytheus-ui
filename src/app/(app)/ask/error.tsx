"use client";

import { RouteError } from "@/components/app/RouteError";

/* Ask Myte reads its threads and starters with degrading reads, so this only catches the page
   itself failing to render. */
export default function AskError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="Ask Myte"
      title="Ask Myte did not load"
      text="Your chats are safe. This is a problem on our side. Try again in a moment."
    />
  );
}
