"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/* The page-long coral line of the marketing site.

   It starts at the tail of the hero loop (`[data-thread-start]`, see Loop.tsx), runs down one
   page margin, crosses the page between sections (`[data-thread-cross]`, alternating sides, with
   a small loop at the centre of each crossing), and ends in the tail of the footer mark
   (`[data-thread-end]`), which then draws itself. It draws as you scroll: the drawn length
   follows a point 62% down the viewport, so the line is always just ahead of the reader.

   The path is rebuilt from the live layout on resize, font load and content changes. The SVG is
   absolutely positioned over the marketing layout's root (which must be `position: relative`
   and start at the top of the document). Decorative only: aria-hidden, pointer-events none.
   Reduced motion: the whole line is drawn at once and the footer mark appears drawn. */

type Pt = { x: number; y: number };

function frac(el: Element, name: string, fallback: number) {
  const v = parseFloat(el.getAttribute(name) ?? "");
  return Number.isFinite(v) ? v : fallback;
}

export function Thread() {
  const pathname = usePathname();
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    const tip = tipRef.current;
    if (!svg || !path || !tip) return;
    const root = svg.parentElement as HTMLElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let L = 0;
    let lens: number[] = [];
    let ys: number[] = [];
    let ready = false;
    let revealing = true;
    let raf = 0;
    let endEl: Element | null = null;

    const build = () => {
      svg.style.height = "0";
      const rootBox = root.getBoundingClientRect();
      const W = root.clientWidth;
      const H = root.scrollHeight;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.style.height = `${H}px`;
      const ox = rootBox.left;
      const oy = rootBox.top;

      const wrap = root.querySelector("main .site-wrap") ?? root.querySelector("main");
      const wl = wrap ? wrap.getBoundingClientRect().left - ox : 24;
      const gx = Math.max(9, wl * 0.5);
      const xr = W - gx;
      const xl = gx;
      const cx = W / 2;

      const startEl = root.querySelector("[data-thread-start]");
      let s: Pt;
      if (startEl) {
        const b = startEl.getBoundingClientRect();
        s = {
          x: Math.min(b.left - ox + b.width * frac(startEl, "data-thread-x", 1), xr - 2),
          y: b.top - oy + b.height * frac(startEl, "data-thread-y", 0.9),
        };
      } else {
        const nav = root.querySelector("[data-site-nav]");
        s = { x: xr, y: nav ? nav.getBoundingClientRect().bottom - oy + 24 : 96 };
      }
      let d = `M${s.x} ${s.y}`;
      if (startEl) d += ` C${s.x + (xr - s.x) * 0.55} ${s.y + 8} ${xr} ${s.y + 30} ${xr} ${s.y + 110}`;
      let side = "r" as "r" | "l";

      root.querySelectorAll<HTMLElement>("[data-thread-cross]").forEach((sec) => {
        const y = sec.getBoundingClientRect().top - oy;
        if (y < s.y + 140) return;
        const pad = parseFloat(getComputedStyle(sec).paddingTop) || 64;
        const dy = Math.min(72, pad * 0.78);
        const r = Math.min(18, dy * 0.28);
        const a = side === "r" ? xr : xl;
        const b = side === "r" ? xl : xr;
        const sg = side === "r" ? -1 : 1;
        const sw = side === "r" ? 1 : 0;
        d +=
          ` L${a} ${y - dy} C${a} ${y - dy * 0.2} ${a + sg * dy} ${y} ${cx} ${y}` +
          ` a${r} ${r} 0 1 ${sw} 0 ${-2 * r} a${r} ${r} 0 1 ${sw} 0 ${2 * r}` +
          ` C${b - sg * dy} ${y} ${b} ${y + dy * 0.2} ${b} ${y + dy}`;
        side = side === "r" ? "l" : "r";
      });

      endEl = root.querySelector("[data-thread-end]");
      if (endEl) {
        const m = endEl.getBoundingClientRect();
        const tx = m.left - ox + m.width * frac(endEl, "data-thread-x", 1);
        const ty = m.top - oy + m.height * frac(endEl, "data-thread-y", 0);
        const yy = ty - 64;
        if (side === "l") {
          d += ` L${xl} ${yy - 44} C${xl} ${yy - 12} ${xl + 12} ${yy} ${xl + 44} ${yy} L${Math.max(xl + 46, tx - 6)} ${yy} C${tx + 54} ${yy} ${tx + 19} ${ty - 32} ${tx} ${ty}`;
        } else {
          d += ` L${xr} ${yy - 44} C${xr} ${yy - 12} ${xr - 12} ${yy} ${xr - 44} ${yy} L${tx + 80} ${yy} C${tx + 44} ${yy} ${tx + 19} ${ty - 32} ${tx} ${ty}`;
        }
      } else {
        const last = side === "r" ? xr : xl;
        d += ` L${last} ${H - 40}`;
      }

      path.setAttribute("d", d);
      L = path.getTotalLength();
      lens = [];
      ys = [];
      let m = -1e9;
      for (let l = 0; l <= L; l += 8) {
        const p = path.getPointAtLength(l);
        m = Math.max(m, p.y);
        lens.push(l);
        ys.push(m);
      }
      lens.push(L);
      ys.push(m);
      path.style.strokeDasharray = `${L} ${L}`;
      if (reduce) {
        path.style.strokeDashoffset = "0";
        tip.style.display = "none";
        endEl?.classList.add("in");
      } else if (!ready) {
        path.style.strokeDashoffset = `${L}`;
        tip.style.opacity = "0";
      } else {
        draw();
      }
    };

    const draw = () => {
      raf = 0;
      if (!L || reduce || !ready) return;
      const vh = window.innerHeight;
      const maxS = document.documentElement.scrollHeight - vh;
      const tail = Math.max(0, 1 - (maxS - window.scrollY) / (vh * 0.6));
      const target = window.scrollY + vh * (0.62 + 0.4 * tail) - (root.getBoundingClientRect().top + window.scrollY);
      let lo = 0;
      let hi = ys.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (ys[mid] <= target) lo = mid;
        else hi = mid - 1;
      }
      const cur = ys[0] > target ? 0 : lens[lo];
      path.style.strokeDashoffset = `${L - cur}`;
      const p = path.getPointAtLength(cur);
      tip.setAttribute("cx", `${p.x}`);
      tip.setAttribute("cy", `${p.y}`);
      tip.style.opacity = revealing || cur <= 0 || cur >= L ? "0" : "1";
      if (cur >= L) endEl?.classList.add("in");
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    let rb = 0;
    const rebuild = () => {
      window.clearTimeout(rb);
      rb = window.setTimeout(build, 120);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", rebuild);
    const ro = "ResizeObserver" in window ? new ResizeObserver(rebuild) : null;
    const main = root.querySelector("main");
    if (ro && main) ro.observe(main);
    document.fonts?.ready.then(rebuild);
    window.addEventListener("load", rebuild);
    build();

    // With a hero loop, wait for it to finish drawing, then run on from its tail.
    const hasStart = !!root.querySelector("[data-thread-start]");
    const t1 = window.setTimeout(
      () => {
        ready = true;
        if (reduce) return;
        path.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.3,.6,.3,1)";
        draw();
        window.setTimeout(() => {
          path.style.transition = "";
          revealing = false;
          draw();
        }, 1150);
      },
      reduce ? 0 : hasStart ? 1650 : 300,
    );

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", rebuild);
      window.removeEventListener("load", rebuild);
      ro?.disconnect();
      window.clearTimeout(rb);
      window.clearTimeout(t1);
      if (raf) cancelAnimationFrame(raf);
    };
    // Rebuilt from scratch on every marketing route: each page has its own hero and sections.
  }, [pathname]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[2] w-full overflow-visible"
      style={{ height: 0 }}
    >
      <path
        ref={pathRef}
        d=""
        fill="none"
        stroke="var(--signal-line)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle ref={tipRef} r={4.5} cx={-20} cy={-20} fill="var(--signal)" style={{ transition: "opacity .25s" }} />
    </svg>
  );
}
