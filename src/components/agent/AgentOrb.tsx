"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Doodle } from "@/components/ui/Doodle";
import { orbHue, type OrbState, type OrbTheme } from "@/lib/agent-orb";
import {
  cachedSnapshot,
  loadOrbScene,
  orbSnapshot,
  releaseLiveSlot,
  takeLiveSlot,
  webglAvailable,
} from "./orb-support";

/* An agent's face: its glass creature (orb-scene.ts), drawn from the agent's existing avatar seed.
   People keep their doodles; only agents wear orbs.

   - live: its own canvas and animation loop, for the big spots (agent page, briefing player,
     the settings and onboarding preview, the meeting room). It floats, wobbles, blinks and sways;
     `state` tilts it and widens its eyes while listening, opens its mouth and speeds the liquid
     while speaking. It pauses off-screen and in a hidden tab, and under reduced motion it draws
     one still frame.
   - still: a snapshot from one shared offscreen renderer, cached per seed, size and theme, for the
     small spots (sidebar, lists, chips). Until it is ready a soft circle in the agent's hue holds
     the place, so nothing moves.

   Either way it fills its parent (the existing round frame) on a transparent canvas. The theme is
   read from the nearest `data-theme` (the app's dark mode); on dark the creature gets its halo and
   floor glow, on the light cream page it does not. Without WebGL it falls back to the doodle. */

export type { OrbState };

const FRAME_MS = 1000 / 30;

function useHostTheme(ref: RefObject<HTMLElement>): OrbTheme | null {
  const [theme, setTheme] = useState<OrbTheme | null>(null);
  useEffect(() => {
    const host = ref.current?.closest("[data-theme]");
    const read = () => setTheme(host?.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    if (!host) return;
    const mo = new MutationObserver(read);
    mo.observe(host, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [ref]);
  return theme;
}

export function AgentOrb({
  seed,
  mode = "still",
  state = "idle",
  size,
  label,
  className = "",
}: {
  seed: string;
  mode?: "live" | "still";
  /** live only: what the agent is doing right now */
  state?: OrbState;
  /** the frame's size in CSS pixels; sets the still snapshot's resolution */
  size: number;
  /** accessible name, e.g. "Samar's agent"; omit when a visible name sits beside it */
  label?: string;
  className?: string;
}) {
  const wrap = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useHostTheme(wrap);
  const [fallback, setFallback] = useState(false);
  const [liveDenied, setLiveDenied] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [liveReady, setLiveReady] = useState(false);
  const live = mode === "live" && !liveDenied;

  const stateRef = useRef(state);
  stateRef.current = state;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const view = useRef<{ setTheme(t: OrbTheme): void; redraw(): void } | null>(null);

  /* still: a cached snapshot */
  useEffect(() => {
    if (live || !theme) return;
    setFallback(false);
    if (!webglAvailable()) {
      setFallback(true);
      return;
    }
    const hit = cachedSnapshot(seed, size, theme);
    if (hit) {
      setUrl(hit);
      return;
    }
    let alive = true;
    orbSnapshot(seed, size, theme).then(
      (u) => {
        if (alive) setUrl(u);
      },
      (err: unknown) => {
        console.warn("[agent-orb] still render failed", err);
        if (alive) setFallback(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [live, seed, size, theme]);

  /* live: its own renderer and loop */
  const themeKnown = theme !== null;
  useEffect(() => {
    if (!live || !themeKnown) return;
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    if (!webglAvailable()) {
      setFallback(true);
      return;
    }
    if (!takeLiveSlot()) {
      setLiveDenied(true);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let orb: import("./orb-scene").OrbView | null = null;
    let raf = 0;
    let visible = true;
    let last = 0;
    const start = performance.now();

    const draw = (now: number, dt: number) => orb?.frame((now - start) / 1000, dt, stateRef.current, reduce);
    const running = () => !reduce && visible && !document.hidden;
    const loop = (now: number) => {
      raf = 0;
      if (!orb || disposed) return;
      // 30 frames a second is plenty for a slow float and keeps an orb that stays on screen
      // for a whole meeting light on the battery.
      if (now - last < FRAME_MS - 2) {
        schedule();
        return;
      }
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      draw(now, dt);
      schedule();
    };
    const schedule = () => {
      if (!raf && orb && running()) {
        if (!last) last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };
    const fit = () => {
      if (!orb) return;
      orb.resize(Math.max(1, box.clientWidth || size));
      if (!running()) draw(performance.now(), 0);
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) schedule();
      else stop();
    });
    io.observe(box);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    const onVis = () => (document.hidden ? stop() : schedule());
    document.addEventListener("visibilitychange", onVis);

    loadOrbScene()
      .then((m) => {
        if (disposed) return;
        orb = m.createOrbView(el, seed, themeRef.current ?? "light", box.clientWidth || size);
        view.current = {
          setTheme: (t) => orb?.setTheme(t),
          redraw: () => {
            if (!running()) draw(performance.now(), 0);
          },
        };
        fit();
        draw(performance.now(), 0);
        setLiveReady(true);
        schedule();
      })
      .catch((err: unknown) => {
        if (disposed) return;
        console.warn("[agent-orb] live view failed, showing a still", err);
        setLiveDenied(true);
      });

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      view.current = null;
      orb?.dispose();
      orb = null;
      setLiveReady(false);
      releaseLiveSlot();
    };
  }, [live, themeKnown, seed, size]);

  /* a theme flip or a state change while paused redraws the live frame in place */
  useEffect(() => {
    if (!theme || !view.current) return;
    view.current.setTheme(theme);
    view.current.redraw();
  }, [theme]);
  useEffect(() => {
    view.current?.redraw();
  }, [state]);

  const hue = orbHue(seed);
  const ready = fallback || (live ? liveReady : Boolean(url));

  return (
    <span
      ref={wrap}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-orb={live ? "live" : "still"}
      data-ready={ready ? "" : undefined}
      className={`relative block h-full w-full ${className}`}
    >
      {fallback ? (
        <Doodle seed={seed} className="block h-full w-full" />
      ) : (
        <>
          <span
            aria-hidden
            className={`absolute inset-[14%] rounded-full transition-opacity duration-200 motion-reduce:transition-none ${ready ? "opacity-0" : "opacity-100"}`}
            style={{ background: `radial-gradient(circle at 42% 38%, ${hue.lite}66 0%, ${hue.mid}55 55%, ${hue.mid}00 100%)` }}
          />
          {live ? (
            <canvas ref={canvas} aria-hidden className="absolute inset-0 block h-full w-full" />
          ) : url ? (
            // A data URL rendered on this page; next/image has nothing to optimise here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" aria-hidden draggable={false} className="absolute inset-0 block h-full w-full" />
          ) : null}
        </>
      )}
    </span>
  );
}
