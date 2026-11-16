"use client";

import { useEffect, useState } from "react";
import Lenis from "lenis";
import Snap from "lenis/snap";
import "lenis/dist/lenis.css";

/* The home page's snap scroll and its scrollbar.

   Scrolling and snapping are Lenis (darkroom.engineering, MIT) with its Snap plugin in `lock`
   mode: the wheel and the trackpad are smoothed, and when a gesture comes to rest the page moves
   one stop in the direction you were going, ignoring input until it lands, so trackpad momentum
   can never skip two stops. Keys (arrows, Page Up and Down, Space, Home, End) step the same way,
   and in-page links (the scrollbar, "Watch it listen") glide through Lenis's anchors.

   This file only supplies the stops: the top of every `data-snap` section, the `data-snap-stop`
   markers inside the pinned transcript (one per kept line), the last screen of any section taller
   than the screen (so its end is reachable), and the bottom of the page (the footer).

   Desktop only (fine pointer, 1000px and up). Touch keeps native scrolling with gentle CSS snap
   (globals.css), and reduced motion gets plain native scrolling with no snapping.

   On every device it marks the section under the middle of the screen `data-active` (which
   settles its `data-snap-in` blocks, globals.css) and renders the scrollbar: one block per
   section, sized to it, filling with coral as you move through it. */

type Stop = { id: string; label: string; size: number };

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const SNAP = { duration: 0.9, easing: easeInOutCubic };

export function SnapStage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-snap]"));
    if (!sections.length) return;

    /* ---------------- active section and the scrollbar fill */
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
      setProgress(Math.min(1, Math.max(0, r.height <= vh ? (r.top <= 1 ? 1 : 1 - r.top / vh) : -r.top / span)));
      if (next === current) return;
      current = next;
      sections.forEach((el, i) => (i === next ? el.setAttribute("data-active", "") : el.removeAttribute("data-active")));
      setActive(next);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    /* ---------------- the stops, in page coordinates */
    let points: number[] = [];
    const measure = () => {
      const vh = window.innerHeight;
      const y0 = window.scrollY;
      const max = Math.max(0, Math.round(document.documentElement.scrollHeight - vh));
      const set = new Set<number>([0, max]);
      sections.forEach((el, i) => {
        const top = Math.round(el.getBoundingClientRect().top + y0);
        if (i > 0) set.add(top);
        const inner = el.querySelectorAll<HTMLElement>("[data-snap-stop]");
        inner.forEach((m) => {
          if (m.offsetParent) set.add(Math.round(m.getBoundingClientRect().top + y0));
        });
        if (!inner.length && el.offsetHeight > vh + 40) set.add(top + el.offsetHeight - vh);
      });
      points = Array.from(set)
        .filter((v) => v >= 0 && v <= max)
        .sort((a, b) => a - b);
      setStops(sections.map((el) => ({ id: el.id, label: el.dataset.snapLabel ?? el.id, size: el.offsetHeight })));
    };

    const desktop = window.matchMedia("(min-width: 1000px) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    let snap: Snap | null = null;
    let unsnap: (() => void)[] = [];

    const syncSnaps = () => {
      measure();
      if (!snap) return;
      unsnap.forEach((off) => off());
      unsnap = points.map((p) => snap!.add(p));
    };

    if (desktop && !reduce) {
      lenis = new Lenis({ autoRaf: true, anchors: { ...SNAP, lock: true }, stopInertiaOnNavigate: true });
      // distanceThreshold: by default lock mode only snaps when the next stop is within half a
      // screen; our stops are a screen or more apart, so every gesture must reach the next one.
      snap = new Snap(lenis, { type: "lock", debounce: 90, distanceThreshold: 1e7, ...SNAP });
    }
    syncSnaps();
    update();

    /** One stop up or down from where the page is now. */
    const step = (dir: 1 | -1) => {
      const y = lenis ? lenis.scroll : window.scrollY;
      return dir > 0 ? points.find((p) => p > y + 4) : [...points].reverse().find((p) => p < y - 4);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!lenis || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest("[role=listbox],[role=menu],[role=dialog]"))) return;
      let to: number | undefined;
      if (e.key === "Home") to = 0;
      else if (e.key === "End") to = points[points.length - 1];
      else if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) to = step(1);
      else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) to = step(-1);
      else return;
      if (e.key === " " && el && /^(BUTTON|A|SUMMARY)$/.test(el.tagName)) return; // Space activates controls
      if (to === undefined) return;
      e.preventDefault();
      lenis.scrollTo(to, { ...SNAP, lock: true });
    };

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        syncSnaps();
        lenis?.resize();
        schedule();
      }, 120);
    });
    ro.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      ro.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      unsnap.forEach((off) => off());
      snap?.destroy();
      lenis?.destroy();
      sections.forEach((el) => el.removeAttribute("data-active"));
    };
  }, []);

  if (!stops.length) return null;

  return (
    <nav aria-label="Page sections" className="fixed bottom-6 right-2 top-[96px] z-40 hidden w-[18px] min-[768px]:block">
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
                  {on ? <span className="absolute inset-x-0 top-0 block rounded-full bg-signal" style={{ height: `${Math.max(8, progress * 100)}%` }} /> : null}
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
