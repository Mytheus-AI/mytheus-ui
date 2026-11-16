"use client";

import { useEffect, useState } from "react";

/* The home page's snap scroll and its scrollbar.

   Snapping (desktop, fine pointer, 1000px and up): scrolling is never blocked. The wheel or
   trackpad scrolls the page natively; when the gesture comes to rest (160ms with no scrolling,
   so trackpad momentum is allowed to finish), the page glides to the next stop in the direction
   you were going. Any new scroll during a glide cancels it, so the pointer always wins. Keys
   (arrows, Page Up and Down, Space, Home, End) step one stop at a time.

   Stops: every section marked `data-snap`, the `data-snap-stop` markers inside the pinned
   transcript (one per kept line), and the very bottom. A section taller than the screen (the
   feature list, the questions) scrolls freely inside and only snaps at its edges.

   Touch keeps native CSS snapping with proximity (globals.css); reduced motion turns snapping
   off. On every device the section under the middle of the screen gets `data-active`, which
   settles its `data-snap-in` blocks (globals.css).

   The scrollbar: the browser's own bar is hidden on this page (globals.css) and replaced by a
   column of blocks on the right edge, one per section and sized to it. The block you are in
   fills with coral as you move through it; hovering a block names the section, clicking glides
   there. They are real links, so they work from the keyboard. */

type Stop = { id: string; label: string; size: number };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function SnapStage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-snap]"));
    if (!sections.length) return;

    const desktop = window.matchMedia("(min-width: 1000px) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stepping = () => desktop.matches && !reduce.matches;

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
      const last = sections[sections.length - 1].getBoundingClientRect();
      if (last.bottom <= mid) next = sections.length - 1;
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

    /* ---------------- stops and free regions, in page coordinates */
    let points: number[] = [];
    let free: [number, number][] = [];
    const measure = () => {
      const vh = window.innerHeight;
      const y0 = window.scrollY;
      const max = Math.max(0, Math.round(document.documentElement.scrollHeight - vh));
      const set = new Set<number>([0, max]);
      free = [];
      sections.forEach((el, i) => {
        const top = Math.round(el.getBoundingClientRect().top + y0);
        if (i > 0) set.add(top);
        const inner = el.querySelectorAll<HTMLElement>("[data-snap-stop]");
        inner.forEach((m) => {
          if (m.offsetParent) set.add(Math.round(m.getBoundingClientRect().top + y0));
        });
        const h = el.offsetHeight;
        if (h > vh + 40 && !inner.length) free.push([top, top + h - vh]);
      });
      points = Array.from(set)
        .filter((v) => v >= 0 && v <= max)
        .sort((a, b) => a - b);
      setStops(sections.map((el) => ({ id: el.id, label: el.dataset.snapLabel ?? el.id, size: el.offsetHeight })));
    };
    const inFree = (y: number) => free.some(([a, b]) => y > a + 2 && y < b - 2);

    /* ---------------- the glide */
    let gliding = false;
    let anim = 0;
    let idle = 0;
    let origin: number | null = null;
    const stopGlide = () => {
      cancelAnimationFrame(anim);
      gliding = false;
    };
    const glide = (to: number) => {
      stopGlide();
      window.clearTimeout(idle);
      origin = null;
      const from = window.scrollY;
      const d = to - from;
      if (Math.abs(d) < 2) return;
      gliding = true;
      const dur = Math.min(1100, 520 + Math.abs(d) * 0.28);
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        window.scrollTo({ top: from + d * ease(t), behavior: "instant" });
        if (t < 1) anim = requestAnimationFrame(step);
        else gliding = false;
      };
      anim = requestAnimationFrame(step);
    };

    /** Where to come to rest after a free scroll that started at `from` and stopped at `y`. */
    const restFor = (from: number, y: number): number | undefined => {
      if (inFree(y)) return undefined;
      const moved = y - from;
      if (Math.abs(moved) < 30) return points.includes(from) ? from : undefined;
      if (moved > 0) return points.find((p) => p > y - 2);
      let to = [...points].reverse().find((p) => p < y + 2);
      // coming up into a tall section, rest on its last screen rather than jumping to its top
      const end = free.find(([, b]) => b < y + 2 && (to === undefined || b > to));
      if (end) to = end[1];
      return to;
    };
    const settle = () => {
      if (origin === null || gliding) return;
      const from = origin;
      origin = null;
      const to = restFor(from, window.scrollY);
      if (to !== undefined && Math.abs(to - window.scrollY) > 2) glide(to);
    };

    const onWheel = (e: WheelEvent) => {
      if (!stepping() || e.ctrlKey || Math.abs(e.deltaY) < 1 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (gliding) {
        if (Math.abs(e.deltaY) < 4) return; // the tail of the gesture that started this glide
        stopGlide(); // a fresh scroll: the pointer wins
      }
      if (origin === null) origin = Math.round(window.scrollY);
      window.clearTimeout(idle);
      idle = window.setTimeout(settle, 160);
    };
    const onScroll = () => {
      schedule();
      if (gliding || origin === null) return;
      window.clearTimeout(idle);
      idle = window.setTimeout(settle, 160);
    };

    /** The next stop one key press away. */
    const stepFrom = (dir: 1 | -1): number | undefined => {
      const y = window.scrollY;
      if (inFree(y)) return undefined;
      if (dir > 0) return points.find((p) => p > y + 4);
      let to = [...points].reverse().find((p) => p < y - 4);
      const end = free.find(([, b]) => b < y - 4 && (to === undefined || b > to));
      if (end) to = end[1];
      return to;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!stepping() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest("[role=listbox],[role=menu],[role=dialog]"))) return;
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        glide(e.key === "Home" ? 0 : points[points.length - 1]);
        return;
      }
      let dir: 1 | -1 | 0 = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) dir = -1;
      if (!dir) return;
      if (e.key === " " && el && /^(BUTTON|A|SUMMARY)$/.test(el.tagName)) return; // Space activates controls
      const to = stepFrom(dir);
      if (to === undefined) return;
      e.preventDefault();
      glide(to);
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const el = document.getElementById(a.getAttribute("href")!.slice(1));
      if (!el || !sections.includes(el)) return;
      e.preventDefault();
      const top = el === sections[0] ? 0 : el.getBoundingClientRect().top + window.scrollY;
      if (reduce.matches) window.scrollTo({ top, behavior: "instant" });
      else glide(top);
    };

    measure();
    update();
    const ro = new ResizeObserver(() => {
      measure();
      schedule();
    });
    ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      stopGlide();
      window.clearTimeout(idle);
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
