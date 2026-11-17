"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/* The home page's snap scroll and its scrollbar.

   Scrolling is Lenis (darkroom.engineering, MIT); the stepping is ours. The first wheel or
   trackpad movement of a gesture sends the page to the next stop in that direction at once, on
   an ease-out (it leaves straight away and settles gently), and the rest of that gesture, its
   momentum included, is swallowed, so one gesture is always exactly one stop. A new gesture
   starts after a short pause in the wheel. Keys (arrows, Page Up and Down, Space, Home, End) step
   the same way, and in-page links (the scrollbar) glide through Lenis's anchors.
   (Lenis's own Snap plugin waited for the gesture to come to rest before moving, and moved on an
   ease-in-out, so every snap read as a nudge, a pause and then a lurch.)

   The stops: the top of every `data-snap` section, the `data-snap-stop` markers inside the
   pinned transcript (one per kept line), the last screen of any section taller than the screen
   (so its end is reachable), and the bottom of the page (the footer).

   Desktop only (fine pointer, 1000px and up). Touch keeps native scrolling with gentle CSS snap
   (globals.css), and reduced motion gets plain native scrolling with no snapping.

   On every device it marks the section under the middle of the screen `data-active` (which
   settles its `data-snap-in` blocks, globals.css) and renders the scrollbar: one block per
   section, sized to it, filling with coral as you move through it (written straight to a CSS
   variable, so scrolling never re-renders React). */

type Stop = { id: string; label: string; size: number };

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const SNAP = { duration: 0.95, easing: easeOutQuart };
/** A pause in the wheel this long (ms) ends a gesture; trackpad momentum events come far closer. */
const GESTURE_GAP = 180;
/** How far (px of wheel delta) a gesture must travel before it counts, so a touch on the trackpad does not step. */
const GESTURE_MIN = 8;

export function SnapStage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [active, setActive] = useState(0);
  const navRef = useRef<HTMLElement>(null);

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

    /** One stop up or down from where the page is now. */
    const step = (dir: 1 | -1) => {
      const y = lenis ? lenis.targetScroll : window.scrollY;
      return dir > 0 ? points.find((p) => p > y + 4) : [...points].reverse().find((p) => p < y - 4);
    };

    /* ---------------- the wheel: one gesture, one stop */
    let busy = false;
    let lastWheel = 0;
    let gestureSum = 0;
    let gestureUsed = false;
    let busyTimer = 0;
    const go = (to: number) => {
      if (!lenis) return;      busy = true;
      window.clearTimeout(busyTimer);
      // a safety net in case Lenis never reports the landing (a resize mid-flight, say)
      busyTimer = window.setTimeout(() => (busy = false), SNAP.duration * 1000 + 400);
      lenis.scrollTo(to, {
        ...SNAP,
        lock: true,
        force: true,
        onComplete: () => {
          busy = false;
          window.clearTimeout(busyTimer);
        },
      });
    };
    const onWheel = ({ deltaX, deltaY, event }: { deltaX: number; deltaY: number; event: WheelEvent | TouchEvent }) => {
      if (event.type !== "wheel") return true;
      const e = event as WheelEvent;
      // pinch-zoom and sideways swipes (the logo belts) are not ours
      if (e.ctrlKey || Math.abs(deltaX) > Math.abs(deltaY)) return true;
      const now = performance.now();
      if (now - lastWheel > GESTURE_GAP) {
        gestureSum = 0;
        gestureUsed = false;
      }
      lastWheel = now;
      if (e.cancelable) e.preventDefault();
      if (busy || gestureUsed) return false;
      gestureSum += deltaY;
      if (Math.abs(gestureSum) < GESTURE_MIN) return false;
      gestureUsed = true;
      const to = step(gestureSum > 0 ? 1 : -1);
      if (to !== undefined) go(to);
      return false;
    };

    if (desktop && !reduce) {
      lenis = new Lenis({ autoRaf: true, anchors: { ...SNAP, lock: true }, stopInertiaOnNavigate: true, virtualScroll: onWheel });
    }
    measure();
    schedule(); // next frame, once the scrollbar has rendered and can take its fill
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
      go(to);
    };

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        measure();
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
      window.clearTimeout(busyTimer);
      lenis?.destroy();
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
