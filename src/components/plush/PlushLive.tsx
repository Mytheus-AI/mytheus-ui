"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { PLUSH_STAGE_VIEW, plushLiveView, plushSpec, type PlushView } from "@/lib/plush";
import { createPlushMotion, type LookTarget, type PlushMotion, type PlushState } from "@/lib/plush-motion";
import { PLUSH_CONTEXT, startPlushProgram, type PlushProgram } from "./gl";
import { Plush } from "./Plush";
import { PlushPlaceholder } from "./PlushFallback";
import { plushSoftwareRendering, releaseLiveSlot, takeLiveSlot } from "./stills";

/* A live plush, for the large surfaces only (the agent page, the briefing player, the agent's
   tile and panel in the meeting room, the picker's preview). It has its own canvas and runs the
   approved prototype's animation system (lib/plush-motion.ts):

   - `state`: idle, listening (floor ripples flow in, it leans toward the speaker and nods),
     speaking (a mouth, sound arcs, sway and a bounce on voice peaks), thinking (a spark orbits
     its head and the eyes follow it), happy (both eyes smile and it hops, briefly).
   - Its eyes follow the pointer while it moves, then wander. A click winks, a double click hops,
     hovering perks it up.
   - `followInput`: while the user types in that field (or any field inside that element), the
     eyes follow the caret and the body bobs on each key; Enter celebrates.
   - Left alone it fidgets, then gets drowsy, then sleeps; any activity startles it awake.

   It is polite about resources: at most MAX_LIVE (4) run at once and the rest show their still;
   it pauses off screen and in a hidden tab; the pixel ratio is capped at 2, and drops if frames
   come slowly. Under prefers-reduced-motion, without WebGL2, on a machine that draws WebGL on
   the CPU, or if its context is lost, it is the still. */

export type { PlushState };

type ElementSource = RefObject<HTMLElement | null> | string | null | undefined;

function resolve(source: ElementSource): HTMLElement | null {
  if (!source) return null;
  if (typeof source === "string") return document.querySelector<HTMLElement>(source);
  return source.current;
}
/** Whether `target` is the followed field, or sits inside the followed element. */
function follows(source: ElementSource, target: Element): boolean {
  if (!source) return false;
  if (typeof source === "string") return target.closest(source) !== null;
  return source.current !== null && source.current.contains(target);
}

const isTextField = (el: unknown): el is HTMLInputElement | HTMLTextAreaElement =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !/^(checkbox|radio|button|submit|range|file|color)$/.test(el.type));

/** Full eye travel is reached this far from the character, in CSS pixels (the prototype's cell). */
const REACH = 420;
/** Boxes at least this wide zoom out to show the listening ripples and the speaking arcs; smaller
    ones (the sidebar head, the briefing face) keep the character large and leave them out. */
const WIDE_FROM = 96;
/** The thinking spark orbits out to 1.21 units, the sound arcs to 1.44, the ripples further. */
const THINK_SPAN = 2.56;
const VOICE_SPAN = 3.0;

