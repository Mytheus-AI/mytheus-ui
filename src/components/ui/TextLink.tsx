import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

/* The quiet text link with an arrow ("See all tasks"), and the underlined inline link for links
   inside a sentence or an explainer. 40px tall hit area. */

export const textLinkClass =
  "group/link inline-flex min-h-[40px] items-center gap-1 rounded-ctl px-1 text-[14px] font-semibold text-signal-ink underline-offset-4 transition-colors duration-150 hover:underline active:opacity-70";

export const inlineLinkClass =
  "inline-flex min-h-[40px] items-center gap-1.5 rounded-ctl font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal";

export function TextLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${textLinkClass} ${className}`}>
      {children}
      <ArrowRight size={12} weight="bold" aria-hidden className="transition-transform duration-150 motion-safe:group-hover/link:translate-x-0.5" />
    </Link>
  );
}
