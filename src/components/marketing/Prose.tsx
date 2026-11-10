import type { ReactNode } from "react";

/* Long-form reading type for legal and informational pages. Page authors write plain headings,
   paragraphs and lists; this styles them: 17px body at under 72 characters a line, serif section
   titles, plain disc bullets, links underlined with the coral line. Server component. */

export function Prose({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`
        max-w-[68ch] break-words text-[17px] leading-[1.7] text-ink-2
        [&_h2]:display [&_h2]:mt-14 [&_h2]:scroll-mt-28 [&_h2]:text-[clamp(1.55rem,2.6vw,1.9rem)] [&_h2]:leading-tight
        [&_h2:first-child]:mt-0
        [&_h3]:mt-8 [&_h3]:text-[18px] [&_h3]:font-semibold [&_h3]:text-ink
        [&_p]:mt-4
        [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-5
        [&_li]:pl-1.5 [&_li]:marker:text-ink-4
        [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:decoration-signal-line [&_a]:decoration-2 [&_a]:underline-offset-4 hover:[&_a]:decoration-signal
        [&_strong]:font-semibold [&_strong]:text-ink
        ${className}
      `}
    >
      {children}
    </div>
  );
}
