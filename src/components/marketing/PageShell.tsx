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
        <div className="mx-auto flex max-w-[1340px] items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-4">
          <Link
            href="/"
            className="inline-flex min-w-0 shrink items-center gap-2 whitespace-nowrap text-[21px] font-medium tracking-[-0.05em] text-ink transition-opacity hover:opacity-70 sm:text-[24px]"
          >
            <LogoMark size={26} />
            Mytheus
          </Link>
          <nav className="flex flex-none items-center gap-1.5 sm:gap-2" aria-label="Site">
            <Link
              href="/features"
              className="hidden rounded-pill px-4 py-2.5 text-[15px] font-medium text-ink-2 transition-colors hover:text-ink md:inline-flex"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="hidden rounded-pill px-4 py-2.5 text-[15px] font-medium text-ink-2 transition-colors hover:text-ink md:inline-flex"
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="hidden rounded-pill px-4 py-2.5 text-[15px] font-medium text-ink-2 transition-colors hover:text-ink sm:inline-flex"
            >
              Log in
            </Link>
            <OutlinePill href="/dashboard" className="whitespace-nowrap">
              Get started
            </OutlinePill>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
