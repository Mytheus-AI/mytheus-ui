"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";

/** Ends the session on arrival, so a suspended workspace's member is really signed out. */
export function SuspendedSignOut() {
  const { signOut, loaded, session } = useClerk();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!session) {
      setDone(true);
      return;
    }
    void signOut({ redirectUrl: "/suspended" })
      .catch(() => {})
      .finally(() => setDone(true));
  }, [loaded, session, signOut]);

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <Link
        href="/sign-in"
        className="inline-flex h-12 items-center rounded-ctl bg-pill px-[22px] text-[16px] font-semibold text-pill-on transition-colors hover:bg-pill-2"
      >
        Back to sign in
      </Link>
      <p className="text-[13px] text-ink-4" aria-live="polite">
        {done ? "You have been signed out." : "Signing you out…"}
      </p>
    </div>
  );
}
