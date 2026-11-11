"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";

/* Who is about to approve, and a way out when it is the wrong account: signing out comes back to
   this same consent page, which sends a signed-out visitor through sign-in and returns here. */
export function SignedInAs({ email }: { email: string }) {
  const clerk = useClerk();
  const [busy, setBusy] = useState(false);
  return (
    <p className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-[14px] text-ink-3">
      <span className="min-w-0 truncate">
        Signed in as <span className="font-semibold text-ink-2">{email}</span>
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void clerk.signOut({ redirectUrl: window.location.href });
        }}
        className="rounded-ctl px-1.5 py-1 font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-50"
      >
        {busy ? "Signing out" : "Not you? Sign out"}
      </button>
    </p>
  );
}
