"use client";

import { useEffect, useRef, useState } from "react";

/* The home page's section rail (its scrollbar) and the marking that settles each section in.

   Scrolling is the browser's own on every device: wheel, trackpad momentum, keys, touch and the
   rail all move the page freely, at their native speed. (It used to step section by
   section through Lenis, swallowing the rest of each gesture; a steady scroll never ended its
   gesture and so stuck at the transcript, and every gesture moved one stop at most.) Touch keeps
   gentle proximity snapping (globals.css); the rail's in-page links glide through the site's
   smooth scroll-behavior, which reduced motion turns off.

   On every device it marks the section under the middle of the screen `data-active` (which
   settles its `data-snap-in` blocks, globals.css) and renders the rail: one block per section,
   sized to it, filling with coral as you move through it (written straight to a CSS variable,
   so scrolling never re-renders React). */

type Stop = { id: string; label: string; size: number };

export function SnapStage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [active, setActive] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-snap]"));
    if (!sections.length) return;

    /* ---------------- active section and the rail fill */
    let raf = 0;
    let current = -1;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const mid = vh * 0.5;
      let next = 0;
      sections.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) next = i;
      });
      if (sections[sections.length - 1].getBoundingClientRect().bottom <= mid) next = sections.length - 1;
      const r = sections[next].getBoundingClientRect();
      const span = Math.max(1, r.height - vh);
      const p = Math.min(1, Math.max(0, r.height <= vh ? (r.top <= 1 ? 1 : 1 - r.top / vh) : -r.top / span));
      navRef.current?.style.setProperty("--p", p.toFixed(3));
      if (next === current) return;
      current = next;
      sections.forEach((el, i) => (i === next ? el.setAttribute("data-active", "") : el.removeAttribute("data-active")));
      setActive(next);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    /* ---------------- the rail's blocks, sized to their sections */
    const measure = () => setStops(sections.map((el) => ({ id: el.id, label: el.dataset.snapLabel ?? el.id, size: el.offsetHeight })));

    measure();
    schedule(); // next frame, once the rail has rendered and can take its fill
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        measure();
        schedule();
      }, 120);
    });
    ro.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      ro.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(raf);
      sections.forEach((el) => el.removeAttribute("data-active"));
    };
  }, []);

  if (!stops.length) return null;

  return (
    <nav ref={navRef} aria-label="Page sections" className="fixed bottom-6 right-2 top-[96px] z-40 hidden w-[18px] min-[768px]:block">
      <ol className="flex h-full flex-col gap-[5px]">
        {stops.map((s, i) => {
          const on = i === active;
          const done = i < active;
          return (
            <li key={s.id} className="relative flex min-h-[14px] justify-center" style={{ flexGrow: s.size, flexBasis: 0 }}>
              <a href={`#${s.id}`} aria-current={on ? "true" : undefined} aria-label={s.label} className="group flex h-full w-full justify-center rounded-full">
                <span
                  aria-hidden
                  className={`relative block h-full overflow-hidden rounded-full transition-[width,background-color] duration-300 ${
                    on ? "w-[6px] bg-[color-mix(in_srgb,var(--signal-line)_24%,transparent)]" : `w-[4px] group-hover:w-[6px] ${done ? "bg-[color-mix(in_srgb,var(--signal-line)_55%,transparent)]" : "bg-line-2 group-hover:bg-ink-4"}`
                  }`}
                >
                  {on ? <span className="absolute inset-x-0 top-0 block rounded-full bg-signal" style={{ height: "max(8%, calc(var(--p, 0) * 100%))" }} /> : null}
                </span>
                <span className="pointer-events-none absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--surface-2)_92%,transparent)] px-2.5 py-0.5 text-[12.5px] font-semibold text-ink opacity-0 shadow-warm-1 backdrop-blur transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                  {s.label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
