"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LockSimple } from "@phosphor-icons/react";
import { Wordmark } from "@/components/site/Wordmark";
import { authFontClass } from "@/lib/fonts";
import { AuthArt, AuthBandLine, type AuthArtKind } from "./AuthArt";
import "@/styles/auth.css";

/* ================================================================== */
/*  AuthShell: the frame every auth screen sits in.                    */
/*                                                                     */
/*  lg and up: two panels. The form panel (white, calm, the wordmark   */
/*  at top, the form vertically centred, a hairline footer) and the    */
/*  brand panel (a peach stage with one drawing of the coral line and  */
/*  the page's headline under it).                                     */
/*  Below lg the brand panel folds into a slim band above the form.    */
/* ================================================================== */

export type StageCopy = {
  title: string;
  lead?: string;
};

export function AuthShell({
  stage,
  art,
  artLabel,
  aside,
  children,
}: {
  stage: StageCopy;
  /** which drawing of the line the brand panel shows */
  art: AuthArtKind;
  /** a short label the drawing can carry (the workspace name while it is being typed) */
  artLabel?: string;
  /** top-right of the form panel, e.g. "New to Mytheus? Create an account" */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auth ${authFontClass} min-h-[100dvh] bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]`}
    >
      <div className="flex min-h-[100dvh] flex-col px-4 pb-5 pt-4 sm:px-8 lg:px-12 xl:px-16">
        <header className="flex min-h-[44px] items-center justify-between gap-4">
          <Link href="/" aria-label="Mytheus home" className="group inline-flex items-center rounded-ctl">
            <Wordmark size={22} textClassName="text-[22px]" />
          </Link>
          {aside ? <div className="text-right text-[14px] text-ink-3">{aside}</div> : null}
        </header>

        <Band copy={stage} art={art} />

        <main className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[400px] py-8 sm:py-12">{children}</div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4 text-[13px] text-ink-3">
          <span className="inline-flex items-center gap-2">
            <LockSimple size={15} aria-hidden />
            Sessions secured by Clerk
          </span>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/privacy" className="rounded-ctl transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="rounded-ctl transition-colors hover:text-ink">
              Terms
            </Link>
            <Link href="/security" className="rounded-ctl transition-colors hover:text-ink">
              Security
            </Link>
          </nav>
        </footer>
      </div>

      <BrandPanel copy={stage} art={art} artLabel={artLabel} />
    </div>
  );
}

/* ---------------- lg and up: the peach stage ---------------- */

function BrandPanel({ copy, art, artLabel }: { copy: StageCopy; art: AuthArtKind; artLabel?: string }) {
  return (
    <aside className="hidden p-3 lg:sticky lg:top-0 lg:block lg:h-[100dvh]">
      <div className="auth-stage flex h-full flex-col overflow-hidden rounded-hero px-10 pb-10 pt-12 xl:px-14 xl:pb-14">
        <div className="flex min-h-0 flex-1 items-center justify-center [@media(max-height:680px)]:hidden">
          <AuthArt kind={art} label={artLabel} />
        </div>
        <div className="mt-auto pt-6">
          <p className="display max-w-[15ch] text-[clamp(2.25rem,3.2vw,3.25rem)] leading-[1.02]">{copy.title}</p>
          {copy.lead ? (
            <p className="mt-4 max-w-[44ch] text-pretty text-[16px] leading-relaxed text-ink-2 [@media(max-height:760px)]:hidden">
              {copy.lead}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

/* ---------------- below lg: the slim band ---------------- */

function Band({ copy, art }: { copy: StageCopy; art: AuthArtKind }) {
  return (
    <div className="auth-stage mt-4 rounded-card px-5 pb-3 pt-4 lg:hidden">
      <p className="display text-[19px] leading-snug">{copy.title}</p>
      <div className="mt-2">
        <AuthBandLine kind={art} />
      </div>
    </div>
  );
}
