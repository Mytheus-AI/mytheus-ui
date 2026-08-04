"use client";

import { useEffect, useRef } from "react";

/* ----------------------------------------------------------------------- */
/*  ConnectedGraph — a small living network of nodes and edges, rendered    */
/*  on a canvas. It replaces the glossy Orb: same wrapper-sized footprint   */
/*  and the same prop surface (className / signal / glow / float), so it    */
/*  drops into the existing layouts unchanged.                              */
/*                                                                          */
/*  Everything scales to the box it lives in, so it reads as a clean        */
/*  constellation whether it's a 64px agent orb or a 300px backdrop. It is  */
/*  alive: each node wanders on its own slowly-turning heading (no two move */
/*  alike), nodes breathe and randomly twinkle, edges fade with distance,   */
/*  and signal pulses fire along the connections (a stand-in for the        */
/*  nexus_knowledge graph).                                                 */
/*                                                                          */
/*  The pointer is the centrepiece: it TRAPS nearby nodes into its halo     */
/*  (a firm tug while pressed, a gentle one on hover), lights up the nodes   */
/*  around it, and a press-drag grabs the nearest node so the whole web     */
/*  streaks along behind the cursor. Tracked at the window level, so it     */
/*  stays interactive even inside pointer-events-none containers. Colours   */
/*  read from the CSS token layer so the graph always matches the theme.    */
/*                                                                          */
/*  The rAF loop sleeps whenever the canvas is offscreen or the tab is     */
/*  hidden, so the O(n²) edge pass never burns frames nobody can see.      */
/*                                                                          */
/*  prefers-reduced-motion renders a single calm static frame.             */
/* ----------------------------------------------------------------------- */

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** radius factor 0.7..1.3, multiplied by the base node radius at draw time */
  rf: number;
  /** depth 0..1 — drives size, brightness and bloom for a layered feel */
  z: number;
  /** phase offset so nodes breathe out of sync */
  phase: number;
  /** current heading (radians) for the organic wander drift */
  wander: number;
  /** angular velocity of that heading — re-aimed at random intervals */
  spin: number;
  /** personal drift strength so no two nodes move at the same pace */
  speed: number;
  /** 0..1 twinkle that randomly reignites, then decays — adds life/noise */
  spark: number;
};

type Pulse = { a: number; b: number; t: number; speed: number };
type Ripple = { x: number; y: number; t: number };

const TAU = Math.PI * 2;

