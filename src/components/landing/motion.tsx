"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useInView,
  animate,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { useRef, useState, useEffect, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Shared Framer Motion primitives for the landing page.              */
/*  Smooth + professional: subtle fade and a short upward move, never  */
/*  bouncy. Everything degrades to "instantly visible" under           */
/*  prefers-reduced-motion.                                            */
/* ------------------------------------------------------------------ */

const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * Reveal — fades + lifts its children in once, when scrolled into view.
 * `delay` staggers siblings; `as` is unused (kept simple via a div wrapper).
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 22,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger — a container that reveals its direct <Item> children in sequence.
 * Use with <StaggerItem> for lists/grids.
 */
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function Stagger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : containerVariants}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? undefined : itemVariants}>
      {children}
    </motion.div>
  );
}

/**
 * CTAButton — the lilac primary call-to-action. Slight scale on hover and a
 * gentle press, via Framer Motion. Renders a Next <Link>.
 */
export function CTAButton({
  href,
  children,
  className = "",
  variant = "solid",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "solid" | "ghost";
}) {
  const reduce = useReducedMotion();
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors";
  const look =
    variant === "solid"
      ? "bg-signal text-white shadow-[0_16px_36px_-18px_rgba(117,89,201,0.85)] hover:bg-signal-deep"
      : "border border-line-strong text-ink hover:border-signal hover:text-signal";

  return (
    <Magnetic strength={0.4}>
      <motion.span
        className="inline-flex"
        whileHover={reduce ? undefined : { scale: 1.03 }}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 26 }}
      >
        <Link href={href} className={`${base} ${look} ${className}`}>
          {children}
        </Link>
      </motion.span>
    </Magnetic>
  );
}

/** A bare motion.div re-export for one-off needs. */
export function MotionDiv(props: HTMLMotionProps<"div">) {
  return <motion.div {...props} />;
}

/**
 * Parallax — scroll-linked vertical drift. The child glides as the element
 * travels through the viewport, springed so it feels weighty, not twitchy.
 */
export function Parallax({
  children,
  className = "",
  distance = 60,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yRaw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(yRaw, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

/**
 * ScrubReveal — ties a smooth fade + rise + slight scale directly to scroll
 * position (scrubbed, not a one-shot trigger). Great for big statements that
 * should "develop" as you scroll through them. Springed for buttery motion.
 */
export function ScrubReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "end 0.45"],
  });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 30, mass: 0.5 });
  const opacity = useTransform(p, [0, 0.6], [0.15, 1]);
  const y = useTransform(p, [0, 1], [56, 0]);
  const scale = useTransform(p, [0, 1], [0.95, 1]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduce ? undefined : { opacity, y, scale }}
    >
      {children}
    </motion.div>
  );
}

/** Float — a continuous, gentle vertical bob for "live" hero elements. */
export function Float({
  children,
  className = "",
  amount = 10,
  duration = 7,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduce ? undefined : { y: [0, -amount, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/** A thin lilac bar pinned to the top that fills with overall page scroll. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-signal"
      style={{ scaleX }}
    />
  );
}

/* ================================================================== */
/*  Signature primitives — the "hand-set" motion language.            */
/* ================================================================== */

/**
 * WordReveal — splits a heading into words, each masked behind an
 * overflow-hidden line and lifted into view with a stagger. The core
 * editorial reveal. Pass plain text via `text`; render an italic/colored
 * accent by wrapping a trailing portion with `accent` + `accentClass`.
 */
type WordRevealTag = "h1" | "h2" | "h3" | "p" | "span" | "div";

const MOTION_TAGS = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  div: motion.div,
} as const;

export function WordReveal({
  text,
  accent,
  className = "",
  accentClass = "italic text-signal-deep",
  as = "h2",
  delay = 0,
}: {
  text: string;
  accent?: string;
  className?: string;
  accentClass?: string;
  as?: WordRevealTag;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const accentWords = accent ? accent.split(" ") : [];
  const all = [
    ...words.map((w) => ({ w, accent: false })),
    ...accentWords.map((w) => ({ w, accent: true })),
  ];

  const As = as;
  const MotionAs = MOTION_TAGS[as];

  if (reduce) {
    return (
      <As className={className}>
        {text}
        {accent ? <span className={accentClass}> {accent}</span> : null}
      </As>
    );
  }

  return (
    <MotionAs
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ staggerChildren: 0.055, delayChildren: delay / 1000 }}
    >
      {all.map((item, i) => (
        <span
          key={`${item.w}-${i}`}
          className="inline-block overflow-hidden align-bottom"
          style={{ paddingBottom: "0.12em", marginBottom: "-0.12em" }}
        >
          <motion.span
            className={`inline-block ${item.accent ? accentClass : ""}`}
            variants={{
              hidden: { y: "115%" },
              show: {
                y: 0,
                transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
              },
            }}
          >
            {item.w}
            {i < all.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </MotionAs>
  );
}

/**
 * MaskReveal — a single block lifted from behind a mask when scrolled
 * into view. Use for paragraphs, images, or any element that should
 * "rise out of the page".
 */
export function MaskReveal({
  children,
  className = "",
  delay = 0,
  y = 80,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <span className="block overflow-hidden">
      <motion.div
        className={className}
        initial={{ y, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "0px 0px -12% 0px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: delay / 1000 }}
      >
        {children}
      </motion.div>
    </span>
  );
}

/**
 * Magnetic — the child drifts toward the cursor while hovered, then
 * springs back on leave. Wrap a button/link. Disabled for coarse
 * pointers and reduced motion.
 */
export function Magnetic({
  children,
  className = "",
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.3 });

  function onMove(e: React.MouseEvent) {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={reduce ? undefined : { x: sx, y: sy }}
      className={`inline-flex [@media(pointer:coarse)]:!translate-x-0 [@media(pointer:coarse)]:!translate-y-0 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * Marquee — an infinite horizontal ribbon. Children are duplicated so the
 * loop is seamless; pauses on hover. `reverse` flips direction.
 */
export function Marquee({
  children,
  className = "",
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
}) {
  return (
    <div className={`group relative flex overflow-hidden ${className}`}>
      <div
        className="marquee-track flex flex-none items-center"
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

/**
 * Tilt — pointer-driven 3D tilt for cards/mockups. Subtle by default.
 */
export function Tilt({
  children,
  className = "",
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 18 });
  const sry = useSpring(ry, { stiffness: 150, damping: 18 });

  function onMove(e: React.MouseEvent) {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max);
    rx.set(-py * max);
  }
  function reset() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={
        reduce
          ? undefined
          : { rotateX: srx, rotateY: sry, transformPerspective: 1000 }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * CountUp — animates a number from 0 to `to` when scrolled into view.
 * Use only for honest, real figures.
 */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  duration = 1.6,
  className = "",
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  const display = Number.isInteger(to) ? Math.round(val) : val.toFixed(1);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/** Small download glyph used on the primary CTA. */
export function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 2.5v7m0 0L5 6.5m3 3 3-3M3 12.5h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
