"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/Logo";

/* ------------------------------------------------------------------ */
/*  Loader — "Standing Wave". A field of slack instrument threads      */
/*  spans the screen. As the page loads, a single clay pulse travels   */
/*  left-to-right and plucks them; each thread answers with a decaying */
/*  ripple, warming from ink to clay where the pulse passes. At 100%   */
/*  the field collapses into one bright clay line and the panel wipes   */
/*  right, uncovering the hero left-to-right. Calm and premium.        */
/*                                                                      */
/*  Smoothness: each thread is ONE continuous path with a travelling   */
/*  gradient crest (≈28 strokes/frame), and the counter is updated     */
/*  imperatively so the component never re-renders during the load.    */
/* ------------------------------------------------------------------ */

const DURATION = 2000; // ms — the pulse crosses over this window
const EASE = [0.16, 1, 0.3, 1] as const;
const THREADS = 14;

export function Loader() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false); // curtain wiped

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);

  // lock scroll while the panel is up
  useEffect(() => {
    document.body.style.overflow = done ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [done]);

  // one effect owns the whole animation: progress, counter, and canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(canvas);
    const pick = (name: string, fb: string) =>
      styles.getPropertyValue(name).trim() || fb;
    const ink = toRgb(pick("--ink-3", "#6f6a5f"));
    const clay = toRgb(pick("--signal", "#d97757"));

    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const setCount = (p: number) => {
      if (counterRef.current)
        counterRef.current.textContent = String(Math.round(p)).padStart(3, "0");
    };

    // draw one frame. p in [0,1] = pulse position; collapse in [0,1] = resolve
    const render = (time: number, p: number, collapse: number) => {
      ctx.clearRect(0, 0, w, h);
      const step = Math.max(4, w / 280); // dense enough to read as a curve
      const front = p * w;
      const sigma = w * 0.16;
      const midY = h / 2;
      const padY = h * 0.08;
      const span = h - padY * 2;
      const gap = span / (THREADS - 1);
      const ampMax = gap * 0.34 * (1 - collapse);
      const omega = time * 1.8;

      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      for (let i = 0; i < THREADS; i++) {
        const f = i / (THREADS - 1);
        let baseY = padY + f * span;
        baseY = baseY + (midY - baseY) * collapse; // converge to centre
        const k = (Math.PI * 2 * (1.1 + i * 0.22)) / w;
        const phase = i * 0.7;

        const yAt = (x: number) => {
          const d = x - front;
          const packet = Math.exp(-(d * d) / (2 * sigma * sigma));
          const amp = ampMax * (0.14 + 0.86 * packet);
          return baseY + amp * Math.sin(k * x - omega + phase);
        };

        // 1) faint continuous base line — one path, one stroke
        ctx.beginPath();
        for (let x = 0; x <= w; x += step) {
          const y = yAt(x);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const bc = mix(ink, clay, collapse);
        ctx.strokeStyle = `rgba(${bc[0]}, ${bc[1]}, ${bc[2]}, ${
          0.16 + 0.64 * collapse
        })`;
        ctx.lineWidth = 1.1 + collapse * 1.3;
        ctx.stroke();

        // 2) bright clay crest, windowed around the pulse, gradient-faded
        if (collapse < 0.95) {
          const x0 = Math.max(0, front - sigma * 1.9);
          const x1 = Math.min(w, front + sigma * 1.9);
          if (x1 > x0) {
            ctx.beginPath();
            let moved = false;
            for (let x = x0; x <= x1; x += step) {
              const y = yAt(x);
              if (!moved) {
                ctx.moveTo(x, y);
                moved = true;
              } else ctx.lineTo(x, y);
            }
            const grad = ctx.createLinearGradient(x0, 0, x1, 0);
            const c = (a: number) =>
              `rgba(${clay[0]}, ${clay[1]}, ${clay[2]}, ${a})`;
            const peak = 0.9 * (1 - collapse);
            grad.addColorStop(0, c(0));
            grad.addColorStop(0.5, c(peak));
            grad.addColorStop(1, c(0));
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }
        }
      }
    };

    if (reduce) {
      setCount(100);
      render(0, 0.5, 0); // one calm static frame
      const to = setTimeout(() => setDone(true), 500);
      return () => {
        clearTimeout(to);
        ro.disconnect();
      };
    }

    let raf = 0;
    let start = 0;
    let completed = false;
    let collapseStart = 0;
    let lift = 0;
    const loop = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      const p = 1 - Math.pow(1 - t, 3); // easeOutCubic — honest progress
      setCount(p * 100);

      let collapse = 0;
      if (t >= 1) {
        if (!completed) {
          completed = true;
          collapseStart = now;
          lift = window.setTimeout(() => setDone(true), 780);
        }
        collapse = easeOut(Math.min(1, (now - collapseStart) / 520));
      }

      render(now / 1000, p, collapse);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(lift);
      ro.disconnect();
    };
  }, [reduce]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          aria-hidden
          className="mesh-field grain fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-bg px-6 will-change-transform"
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { x: "101%" }}
          transition={{ duration: 1, ease: EASE }}
        >
          {/* the resonance field — spans the whole viewport, left to right */}
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          {/* the collapsed clay line, carried onto the curtain's trailing
              edge — as the panel wipes right it sweeps the screen and
              "draws" the hero open. Under reduce the panel just fades. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-[2.5px]"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--signal) 20%, var(--signal-bright) 50%, var(--signal) 80%, transparent)",
              boxShadow: "0 0 24px 2px var(--signal-glow)",
            }}
          />

          {/* wordmark + counter, lifted above the field. On the wipe it
              counter-slides a touch, so the curtain reads as two layers. */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            exit={reduce ? undefined : { x: "-24vw", opacity: 0.4 }}
            transition={{ duration: 1, ease: EASE }}
          >
            {/* soft cream halo keeps the type legible over the threads */}
            <div
              aria-hidden
              className="absolute -inset-x-28 -inset-y-16"
              style={{
                background:
                  "radial-gradient(closest-side, var(--bg) 38%, transparent 78%)",
              }}
            />
            {/* logo-breathe is applied unconditionally: the reduced-motion CSS
                block already kills the animation, and branching on the hook
                here desyncs SSR and a reduced-motion client (hydration error) */}
            <LogoMark size={40} className="relative mb-3 logo-breathe" />
            <span className="wordmark relative text-[clamp(2.6rem,8vw,4.2rem)] font-normal leading-none tracking-[-0.02em] text-ink">
              Mytheus
            </span>
            {/* minimal load progress — stays in mono (Refinity numerals are watermarked) */}
            <span
              ref={counterRef}
              className="relative mt-6 font-mono text-[0.72rem] tabular-nums tracking-[0.42em] text-signal"
            >
              000
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---- small color helpers ---- */

type RGB = [number, number, number];

function toRgb(color: string): RGB {
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const nums = color
    .replace(/rgba?\(|\)/g, "")
    .split(",")
    .map((n) => parseFloat(n));
  return [nums[0] || 0, nums[1] || 0, nums[2] || 0];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  const u = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
