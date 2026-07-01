import Link from "next/link";
import type { ReactNode } from "react";
import { OutlinePill } from "@/components/landing/ui";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LogoMark } from "@/components/Logo";

/* Shared chrome for every secondary marketing / legal page: a lean sticky
   wordmark header (links home + Log in + Get started) and the shared footer.
   Server component — content pages compose <PageShell> + <PageHero> + sections. */

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-ink-2">
      <header className="sticky top-0 z-50 border-b border-line/70 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1340px] items-center justify-between px-6 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[24px] font-medium tracking-[-0.05em] text-ink transition-opacity hover:opacity-70"
          >
            <LogoMark size={26} />
            Mytheus
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden rounded-pill px-4 py-2 text-[15px] font-medium text-ink-2 transition-colors hover:text-ink sm:inline-flex"
            >
              Log in
            </Link>
            <OutlinePill href="/sign-up">Get started</OutlinePill>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
