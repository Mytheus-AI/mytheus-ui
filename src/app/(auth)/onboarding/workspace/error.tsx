"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/* When the setup fails to render: say so, offer a retry, and never trap the admin; the brain is
   also reachable from Workspace admin later. */
export default function SetupError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg px-4">
      <div role="alert" className="w-full max-w-md rounded-hero border border-line bg-surface p-8 text-center shadow-warm-1">
        <h1 className="display text-[28px] text-ink">The setup did not load</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
          Your workspace is ready; only this page failed. Try again, or go on and fill in the company brain later from Workspace admin.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} className="focus-visible:!rounded-ctl">
            Try again
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-ctl border border-line-2 bg-surface px-[18px] text-[15px] font-semibold text-ink hover:bg-surface-2 focus-visible:!rounded-ctl"
          >
            Go to your dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
