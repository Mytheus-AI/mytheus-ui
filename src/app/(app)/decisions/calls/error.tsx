"use client";

import { RouteError } from "@/components/app/RouteError";

export default function CallsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      page="How good are our calls"
      title="The record did not load"
      text="We could not reach the workspace's scored bets just now. Nothing was lost. Try again in a moment."
    />
  );
}
