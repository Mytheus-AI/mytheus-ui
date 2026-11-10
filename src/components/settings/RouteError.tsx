"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { focusPill } from "./primitives";

/* The error boundary body for the settings, billing, org, workspace admin and platform screens.
   Says what failed in plain words, offers a retry (Next's `reset`) and a way out. The digest is
   logged for support; the message itself is never shown, since it can carry server detail. */
export function RouteError({
  error,
  reset,
  what,
  backHref = "/dashboard",
  backLabel = "Go to home",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** what could not be loaded, as a noun phrase: "your settings" */
  what: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl py-6" role="alert">
      <EmptyState
        className="!bg-surface"
        title={`We could not load ${what}`}
        description="Something went wrong reaching the workspace. Try again, and if it keeps happening, come back in a few minutes."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset} className={focusPill}>
              Try again
            </Button>
            <LinkButton href={backHref} variant="outline" className={focusPill}>
              {backLabel}
            </LinkButton>
          </div>
        }
      />
      {error.digest ? (
        <p className="mt-3 text-center text-[13px] text-ink-3">Reference {error.digest}</p>
      ) : null}
    </div>
  );
}
