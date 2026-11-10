"use client";

import { useEffect } from "react";
import { ArrowClockwise, CloudSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

/* The whole-screen error for an (app) route's error.tsx. Distinct from empty: it says the read
   failed, that nothing was lost, and offers a real retry (`reset` re-renders the segment). The
   serif title keeps the page's own name so the screen still says where you are. */
export function RouteError({
  error,
  reset,
  page,
  title,
  text,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** the screen's name, shown as the page title */
  page: string;
  title: string;
  text: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1240px]">
      <h1 className="display pb-6 pt-2 text-[clamp(28px,3vw,34px)] text-ink-display sm:pb-7">{page}</h1>
      <div
        role="alert"
        className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-14 text-center shadow-warm-1"
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-priority-high-soft text-priority-high">
          <CloudSlash size={26} aria-hidden />
        </span>
        <h2 className="display mt-4 text-[22px] text-ink-display">{title}</h2>
        <p className="mt-2 max-w-[46ch] text-[14.5px] text-ink-3">{text}</p>
        <Button className="mt-6" onClick={reset}>
          <ArrowClockwise size={16} weight="bold" aria-hidden />
          Try again
        </Button>
      </div>
    </div>
  );
}
