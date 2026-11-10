"use client";

import { RouteError } from "@/components/app/RouteError";

export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} page="People" title="We could not load the people in your workspace" text="Nothing was lost. Try again in a moment." />;
}