export function PlushLive({
  seed,
  state = "idle",
  size,
  fit = "frame",
  label,
  className = "",
  followInput,
  speaker,
  level,
  celebrate,
  drowsyAfter = 45,
  asleepAfter = 90,
  allowSoftware = false,
}: {
  seed: string;
  state?: PlushState;
  /** the box's width in CSS pixels, if known (sizes the still it falls back to) */
  size?: number;
  /** "frame" fills a round or square frame; "stage" is the prototype's wider camera */
  fit?: "frame" | "stage";
  /** accessible name; omit when a visible name sits beside it */
  label?: string;
  className?: string;
  /** a text field, or an element holding some, to watch while the user types (a ref or a selector) */
  followInput?: ElementSource;
  /** while listening: the element of whoever is speaking (a ref or a selector) */
  speaker?: ElementSource;
  /** a real audio level, 0..1, or a function that reads one each frame; simulated when absent */
  level?: number | null | (() => number | null | undefined);
  /** change this number to make it celebrate (a decision confirmed, a save) */
  celebrate?: number;
  /** seconds of no activity before it gets drowsy, and before it sleeps */
  drowsyAfter?: number;
  asleepAfter?: number;
  /** run live even where WebGL is drawn on the CPU (component tests in headless Chromium) */
  allowSoftware?: boolean;
}) {
  const spec = useMemo(() => plushSpec(seed), [seed]);
  const wrap = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // "pending" until the browser says whether motion is welcome; the server renders this too
  const [mode, setMode] = useState<"pending" | "live" | "still">("pending");
  const [ready, setReady] = useState(false);
  const motionRef = useRef<PlushMotion | null>(null);

  const props = useRef({ state, followInput, speaker, level, spec });
  props.current = { state, followInput, speaker, level, spec };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMode(mq.matches ? "still" : "live");
    decide();
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  useEffect(() => {
    if (celebrate === undefined) return;
    motionRef.current?.celebrate(performance.now());
    // Only a change celebrates, not the first value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate]);
  useEffect(() => {
    if (mode !== "live") return;
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    if ((!allowSoftware && plushSoftwareRendering()) || !takeLiveSlot()) {
      setMode("still");
      return;
    }
    let gl: WebGL2RenderingContext | null = null;
    let build: ReturnType<typeof startPlushProgram>;
    try {
      gl = el.getContext("webgl2", PLUSH_CONTEXT);
      if (!gl) throw new Error("plush: WebGL2 is unavailable");
      build = startPlushProgram(gl);
    } catch {
      releaseLiveSlot();
      setMode("still");
      return;
    }
    // the shader compiles in the background; the soft circle holds the place until it is ready
    let draw: PlushProgram | null = null;
    const start = performance.now();
    const first = props.current.spec;
    const motion = createPlushMotion({ phase: first.phase * 6, side: first.side, drowsyAfter, asleepAfter, now: start });
    motionRef.current = motion;

    const view: PlushView = { ...PLUSH_STAGE_VIEW };
    let raf = 0;
    let visible = true;
    let disposed = false;
    let drawn = false;
    let lastDraw = 0;
    // frames arriving slowly (a weak GPU) lower the resolution, never the frame rate
    let scale = 1;
    let slow = 0;
    let counted = 0;
    let rect = box.getBoundingClientRect();
    let rectAt = 0;
    let dark = false;
    let pointer: [number, number] | null = null; // client px
    let pointerAt = -1e9;
    let field: HTMLInputElement | HTMLTextAreaElement | null = null;

    const toLook = (x: number, y: number): LookTarget => {
      const reach = Math.max(rect.width, REACH);
      return [((x - (rect.left + rect.width / 2)) / reach) * 1.3, (-(y - (rect.top + rect.height / 2)) / reach) * 1.3];
    };
    const lookAt = (target: HTMLElement | null): LookTarget | null => {
      if (!target || !target.isConnected) return null;
      const r = target.getBoundingClientRect();
      return r.width || r.height ? toLook(r.left + r.width / 2, r.top + r.height / 2) : null;
    };
    const caret = (): LookTarget | null => {
      if (!field || !field.isConnected) return null;
      const r = field.getBoundingClientRect();
      // the prototype's caret: it moves along the field as the text grows
      const line = field.value.slice(field.value.lastIndexOf("\n") + 1);
      return toLook(r.left + r.width * Math.min(1, line.length / 36), r.top + r.height / 2);
    };
    const fitCanvas = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1) * scale;
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed) return;
      if (!draw) {
        if (!build.ready()) {
          schedule();
          return;
        }
        try {
          draw = build.finish();
        } catch {
          setMode("still");
          return;
        }
      }
      // 60 frames a second at most, and a slow 20 while it sleeps
      const gap = motion.mood(now) === "asleep" ? 48 : 14;
      if (now - lastDraw < gap) {
        schedule();
        return;
      }
      if (lastDraw && drawn) {
        counted += 1;
        if (now - lastDraw > 34 && gap < 20 && now - lastDraw < 400) slow += 1;
        if (counted >= 24) {
          if (slow >= 16 && scale > 0.4) {
            scale *= 0.7;
            rectAt = 0;
          }
          counted = 0;
          slow = 0;
        }
      }
      lastDraw = now;
      if (now - rectAt > 250) {
        rect = box.getBoundingClientRect();
        rectAt = now;
        dark = box.closest("[data-theme]")?.getAttribute("data-theme") === "dark";
        fitCanvas();
      }
      const p = props.current;
      // a new seed (the picker) redraws on the same canvas; only the character changes
      const spec = p.spec;
      const base: PlushView = fit === "stage" ? PLUSH_STAGE_VIEW : plushLiveView(spec);
      const lv = typeof p.level === "function" ? p.level() : p.level;
      const hover = pointer !== null && pointer[0] >= rect.left && pointer[0] <= rect.right && pointer[1] >= rect.top && pointer[1] <= rect.bottom;
      const follow = resolve(p.followInput);
      const pose = motion.step(now, {
        state: p.state,
        pointer: pointer ? toLook(pointer[0], pointer[1]) : null,
        pointerAt,
        hover,
        caret: caret(),
        speaker: p.state === "listening" ? lookAt(resolve(p.speaker)) : null,
        glance: lookAt(field ?? follow),
        level: lv ?? null,
      });
      // Pull the camera back so the spark's orbit, the ripples and the sound arcs are never cut.
      const wide = rect.width >= WIDE_FROM ? Math.max(pose.listen, pose.speak) : 0;
      const span = Math.max(base.span, base.span + (THINK_SPAN - base.span) * pose.think, base.span + (VOICE_SPAN - base.span) * wide);
      const k = Math.max(pose.think, wide);
      view.span = span;
      view.cx = base.cx * (1 - k);
      view.cy = base.cy + (PLUSH_STAGE_VIEW.cy - base.cy) * k;
      draw.draw({ spec, pose, view, time: motion.time, width: el.width, height: el.height, ground: true, paper: !dark, stage: rect.width >= WIDE_FROM });
      if (!drawn) {
        drawn = true;
        setReady(true);
      }
      schedule();
    };
    const running = () => visible && !document.hidden;
    const schedule = () => {
      if (!raf && !disposed && running()) raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onMove = (e: PointerEvent) => {
      pointer = [e.clientX, e.clientY];
      pointerAt = e.timeStamp || performance.now();
      motion.act(pointerAt);
    };
    const onLeave = () => {
      pointer = null;
    };
    const onClick = (e: MouseEvent) => (e.detail >= 2 ? motion.doubleClick(performance.now()) : motion.click(performance.now()));
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (!isTextField(target) || !follows(props.current.followInput, target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab" || e.key === "Shift") return;
      field = target;
      const now = performance.now();
      if (e.key !== "Enter") {
        motion.key(now);
      } else if (target instanceof HTMLInputElement) {
        motion.key(now, true);
      } else if (!e.shiftKey && target.value.trim()) {
        // In a composer Enter sends and the field empties; in a plain textarea it is a new line.
        motion.key(now);
        requestAnimationFrame(() => {
          if (!disposed && target.value === "") motion.celebrate(performance.now());
        });
      } else {
        motion.key(now);
      }
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      setMode("still");
    };
    const onVis = () => (document.hidden ? stop() : schedule());

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      if (visible) schedule();
      else stop();
    });
    io.observe(box);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onVis);
    box.addEventListener("click", onClick);
    el.addEventListener("webglcontextlost", onLost);
    fitCanvas();
    schedule();

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onVis);
      box.removeEventListener("click", onClick);
      el.removeEventListener("webglcontextlost", onLost);
      motionRef.current = null;
      draw?.dispose();
      // hand the context back at once; browsers only allow about 16 a page
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      releaseLiveSlot();
      setReady(false);
    };
  }, [mode, fit, drowsyAfter, asleepAfter, allowSoftware]);

  if (mode === "still") return <Plush seed={seed} size={size} title={label} className={className} />;

  return (
    <span
      ref={wrap}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-plush={mode === "live" ? "live" : "pending"}
      data-ready={ready ? "" : undefined}
      data-state={state}
      className={`plush ${className}`}
    >
      <PlushPlaceholder spec={spec} hidden={ready} />
      {mode === "live" ? <canvas ref={canvas} aria-hidden /> : null}
    </span>
  );
}
