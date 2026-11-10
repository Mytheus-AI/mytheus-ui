"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/* Adds the `in` class to its element the first time it scrolls into view, which is what starts
   the drawn coral strokes (`.line-draw`) and any `.in`-scoped entrance inside it. One-shot: it
   never removes the class, so nothing replays on scroll back. Without IntersectionObserver the
   class is added at once. `onEnter` runs once at the same moment (for timed demos). */
export function InView({
  as,
  className = "",
  threshold = 0.25,
  onEnter,
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  threshold?: number;
  onEnter?: () => void;
  children?: ReactNode;
} & Record<string, unknown>) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const enterRef = useRef(onEnter);
  enterRef.current = onEnter;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      enterRef.current?.();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          enterRef.current?.();
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <Tag ref={ref} className={`${className} ${inView ? "in" : ""}`} {...rest}>
      {children}
    </Tag>
  );
}
