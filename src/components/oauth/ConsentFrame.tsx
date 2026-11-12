import type { ReactNode } from "react";
import { Wordmark } from "@/components/site/Wordmark";
import { SignedInAs } from "./SignedInAs";

/* The focused frame around the consent page: no app shell (the person is between Claude and
   Mytheus and has one decision to make), the brand on the left, who is signed in on the right,
   the decision on the `--bg` stage. Under `.mx-app` so both themes apply (saved choice or the OS
   setting, set before paint). */
export function ConsentFrame({ children, email }: { children: ReactNode; email?: string | null }) {
  return (
    <div className="mx-app flex min-h-dvh flex-col bg-bg text-ink-2" suppressHydrationWarning>
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 pt-5 sm:px-8 sm:pt-6">
        <span aria-label="Mytheus" className="inline-flex">
          <Wordmark size={22} textClassName="text-[20px]" />
        </span>
        {email ? <SignedInAs email={email} /> : null}
      </header>
      <main id="main" className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-12 pt-6 sm:px-8 sm:pt-10">
        {children}
      </main>
    </div>
  );
}
