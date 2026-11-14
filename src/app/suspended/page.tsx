import type { Metadata } from "next";
import { Wordmark } from "@/components/site/Wordmark";
import { SuspendedSignOut } from "./SuspendedSignOut";

export const metadata: Metadata = { title: "Mytheus | Workspace suspended" };

/* Where the gateway's `tenant_suspended` refusal sends a member (lib/api/client.ts). Outside the
   app shell on purpose: the shell's own reads are what failed. The page signs the member out on
   arrival; signing back in lands here again for as long as the workspace stays suspended. */
export default function SuspendedPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg text-ink-2">
      <header className="mx-auto w-[min(1120px,100%-40px)] pt-6 sm:w-[min(1120px,100%-80px)]">
        <Wordmark size={22} />
      </header>
      <section className="mx-auto flex w-[min(640px,100%-40px)] flex-1 flex-col items-center justify-center py-16 text-center">
        <svg viewBox="0 0 320 90" aria-hidden className="mb-8 h-auto w-[min(320px,80vw)] overflow-visible">
          <path
            className="loop-path line-stroke"
            pathLength={1}
            d="M6 60 C60 60 80 20 128 22 C176 24 168 70 132 66 C100 62 118 30 168 34"
          />
          <path d="M196 44 L196 72 M214 44 L214 72" stroke="var(--signal)" strokeWidth={6} strokeLinecap="round" />
        </svg>
        <p className="kicker">Workspace suspended</p>
        <h1 className="display mt-3 text-[clamp(2.2rem,6vw,3.4rem)]">This workspace is on hold.</h1>
        <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink-3">
          Mytheus has suspended your workspace, so nobody in it can sign in for now. Your meetings,
          decisions and notes are kept as they are. Ask your workspace admin to contact Mytheus
          support to restore access.
        </p>
        <SuspendedSignOut />
      </section>
    </main>
  );
}
