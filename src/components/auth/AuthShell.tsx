"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { Doodle } from "@/components/ui/Doodle";
import { authFontClass } from "@/lib/fonts";
import { DoodleTable, type SceneProps } from "./DoodleTable";
import "@/styles/auth.css";

/* ================================================================== */
/*  AuthShell - the frame every auth screen sits in.                   */
/*                                                                     */
/*  Left (lg+): a sketchbook sheet with a meeting drawn on it (see     */
/*  DoodleTable), and the page's headline underneath, its accent words */
/*  underlined in pencil.                                              */
/*  Right: the form, vertically centred, with its own header + footer. */
/*  Below lg the sheet folds into a row of doodles above the form.     */
/* ================================================================== */

export type StageCopy = {
  kicker: string;
  title: string;
  /** trailing words, set in italic clay with a hand-drawn underline */
  accent?: string;
  blurb?: string;
};

export function AuthShell({
  stage,
  scene,
  aside,
  children,
}: {
  stage: StageCopy;
  /** what the drawn meeting shows on this page */
  scene?: SceneProps;
  /** top-right of the form column, e.g. "New here? Create an account" */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auth ${authFontClass} relative min-h-[100dvh] bg-bg lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]`}>
      <Stage copy={stage} scene={scene} />

      <section className="relative flex min-h-[100dvh] flex-col px-5 py-5 sm:px-10 lg:px-14 xl:px-20">
        <div className="relative z-10 flex min-h-[44px] items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[23px] font-semibold tracking-[-0.04em] text-ink lg:invisible"
            aria-label="Mytheus home"
          >
            <LogoMark size={24} />
            Mytheus
          </Link>
          {aside ? <div className="text-right text-[14px] text-ink-3">{aside}</div> : null}
        </div>

        <main className="relative z-10 flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[400px] py-10">
            <MobileCrowd you={scene?.you} />
            {children}
          </div>
        </main>

        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[12.5px] text-ink-3">
          <span className="inline-flex items-center gap-2">
            <Lock />
            Sessions secured by Clerk
          </span>
          <nav className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
            <Link href="/security" className="transition-colors hover:text-ink">
              Security
            </Link>
          </nav>
        </footer>
      </section>
    </div>
  );
}

/* ---------------- the sheet ---------------- */

function Stage({ copy, scene }: { copy: StageCopy; scene?: SceneProps }) {
  return (
    <aside className="hidden p-3 lg:sticky lg:top-0 lg:block lg:h-[100dvh]" aria-hidden>
      <div className="doodle-sheet relative flex h-full flex-col overflow-hidden rounded-[28px] border border-line px-10 py-8 xl:px-14 xl:py-10">
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            tabIndex={-1}
            className="pointer-events-auto inline-flex items-center gap-2 text-[25px] font-semibold tracking-[-0.04em] text-ink"
          >
            <LogoMark size={27} />
            Mytheus
          </Link>
          <span className="font-hand hidden -rotate-2 text-[22px] font-medium text-ink-3 xl:inline">
            every meeting, on repeat
          </span>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-6 [@media(max-height:600px)]:hidden">
          <DoodleTable {...scene} />
        </div>

        {/* mt-auto keeps the headline on the bottom edge when the drawing is hidden on short screens */}
        <div className="relative z-10 mt-auto">
          <p className="kicker mb-4">{copy.kicker}</p>
          <StageHeadline key={copy.title + (copy.accent ?? "")} title={copy.title} accent={copy.accent} />
          {copy.blurb ? (
            <p className="mt-4 max-w-[46ch] text-pretty text-[15.5px] leading-relaxed text-ink-3 [@media(max-height:820px)]:hidden">{copy.blurb}</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

/** Below lg there is no room for the table, so a few of its people peek over the form. */
function MobileCrowd({ you }: { you?: string | "empty" }) {
  const seeds = ["tbl-ava", "tbl-ravi", "tbl-mei", "tbl-jonah"];
  return (
    <div className="mb-8 flex items-center lg:hidden" aria-hidden>
      {seeds.map((s, i) => (
        <span
          key={s}
          className="-ml-2.5 block h-11 w-11 overflow-hidden rounded-full border-[2px] border-[var(--doodle-ink)] first:ml-0"
          style={{ transform: `rotate(${(i % 2 ? 1 : -1) * 4}deg)` }}
        >
          <Doodle seed={s} className="block h-full w-full" />
        </span>
      ))}
      {you && you !== "empty" ? (
        <span className="-ml-2.5 block h-12 w-12 overflow-hidden rounded-full border-[2px] border-[var(--doodle-ink)] shadow-[0_0_0_3px_var(--signal)]">
          <Doodle key={you} seed={you} className="doodle-pop block h-full w-full" />
        </span>
      ) : null}
      <span className="font-hand ml-3 text-[20px] font-medium text-ink-3">
        {you && you !== "empty" ? "and you" : "your team, remembered"}
      </span>
    </div>
  );
}

/**
 * The headline: each word lifts out of its own masked line on mount, then the accent words get
 * a pencil underline drawn under them. Descender room is reserved, per design.md.
 */
function StageHeadline({ title, accent }: { title: string; accent?: string }) {
  const words = title.split(" ");
  const accentWords = accent ? accent.split(" ") : [];
  const word = (w: string, i: number, last: boolean) => (
    <span
      key={`${w}-${i}`}
      aria-hidden
      className="inline-block overflow-clip align-bottom"
      style={{ paddingBottom: "0.2em", marginBottom: "-0.2em" }}
    >
      <span className="auth-word inline-block" style={{ animationDelay: `${120 + i * 70}ms` }}>
        {w}
        {last ? "" : " "}
      </span>
    </span>
  );
  return (
    <h2
      aria-label={[title, accent].filter(Boolean).join(" ")}
      className="display display-tight max-w-[16ch] text-balance text-[clamp(2.4rem,3.5vw,4rem)] text-ink-display"
    >
      {words.map((w, i) => word(w, i, i === words.length - 1 && !accentWords.length))}
      {accentWords.length ? (
        <span className="relative inline italic text-signal-deep">
          {accentWords.map((w, j) => word(w, words.length + j, j === accentWords.length - 1))}
          <svg
            viewBox="0 0 300 16"
            preserveAspectRatio="none"
            className="pointer-events-none absolute -bottom-[0.06em] left-0 h-[0.22em] w-full"
            aria-hidden
          >
            <path
              d="M3 11 C 60 3, 130 4, 190 8 S 270 12, 297 5"
              fill="none"
              stroke="var(--signal)"
              strokeWidth="3.2"
              strokeLinecap="round"
              pathLength={1}
              className="doodle-underline"
            />
          </svg>
        </span>
      ) : null}
    </h2>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
