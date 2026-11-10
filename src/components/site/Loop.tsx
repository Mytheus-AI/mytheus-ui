import type { ReactNode } from "react";

/* The hero's signature: a hand-drawn coral loop around a phrase, drawn on page load. Its tail
   runs off to the right and is where the page-long line (`Thread`) begins, so it carries
   `data-thread-start` and the tail's end as fractions of its box. Use once per page, on the
   phrase that carries the page's promise. */
export function Loop({ children }: { children: ReactNode }) {
  return (
    <span className="relative z-0 inline-block whitespace-nowrap">
      {children}
      <svg
        viewBox="0 0 560 170"
        aria-hidden
        data-thread-start=""
        data-thread-x={604 / 560}
        data-thread-y={150 / 170}
        className="loop-svg pointer-events-none absolute left-1/2 top-[54%] -z-10 h-[1.7em] w-[calc(100%+1.3em)] -translate-x-1/2 -translate-y-1/2 overflow-visible"
      >
        <path
          className="line-stroke loop-path"
          pathLength={1}
          d="M40 96 C28 54 150 22 286 22 C432 22 540 50 538 90 C536 130 420 154 278 152 C136 150 18 132 20 86 C22 42 152 10 292 12 C446 14 556 46 552 94 C550 122 566 142 604 150"
        />
        <circle className="loop-bead" r="6">
          <animateMotion
            dur="10s"
            begin="1.9s"
            repeatCount="indefinite"
            path="M20 88 C22 44 150 22 286 22 C432 22 540 50 538 90 C536 130 420 154 278 152 C136 150 18 132 20 88"
          />
        </circle>
      </svg>
    </span>
  );
}
