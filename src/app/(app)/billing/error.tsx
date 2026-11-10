"use client";

import { RouteError } from "@/components/settings/RouteError";

export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} what="billing" backHref="/settings" backLabel="Back to settings" />;
}
