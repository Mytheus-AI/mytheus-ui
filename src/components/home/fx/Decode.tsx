"use client";

import { useEffect, useRef, useState } from "react";

/* Text that resolves out of transcript noise: each character cycles through the hero field's
   glyphs and settles, left to right. The server renders the final text and screen readers only
   ever get the final text (the scrambled copy is aria-hidden). Starts when it scrolls into view;
   reduced motion shows the final text at once. Keep it to one short line (it is nowrap). */
const GLYPHS = ".:-=+*#%@";

export function Decode({ text, delay = 0, duration = 900, className = "" }: { text: string; delay?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const run = () => {
      const start = performance.now() + delay;
      const tick = (now: number) => {
        const p = Math.max(0, (now - start) / duration);
        const settled = Math.floor(p * text.length);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          out += i < settled || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        setShown(out);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setShown(text);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, delay, duration]);

  return (
    <span ref={ref} className={`relative inline-block whitespace-nowrap ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
