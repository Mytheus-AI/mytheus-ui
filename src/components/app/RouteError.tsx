"use client";

import { RouteErrorState } from "@/components/ui/ErrorState";

/* The whole-screen error for an (app) route's error.tsx: the shared frayed-line ErrorState with
   Retry (`reset` re-renders the segment) and a way home. Kept as a named wrapper so every
   error.tsx reads the same. */
export function RouteError({
  error,
  reset,
  page,
  title,
  text,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** the screen's name, shown as the page title */
  page: string;
  title: string;
  text: string;
}) {
  return <RouteErrorState error={error} reset={reset} page={page} title={title} text={text} />;
}
