import type { ReactNode } from "react";

/* Consistent long-form typography for legal / informational pages. Style the
   semantic tags via arbitrary selectors so page authors just write headings,
   paragraphs and lists. Server component. */

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        mx-auto max-w-[68ch] text-[16px] leading-relaxed text-ink-2
        [&_h2]:display [&_h2]:mt-12 [&_h2]:text-[clamp(1.4rem,3vw,1.9rem)] [&_h2]:text-ink-display
        [&_h3]:mt-8 [&_h3]:text-[18px] [&_h3]:font-semibold [&_h3]:text-ink-display
        [&_p]:mt-4
        [&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5
        [&_li]:relative [&_li]:list-none [&_li]:pl-5
        [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:-translate-y-1/2 [&_li]:before:rounded-full [&_li]:before:bg-signal/60
        [&_a]:text-signal-deep [&_a]:underline [&_a]:underline-offset-2
        [&_strong]:font-semibold [&_strong]:text-ink-display
      "
    >
      {children}
    </div>
  );
}
