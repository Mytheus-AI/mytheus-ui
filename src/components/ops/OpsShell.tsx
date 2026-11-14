import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, SignOut } from "@phosphor-icons/react/dist/ssr";
import { SignOutButton } from "@clerk/nextjs";
import { Wordmark } from "@/components/site/Wordmark";
import { buttonClass } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { OpsRowNav, OpsSideNav } from "@/components/ops/OpsNav";

/* The ops console's frame, rendered only once the staff gate has passed (or to say the console
   is unavailable, without its sections). From lg up a 256px sidebar on the stage holds the
   wordmark, the grouped sections, and the theme and Sign out at its foot; the content scrolls
   beside it. Below lg the sidebar becomes a header with the sections as a sideways row.

   A superadmin account belongs to no workspace and sees only this console (ADR-0046 D1), so
   there is no way "back to the app". */

function SignOutControl({ compact = false }: { compact?: boolean }) {
  return (
    <SignOutButton redirectUrl="/sign-in">
      <button type="button" className={buttonClass({ variant: compact ? "ghost" : "outline", size: "sm", icon: compact })} aria-label={compact ? "Sign out" : undefined}>
        <SignOut size={16} aria-hidden />
        {compact ? null : <span>Sign out</span>}
      </button>
    </SignOutButton>
  );
}

function Brand() {
  return (
    <Link href="/ops" className="group inline-flex min-h-10 shrink-0 items-center rounded-ctl" aria-label="Mytheus ops console">
      <Wordmark size={22} textClassName="text-[17px]" />
    </Link>
  );
}

export function OpsShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bg lg:flex">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>
        <p className="mx-5 mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3">
          <ShieldCheck size={16} weight="fill" aria-hidden className="text-ink-4" />
          Ops console, staff only
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">{nav ? <OpsSideNav /> : null}</div>
        <div className="border-t border-line px-5 py-4">
          <p className="mb-3 text-[12.5px] leading-snug text-ink-3">Every call here, reads included, is recorded in the ops audit log.</p>
          <div className="flex items-center justify-between gap-2">
            <SignOutControl />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-bg lg:hidden">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
            <Brand />
            <span className="ml-1 hidden items-center gap-1.5 text-[13px] font-semibold text-ink-3 min-[420px]:inline-flex">
              <ShieldCheck size={16} weight="fill" aria-hidden className="text-ink-4" />
              Ops console
            </span>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <SignOutControl compact />
            </div>
          </div>
          {nav ? <OpsRowNav /> : null}
        </header>
        <main id="admin-main" className="px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-9">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
