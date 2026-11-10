"use client";

import { useEffect } from "react";
import { LinkButton } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";

/* When the setup fails to render: say so with the frayed-line error, offer a retry, and never trap
   the admin; the brain is also reachable from the Workspace console later. */
export default function SetupError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg px-4">
      <div className="w-full max-w-[560px]">
        <h1 className="sr-only">Company brain setup</h1>
        <ErrorState
          variant="page"
          title="The setup did not load"
          text="Your workspace is ready; only this page failed. Try again, or go on and fill in the company brain later from the Workspace console."
          onRetry={reset}
          digest={error.digest}
          action={
            <LinkButton href="/dashboard" variant="outline">
              Go to your dashboard
            </LinkButton>
          }
        />
      </div>
    </div>
  );
}
