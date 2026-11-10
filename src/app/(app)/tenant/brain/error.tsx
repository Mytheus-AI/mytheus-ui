"use client";

import { RouteError } from "@/components/settings/RouteError";

export default function BrainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} what="the company brain" backHref="/tenant" backLabel="Back to Workspace admin" />;
}
