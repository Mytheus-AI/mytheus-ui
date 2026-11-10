"use client";

import { RouteError } from "@/components/settings/RouteError";

export default function WelcomeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} what="your welcome brief" />;
}