export function ConnectedGraph({
  className = "",
  signal = false,
  glow,
  float = false,
  nodeCount = 22,
  interactive = true,
}: {
  className?: string;
  /** lilac/clay "signal" palette vs the warm neutral palette */
  signal?: boolean;
  /** soft radial halo behind the graph (defaults to on when `signal`) */
  glow?: boolean;
  /** add the shared `.floaty` bob */
  float?: boolean;
  /** target node count (auto-thinned for small boxes so it never clutters) */
  nodeCount?: number;
  /** pointer attraction + node brightening on hover */
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const showGlow = glow ?? signal;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // resolve palette from the token layer so theme/dark mode just work
    const styles = getComputedStyle(canvas);
    const pick = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const palette = signal
      ? {
          node: pick("--signal", "#d97757"),
          nodeBright: pick("--signal-bright", "#e8a489"),
          edge: pick("--signal-deep", "#bd5d3a"),
        }
      : {
          node: pick("--line-2", "#b8af9c"),
          nodeBright: pick("--bg-2", "#f4f0e7"),
          edge: pick("--ink-3", "#a59c89"),
        };
    // the specular glint reads from the token layer too — the paper tone,
    // so the glass highlight always matches the page it sits on
    const glint = pick("--bg", "#ffffff");

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let tick = 0;

    let nodes: Node[] = [];
    const pulses: Pulse[] = [];
    const ripples: Ripple[] = [];
    const pointer = { x: -1, y: -1, active: false, down: false, glow: 0 };
    // index of the node currently grabbed by a press-drag, or -1 for none
    let grabbed = -1;

    // density target: ~one node per 5200px², clamped to [5, nodeCount]. A 64px
    // orb stays sparse; a full-screen backdrop fills out. Everything else then
    // derives from the resulting node spacing, so the look holds at any size.
    const targetCount = () =>
      Math.max(5, Math.min(nodeCount, Math.round((width * height) / 5200)));

    const seed = () => {
      nodes = Array.from({ length: targetCount() }, () => {
        const z = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          // a little random initial momentum so the field never starts frozen
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          rf: 0.7 + z * 0.6,
          z,
          phase: Math.random() * TAU,
          wander: Math.random() * TAU,
          spin: (Math.random() - 0.5) * 0.04,
          speed: 0.5 + Math.random() * 1.1,
          spark: 0,
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!nodes.length) seed();
    };

    // average gap between nodes — the unit every other size derives from, so a
    // tiny orb and a full-screen field both read as the same kind of network.
    const spacing = () =>
      Math.sqrt((width * height) / Math.max(1, nodes.length));
    // each node links to its near neighbours (~1.7 gaps out), never the whole box
    const linkDist = () => spacing() * 1.7;
    // small glassy dots: gently larger where nodes are sparse, but always capped
    const baseR = () => Math.max(1.3, Math.min(4.4, spacing() * 0.085));
    const liveR = (n: Node) =>
      baseR() * n.rf * (1 + 0.16 * Math.sin(tick * 0.04 + n.phase)) + 0.3;

    /* -------- glassy node: bloom + translucent core + specular dot ------ */
    const drawNode = (n: Node, lit: number) => {
      const r = liveR(n);
      const bright = lit > 0.05;
      const core = bright ? palette.nodeBright : palette.node;
      // brightness rides on depth so far nodes sit back
      const depth = 0.5 + n.z * 0.5;

      // outer bloom (additive so overlaps glow into one another) — kept faint
      // so the field stays a quiet backdrop, brightening only near the cursor
      ctx.globalCompositeOperation = "lighter";
      const bloomR = r * (2.6 + lit * 1.2);
      const bloom = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, bloomR);
      bloom.addColorStop(0, withAlpha(core, (0.1 + lit * 0.34) * depth));
      bloom.addColorStop(1, withAlpha(core, 0));
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(n.x, n.y, bloomR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // glassy core — radial fill from a bright rim to a translucent centre
      const cr = r * (1 + lit * 0.8);
      const body = ctx.createRadialGradient(
        n.x - r * 0.3,
        n.y - r * 0.3,
        r * 0.1,
        n.x,
        n.y,
        cr
      );
      body.addColorStop(0, withAlpha(palette.nodeBright, 0.95 * depth));
      body.addColorStop(0.55, withAlpha(core, 0.9 * depth));
      body.addColorStop(1, withAlpha(palette.edge, 0.5 * depth));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(n.x, n.y, cr, 0, Math.PI * 2);
      ctx.fill();

      // specular highlight — the little glass glint, up and to the left
      ctx.fillStyle = withAlpha(glint, (0.5 + lit * 0.4) * depth);
      ctx.beginPath();
      ctx.arc(n.x - r * 0.34, n.y - r * 0.34, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = () => {
      // nothing to paint in a zero-area box (e.g. a `hidden`/pre-layout
      // container). Bailing also avoids spacing()→0 making maxLink 0, which
      // would turn edge alpha into NaN and throw in addColorStop.
      if (width <= 0 || height <= 0) return;
      ctx.clearRect(0, 0, width, height);
      const maxLink = linkDist();
      const edgeW = Math.max(0.5, Math.min(1.4, spacing() * 0.011));

      // cursor halo — a soft pool of light following the pointer
      if (interactive && pointer.glow > 0.01) {
        ctx.globalCompositeOperation = "lighter";
        const halo = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          maxLink * 1.1
        );
        halo.addColorStop(0, withAlpha(palette.nodeBright, 0.11 * pointer.glow));
        halo.addColorStop(1, withAlpha(palette.nodeBright, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
      }

      // edges first, under the nodes — gradient + distance falloff
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > maxLink) continue;
          const alpha = (1 - d / maxLink) * 0.3;
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, withAlpha(palette.edge, alpha * (0.5 + a.z * 0.5)));
          grad.addColorStop(0.5, withAlpha(palette.node, alpha * 0.7));
          grad.addColorStop(1, withAlpha(palette.edge, alpha * (0.5 + b.z * 0.5)));
          ctx.strokeStyle = grad;
          ctx.lineWidth = edgeW + (a.z + b.z) * 0.3;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // signal pulses travelling along the edges
      ctx.globalCompositeOperation = "lighter";
      const pulseR = Math.max(2, Math.min(6, spacing() * 0.05));
      for (const p of pulses) {
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) continue;
        const px = a.x + (b.x - a.x) * p.t;
        const py = a.y + (b.y - a.y) * p.t;
        const fade = Math.sin(p.t * Math.PI); // bright in the middle of the run
        const g = ctx.createRadialGradient(px, py, 0, px, py, pulseR);
        g.addColorStop(0, withAlpha(palette.nodeBright, 0.55 * fade));
        g.addColorStop(1, withAlpha(palette.nodeBright, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, pulseR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // filaments from the web to the cursor head — the net reaching to follow
      if (interactive && pointer.active) {
        for (const n of nodes) {
          const pd = Math.hypot(n.x - pointer.x, n.y - pointer.y);
          if (pd < maxLink) {
            const lit = 1 - pd / maxLink;
            ctx.strokeStyle = withAlpha(
              palette.nodeBright,
              lit * (pointer.down ? 0.85 : 0.55)
            );
            ctx.lineWidth = edgeW + lit * 0.5;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      // click ripples — expanding rings of light
      ctx.globalCompositeOperation = "lighter";
      for (const rp of ripples) {
        const radius = rp.t * maxLink * 1.6;
        const fade = 1 - rp.t;
        ctx.strokeStyle = withAlpha(palette.nodeBright, 0.5 * fade);
        ctx.lineWidth = edgeW * 1.5 * fade + 0.4;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";

      // nodes on top — brightened by their own twinkle, the cursor, the grab,
      // and any passing ripple front
      const flashBand = Math.max(12, Math.min(60, spacing() * 0.45));
      for (let ni = 0; ni < nodes.length; ni++) {
        const n = nodes[ni];
        let lit = n.spark * 0.8;
        if (interactive && pointer.active) {
          const pd = Math.hypot(n.x - pointer.x, n.y - pointer.y);
          if (pd < maxLink) lit = Math.max(lit, 1 - pd / maxLink);
        }
        // the node you're dragging stays fully lit so the grab reads clearly
        if (ni === grabbed) lit = 1;
        for (const rp of ripples) {
          const radius = rp.t * maxLink * 1.6;
          const nd = Math.hypot(n.x - rp.x, n.y - rp.y);
          // flash when the ring front sweeps over the node
          if (Math.abs(nd - radius) < flashBand)
            lit = Math.max(lit, (1 - rp.t) * 0.9);
        }
        drawNode(n, Math.min(1, lit));
      }
    };

    const step = () => {
      tick += 1;
      const maxLink = linkDist();

      // ease the cursor glow in/out
      pointer.glow += ((pointer.active ? 1 : 0) - pointer.glow) * 0.08;

      // randomly reignite a node's twinkle, so the field flickers with life
      if (nodes.length && Math.random() < 0.04)
        nodes[(Math.random() * nodes.length) | 0].spark = 1;

      // the grabbed node is pinned to the cursor; its frame-to-frame motion
      // becomes its velocity, so releasing mid-drag flings it on naturally
      if (grabbed >= 0 && grabbed < nodes.length) {
        const g = nodes[grabbed];
        g.vx = pointer.x - g.x;
        g.vy = pointer.y - g.y;
        g.x = pointer.x;
        g.y = pointer.y;
      }

      for (let idx = 0; idx < nodes.length; idx++) {
        const n = nodes[idx];
        n.spark *= 0.94; // twinkle decays toward calm
        if (idx === grabbed) continue; // pinned this frame, skip physics

        n.x += n.vx;
        n.y += n.vy;

        // organic wander — each node steers along a slowly-turning heading and
        // re-aims at random, so the drift never reads as a uniform float
        n.wander += n.spin;
        if (Math.random() < 0.012) n.spin = (Math.random() - 0.5) * 0.04;
        const acc = 0.0017 * n.speed;
        n.vx += Math.cos(n.wander) * acc;
        n.vy += Math.sin(n.wander) * acc;

        // pointer attraction — gentle on hover, a firm tug while dragging, so a
        // press-drag visibly sweeps the whole web along with the cursor
        if (interactive && pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < maxLink) {
            const pull = pointer.down ? 0.16 : 0.045;
            const f = (1 - d / maxLink) * pull * (0.6 + n.z * 0.4);
            n.vx += (dx / d) * f;
            n.vy += (dy / d) * f;
          }
        }

        // gentle damping keeps the drift calm, never runaway
        n.vx *= 0.99;
        n.vy *= 0.99;

        // clamp speed so wander + attraction can't accumulate into a streak
        const sp = Math.hypot(n.vx, n.vy);
        const maxSp = pointer.down ? 7 : 1.2;
        if (sp > maxSp) {
          n.vx = (n.vx / sp) * maxSp;
          n.vy = (n.vy / sp) * maxSp;
        }

        // wrap softly at the edges
        if (n.x < -8) n.x = width + 8;
        if (n.x > width + 8) n.x = -8;
        if (n.y < -8) n.y = height + 8;
        if (n.y > height + 8) n.y = -8;
      }

      // occasionally fire a pulse along a currently-connected edge — sparse,
      // so it reads as the odd flicker of activity rather than constant traffic
      if (pulses.length < 3 && Math.random() < 0.018) {
        const i = (Math.random() * nodes.length) | 0;
        const candidates: number[] = [];
        for (let j = 0; j < nodes.length; j++) {
          if (j === i) continue;
          if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) < maxLink)
            candidates.push(j);
        }
        if (candidates.length) {
          const j = candidates[(Math.random() * candidates.length) | 0];
          pulses.push({ a: i, b: j, t: 0, speed: 0.01 + Math.random() * 0.014 });
        }
      }
      for (let k = pulses.length - 1; k >= 0; k--) {
        pulses[k].t += pulses[k].speed;
        if (pulses[k].t >= 1) pulses.splice(k, 1);
      }

      for (let k = ripples.length - 1; k >= 0; k--) {
        ripples[k].t += 0.018;
        if (ripples[k].t >= 1) ripples.splice(k, 1);
      }
    };

    let raf = 0;
    const loop = () => {
      step();
      draw();
      raf = requestAnimationFrame(loop);
    };

    // the graph sleeps offscreen: the O(n²) edge pass only runs while the
    // canvas is actually in the viewport AND the tab is visible. Scrolling
    // away (or backgrounding the tab) parks the rAF loop entirely; scrolling
    // back picks it up where it left off.
    let onscreen = true;
    let running = false;
    const syncLoop = () => {
      const shouldRun = onscreen && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    const onVisibility = () => syncLoop();

    // pointer is tracked on the window and hit-tested against the canvas rect,
    // so the graph stays interactive even inside pointer-events-none parents.
    const inside = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height)
        return { x, y };
      return null;
    };
    const onMove = (e: PointerEvent) => {
      const hit = inside(e);
      if (hit) {
        pointer.x = hit.x;
        pointer.y = hit.y;
        pointer.active = true;
      } else if (!pointer.down) {
        // keep tracking while dragging even if the cursor leaves the box
        pointer.active = false;
      }
    };
    const onDown = (e: PointerEvent) => {
      const hit = inside(e);
      if (!hit) return;
      pointer.x = hit.x;
      pointer.y = hit.y;
      pointer.active = true;
      pointer.down = true;
      ripples.push({ x: hit.x, y: hit.y, t: 0 });

      // grab the nearest node within reach so it follows the drag directly
      let best = -1;
      let bestD = Math.max(40, linkDist() * 0.6);
      for (let i = 0; i < nodes.length; i++) {
        const d = Math.hypot(nodes[i].x - hit.x, nodes[i].y - hit.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      grabbed = best;
    };
    const onUp = () => {
      // release the grabbed node, clamping its fling so it never rockets off
      if (grabbed >= 0 && grabbed < nodes.length) {
        const g = nodes[grabbed];
        const sp = Math.hypot(g.vx, g.vy);
        const cap = 6;
        if (sp > cap) {
          g.vx = (g.vx / sp) * cap;
          g.vy = (g.vy / sp) * cap;
        }
      }
      grabbed = -1;
      pointer.down = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (interactive) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
    }

    let io: IntersectionObserver | null = null;
    if (reduced) {
      // one calm static frame — no loop, so nothing to pause/resume
      draw();
    } else {
      // the observer's initial callback starts the loop (if visible), so no
      // frame is ever requested for a graph that mounts offscreen
      io = new IntersectionObserver(([entry]) => {
        onscreen = entry?.isIntersecting ?? true;
        syncLoop();
      });
      io.observe(canvas);
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [signal, nodeCount, interactive]);

  // Only supply the default `relative` when the caller hasn't set their own
  // position utility. Tailwind emits `.relative` after `.absolute` in source
  // order, so a passed `absolute` would otherwise lose the cascade — the graph
  // would stay `relative`, sit in normal flow, and reserve its full h-*/w-* box
  // (e.g. a 288px gap) instead of floating out of flow as intended.
  const hasPosition =
    /(?:^|\s)(?:absolute|fixed|relative|sticky|static)(?:\s|$)/.test(className);

  return (
    <div
      className={`${hasPosition ? "" : "relative"} ${float ? "floaty" : ""} ${className}`.trim()}
      aria-hidden
    >
      {showGlow && (
        <div className="orb-glow glow-pulse absolute -inset-[22%]" />
      )}
      <canvas ref={canvasRef} className="relative h-full w-full" />
    </div>
  );
}

/* turn a hex or rgb(a) token into an rgba() at the given alpha */
function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (color.startsWith("rgb")) {
    const nums = color.replace(/rgba?\(|\)/g, "").split(",").slice(0, 3);
    return `rgba(${nums.join(",")}, ${a})`;
  }
  return color;
}
