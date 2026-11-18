"use client";

import { useEffect, useRef, useState } from "react";

/* The Introducing Mytes stage: five felt Mytes in 3D, standing on one gentle arc and joined by a
   dotted coral trail. A spark (one Myte asking another) runs along the trail; the Myte it reaches
   hops and blinks, and every Myte's eyes follow it (or the pointer, when there is one). Hovering a
   Myte, or focusing its name, makes it hop and shows what it kept.

   The models are real 3D (public/home/mytes/*.glb), built from the same signed-distance maths as
   the in-app plush avatar, so the 3D cast is the same characters the product draws. three.js is
   loaded only when the section nears the screen, and the frame loop stops while it is off screen.

   Layout: wide stages put the Mytes on a smile-shaped arc above a ground line (the owner's sketch,
   read landscape); narrow stages turn it upright, the arc bowing to the right, the names beside.
   Reduced motion: everything is drawn once, still, with no spark and no hops. */

export type StageMyte = {
  src: string;
  name: string;
  role: string;
  /** felt colour, for the caption's dot */
  colour: string;
  /** what it kept for its person, said in a bubble when the spark reaches it */
  kept: string;
};

type Point = { x: number; y: number };

type Projected = {
  /** the Myte's centre and its feet on screen, CSS px within the stage */
  centre: Point[];
  feet: Point[];
  /** its body radius on screen */
  radius: number;
  /** the dotted trail: polyline pieces between the bodies */
  trail: Point[][];
  ground: [Point, Point] | null;
  tall: boolean;
};

const SPACING = 3.05;
const LIFT = 0.95;
const BODY_Y = 0.78; // a Myte's middle above its feet
const BODY_R = 1.0; // the body's radius, world units, for the trail's gaps and hovering

/* timing, seconds */
const TRAVEL = 1.15;
const DWELL = 1.0;
const HOP = 0.62;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t: number) =>
  1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

export function MyteStage({
  mytes,
  onActive,
}: {
  mytes: StageMyte[];
  onActive?: (i: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparkRef = useRef<SVGGElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const [proj, setProj] = useState<Projected | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(2);
  const [failed, setFailed] = useState(false);
  const activeCb = useRef(onActive);
  activeCb.current = onActive;
  const hopRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    activeCb.current?.(active);
  }, [active]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import("three");
      const { GLTFLoader } =
        await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { RoomEnvironment } =
        await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (disposed) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1.0;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.85;
      const key = new THREE.DirectionalLight(0xfff1e6, 1.5);
      key.position.set(-4, 6, 6);
      scene.add(key);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c8b4, 0.45));

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

      /* the soft contact shadow under each Myte */
      const shadowTex = (() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const g = c.getContext("2d")!;
        const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        r.addColorStop(0, "rgba(40,28,20,0.55)");
        r.addColorStop(0.45, "rgba(40,28,20,0.22)");
        r.addColorStop(1, "rgba(40,28,20,0)");
        g.fillStyle = r;
        g.fillRect(0, 0, 128, 128);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      })();

      type Actor = {
        root: InstanceType<typeof THREE.Group>;
        body: InstanceType<typeof THREE.Object3D> | null;
        eyes: {
          node: InstanceType<typeof THREE.Object3D>;
          base: InstanceType<typeof THREE.Vector3>;
        }[];
        shadow: InstanceType<typeof THREE.Mesh>;
        phase: number;
        hopAt: number;
        blinkAt: number;
        appearAt: number;
        look: InstanceType<typeof THREE.Vector2>;
      };

      const loader = new GLTFLoader();
      const loaded = await Promise.all(
        mytes.map((m) => loader.loadAsync(m.src).catch(() => null)),
      );
      if (disposed) {
        renderer.dispose();
        return;
      }
      if (loaded.some((g) => !g)) {
        setFailed(true);
        renderer.dispose();
        return;
      }

      const now0 = performance.now() / 1000;
      const actors: Actor[] = loaded.map((gltf, i) => {
        const root = new THREE.Group();
        const model = gltf!.scene;
        root.add(model);
        const body = model.getObjectByName("Body") ?? null;
        const eyes = ["eye.L", "eye.R"]
          .map((n) => model.getObjectByName(n))
          .filter((n): n is NonNullable<typeof n> => !!n)
          .map((node) => ({ node, base: node.position.clone() }));
        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(2.3, 2.3),
          new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            depthWrite: false,
          }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.scale.set(1, 0.62, 1);
        shadow.renderOrder = -1;
        root.add(shadow);
        root.scale.setScalar(reduced ? 1 : 0.0001);
        scene.add(root);
        return {
          root,
          body,
          eyes,
          shadow,
          phase: i * 1.37,
          hopAt: -10,
          blinkAt: now0 + 1.5 + Math.random() * 3,
          appearAt: Infinity,
          look: new THREE.Vector2(),
        };
      });

      /* ---------------- layout */
      let W = 1;
      let H = 1;
      let tall = false;
      let positions: InstanceType<typeof THREE.Vector3>[] = [];
      const layout = () => {
        const r = wrap.getBoundingClientRect();
        W = Math.max(1, r.width);
        H = Math.max(1, r.height);
        renderer.setSize(W, H, false);
        const aspect = W / H;
        tall = aspect < 0.9;
        const n = actors.length;
        if (!tall) {
          positions = actors.map((_, i) => {
            const x = (i - (n - 1) / 2) * SPACING;
            const t = x / (((n - 1) / 2) * SPACING);
            return new THREE.Vector3(x, LIFT * t * t, 0);
          });
          // fit the arc's width, then centre the cast (feet and names to the tallest ear) in the height
          const span = (n - 1) * SPACING + 2.7;
          const top = LIFT + 1.95;
          const bottom = -0.75;
          const viewH = Math.max(span / aspect, top - bottom);
          const cy = (top + bottom) / 2;
          camera.left = (-viewH * aspect) / 2;
          camera.right = (viewH * aspect) / 2;
          camera.top = cy + viewH / 2;
          camera.bottom = cy - viewH / 2;
        } else {
          // upright: the arc bows to the right, names on the left, a band at the bottom for the bubble
          const viewW = 6.4;
          const k = viewW / W; // world units per px
          const viewH = H * k;
          const reserve = 150 * k;
          const step = Math.min(
            2.6,
            Math.max(1.7, (viewH - reserve - 2.7) / (n - 1)),
          );
          const topY = viewH / 2 - 1.95;
          positions = actors.map((_, i) => {
            const t = (i - (n - 1) / 2) / ((n - 1) / 2);
            return new THREE.Vector3(
              0.95 * (1 - t * t) + 0.75,
              topY - i * step,
              0,
            );
          });
          camera.left = -viewW / 2;
          camera.right = viewW / 2;
          camera.top = viewH / 2;
          camera.bottom = -viewH / 2;
        }
        camera.position.set(0, 2.2, 12);
        camera.lookAt(0, 0.2, 0);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        actors.forEach((a, i) => {
          a.root.position.copy(positions[i]);
          a.root.rotation.y = tall ? -0.12 : -positions[i].x * 0.045;
        });
        project();
      };

      const toScreen = (v: InstanceType<typeof THREE.Vector3>): Point => {
        const p = v.clone().project(camera);
        return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H };
      };

      /* the trail: a smooth curve through the Mytes' middles, drawn only in the gaps between them */
      let curve: InstanceType<typeof THREE.CatmullRomCurve3> | null = null;
      let curveT: number[] = [];
      const project = () => {
        const centres = positions.map(
          (p) => new THREE.Vector3(p.x, p.y + BODY_Y, p.z),
        );
        curve = new THREE.CatmullRomCurve3(centres, false, "centripetal");
        const N = 400;
        const pts = curve.getSpacedPoints(N);
        // the curve parameter at each Myte, so the spark can run from one to the next
        curveT = centres.map((c) => {
          let best = 0;
          let bd = Infinity;
          pts.forEach((p, k) => {
            const d = p.distanceTo(c);
            if (d < bd) {
              bd = d;
              best = k / N;
            }
          });
          return best;
        });
        const pieces: Point[][] = [];
        let cur: Point[] = [];
        pts.forEach((p) => {
          const inside = centres.some((c) => p.distanceTo(c) < BODY_R * 1.04);
          if (inside) {
            if (cur.length > 1) pieces.push(cur);
            cur = [];
          } else cur.push(toScreen(p));
        });
        if (cur.length > 1) pieces.push(cur);
        const r0 = toScreen(centres[0]);
        const r1 = toScreen(
          centres[0].clone().add(new THREE.Vector3(BODY_R, 0, 0)),
        );
        let ground: [Point, Point] | null = null;
        if (!tall) {
          const half = ((actors.length - 1) / 2) * SPACING + 1.6;
          ground = [
            toScreen(new THREE.Vector3(-half, 0, 0)),
            toScreen(new THREE.Vector3(half, 0, 0)),
          ];
        }
        setProj({
          centre: centres.map(toScreen),
          feet: positions.map(toScreen),
          radius: Math.abs(r1.x - r0.x),
          trail: pieces,
          ground,
          tall,
        });
      };

      /* ---------------- pointer: eyes follow it, hovering a Myte makes it hop */
      const pointer = new THREE.Vector2();
      let pointerIn = false;
      let hovered = -1;
      const hop = (i: number) => {
        const a = actors[i];
        const t = performance.now() / 1000;
        if (a && t - a.hopAt > HOP * 0.8) a.hopAt = t;
        if (a) a.blinkAt = t + 0.12;
      };
      hopRef.current = (i: number) => {
        if (!reduced) hop(i);
        setActive(i);
      };
      const onMove = (e: PointerEvent) => {
        const r = wrap.getBoundingClientRect();
        pointer.set(e.clientX - r.left, e.clientY - r.top);
        pointerIn = true;
        if (!proj0) return;
        let next = -1;
        proj0.centre.forEach((c, i) => {
          if (
            Math.hypot(c.x - pointer.x, c.y - pointer.y) <
            proj0!.radius * 1.05
          )
            next = i;
        });
        if (next !== hovered) {
          hovered = next;
          wrap.style.cursor = next >= 0 ? "pointer" : "";
          if (next >= 0) {
            hopRef.current(next);
            if (Number.isFinite(relayStart)) {
              relayFrom = next;
              if (relayFrom === actors.length - 1) relayDir = -1;
              else if (relayFrom === 0) relayDir = 1;
              relayStart = performance.now() / 1000 + DWELL;
              setSpark(null, false);
              trailPts.length = 0;
            }
          }
        }
      };
      const onLeave = () => {
        pointerIn = false;
        hovered = -1;
        wrap.style.cursor = "";
        // pick the relay up from wherever the pointer left it
        if (Number.isFinite(relayStart)) setSpark(null, false);
      };
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerleave", onLeave);
      let proj0: Projected | null = null;
      const projSync = () => {
        // keep a copy for the pointer test without re-rendering React on every move
        setProj((p) => {
          proj0 = p;
          return p;
        });
      };

      /* ---------------- the relay spark */
      let relayFrom = 0;
      let relayDir = 1;
      let relayStart = Infinity;
      const sparkPos = new THREE.Vector3();
      const trailPts: Point[] = [];

      const setSpark = (pt: Point | null, visible: boolean) => {
        const g = sparkRef.current;
        if (!g) return;
        if (!pt || !visible) {
          g.style.opacity = "0";
          return;
        }
        g.style.opacity = "1";
        g.setAttribute(
          "transform",
          `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`,
        );
      };

      /* ---------------- frame loop */
      let raf = 0;
      let running = false;
      let entered = false;
      let lastT = performance.now() / 1000;
      const tmp = new THREE.Vector3();
      const frame = () => {
        raf = 0;
        const t = performance.now() / 1000;
        const dt = Math.min(0.1, t - lastT);
        lastT = t;
        // a hovered Myte holds the floor: the relay waits until the pointer moves on
        if (hovered >= 0 && Number.isFinite(relayStart)) relayStart += dt;

        // relay: travel, then dwell, then the next leg (back and forth along the arc)
        let sparkVisible = false;
        if (!reduced && curve && t >= relayStart) {
          const leg = t - relayStart;
          const to = relayFrom + relayDir;
          if (leg < TRAVEL) {
            const k = easeInOut(leg / TRAVEL);
            const u = curveT[relayFrom] + (curveT[to] - curveT[relayFrom]) * k;
            curve.getPointAt(Math.min(1, Math.max(0, u)), sparkPos);
            const inside = positions.some(
              (p) =>
                tmp.set(p.x, p.y + BODY_Y, p.z).distanceTo(sparkPos) <
                BODY_R * 0.9,
            );
            sparkVisible = !inside;
            const sp = toScreen(sparkPos);
            setSpark(sp, sparkVisible);
            trailPts.push(sp);
            if (trailPts.length > 14) trailPts.shift();
          } else {
            hop(to);
            setActive(to);
            relayFrom = to;
            if (relayFrom === actors.length - 1 || relayFrom === 0)
              relayDir = -relayDir;
            relayStart = t + DWELL;
            setSpark(null, false);
            trailPts.length = 0;
          }
        }
        if (trailRef.current) {
          trailRef.current.setAttribute(
            "d",
            sparkVisible && trailPts.length > 1
              ? "M" +
                  trailPts
                    .map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join("L")
              : "",
          );
        }

        actors.forEach((a, i) => {
          // entrance: each Myte drops in on its spot, one after another
          const ap = Math.min(1, Math.max(0, (t - a.appearAt) / 0.7));
          const s = reduced ? 1 : Math.max(0.0001, easeOutBack(ap));
          a.root.scale.setScalar(s);

          // breathing and the hop (squash on take-off and landing, a lift between)
          const hp = (t - a.hopAt) / HOP;
          let lift = 0;
          let sq = 0;
          if (!reduced && hp >= 0 && hp <= 1) {
            lift =
              Math.max(
                0,
                Math.sin(
                  Math.min(1, Math.max(0, (hp - 0.12) / 0.76)) * Math.PI,
                ),
              ) * 0.42;
            sq =
              Math.exp(-Math.pow((hp - 0.06) / 0.06, 2)) * 0.09 -
              Math.exp(-Math.pow((hp - 0.93) / 0.06, 2)) * 0.1;
          }
          const br = reduced ? 0 : Math.sin(t * 1.75 + a.phase) * 0.018;
          if (a.body) {
            a.body.position.y = lift + (1 - ap) * (reduced ? 0 : 0.8);
            const sy = 1 + br - sq;
            const sxz = 1 - br * 0.5 + sq * 0.5;
            a.body.scale.set(sxz, sy, sxz);
          }
          const sh = 1 - Math.min(0.5, lift * 1.2);
          a.shadow.scale.set(sh, 0.62 * sh, 1);
          (
            a.shadow.material as InstanceType<typeof THREE.MeshBasicMaterial>
          ).opacity = (0.35 + 0.65 * sh) * ap;

          // eyes: towards the pointer, else towards the spark, else ahead
          let tx = 0;
          let ty = 0;
          const c = toScreen(
            tmp.set(positions[i].x, positions[i].y + BODY_Y, 0),
          );
          let target: Point | null = null;
          if (pointerIn) target = { x: pointer.x, y: pointer.y };
          else if (sparkVisible) target = toScreen(sparkPos);
          if (target && !reduced) {
            const dx = target.x - c.x;
            const dy = target.y - c.y;
            const d = Math.hypot(dx, dy) || 1;
            const k = Math.min(1, d / (W * 0.25));
            tx = (dx / d) * k;
            ty = (-dy / d) * k;
          }
          a.look.x += (tx - a.look.x) * 0.12;
          a.look.y += (ty - a.look.y) * 0.12;
          let blink = 1;
          if (!reduced) {
            const bp = t - a.blinkAt;
            if (bp >= 0 && bp < 0.2)
              blink = 1 - Math.sin((bp / 0.2) * Math.PI) * 0.87;
            else if (bp >= 0.2) a.blinkAt = t + 2.2 + Math.random() * 4.5;
          }
          a.eyes.forEach((e) => {
            e.node.position.set(
              e.base.x + a.look.x * 0.07,
              e.base.y + a.look.y * 0.045,
              e.base.z,
            );
            e.node.scale.set(1, blink, 1);
          });
        });

        renderer.render(scene, camera);
        if (running && !reduced) raf = requestAnimationFrame(frame);
      };

      const play = () => {
        if (running) return;
        running = true;
        if (!entered) {
          entered = true;
          const t = performance.now() / 1000;
          actors.forEach((a, i) => {
            a.appearAt = t + 0.15 + i * 0.13;
            a.hopAt = -10;
          });
          relayFrom = 0;
          relayDir = 1;
          relayStart = t + 0.15 + actors.length * 0.13 + 0.9;
          setActive(0);
        }
        if (!raf) raf = requestAnimationFrame(frame);
      };
      const pause = () => {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      };

      const ro = new ResizeObserver(() => {
        layout();
        projSync();
        if (!running || reduced) frame();
      });
      ro.observe(wrap);
      layout();
      projSync();
      setReady(true);

      // run while the stage is on screen and the tab is showing; resume when either comes back
      let onScreen = false;
      const sync = () => {
        if (onScreen && !document.hidden) play();
        else pause();
        if (reduced) frame();
      };
      const io = new IntersectionObserver(
        (entries) => {
          onScreen = entries.some((e) => e.isIntersecting);
          sync();
        },
        { threshold: 0.15 },
      );
      io.observe(wrap);
      const onVis = () => sync();
      document.addEventListener("visibilitychange", onVis);
      frame();

      cleanup = () => {
        pause();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        wrap.removeEventListener("pointermove", onMove);
        wrap.removeEventListener("pointerleave", onLeave);
        scene.traverse((o) => {
          const m = o as InstanceType<typeof THREE.Mesh>;
          if (m.geometry) m.geometry.dispose();
          const mat = m.material as unknown;
          const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
          mats.forEach(
            (x: {
              dispose?: () => void;
              map?: { dispose: () => void } | null;
            }) => {
              x.map?.dispose();
              x.dispose?.();
            },
          );
        });
        envTex.dispose();
        pmrem.dispose();
        shadowTex.dispose();
        renderer.dispose();
      };
    };

    // load the 3D only when the stage is near the screen
    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          near.disconnect();
          start().catch(() => setFailed(true));
        }
      },
      { rootMargin: "600px 0px" },
    );
    near.observe(wrap);

    return () => {
      disposed = true;
      near.disconnect();
      cleanup();
    };
  }, [mytes]);

  const trailD =
    proj?.trail
      .map(
        (pc) =>
          "M" + pc.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L"),
      )
      .join(" ") ?? "";

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full select-none"
      aria-hidden={failed ? undefined : true}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0 }}
      />
      {proj && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="myte-ground" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="currentColor" stopOpacity="0" />
              <stop offset="0.18" stopColor="currentColor" stopOpacity="1" />
              <stop offset="0.82" stopColor="currentColor" stopOpacity="1" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="myte-spark">
              <stop
                offset="0"
                stopColor="var(--signal-line, #d97757)"
                stopOpacity="0.55"
              />
              <stop
                offset="1"
                stopColor="var(--signal-line, #d97757)"
                stopOpacity="0"
              />
            </radialGradient>
          </defs>
          {proj.ground && (
            <line
              x1={proj.ground[0].x}
              y1={proj.ground[0].y}
              x2={proj.ground[1].x}
              y2={proj.ground[1].y}
              stroke="url(#myte-ground)"
              strokeWidth="1.25"
              style={{
                color: "var(--line-2, #d6d1c2)",
                opacity: ready ? 1 : 0,
                transition: "opacity .8s .9s",
              }}
            />
          )}
          <path
            d={trailD}
            fill="none"
            stroke="var(--signal-line, #d97757)"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeDasharray="0.1 8"
            style={{ opacity: ready ? 0.9 : 0, transition: "opacity .8s 1.1s" }}
          />
          <path
            ref={trailRef}
            fill="none"
            stroke="var(--signal-line, #d97757)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.35"
          />
          <g ref={sparkRef} style={{ opacity: 0, transition: "opacity .15s" }}>
            <circle r="16" fill="url(#myte-spark)" />
            <circle r="4.5" fill="var(--signal, #c15f3c)" />
            <circle r="1.8" fill="#fff" opacity="0.9" />
          </g>
        </svg>
      )}
      {proj && (
        <ul className="pointer-events-none absolute inset-0 m-0 list-none p-0">
          {mytes.map((m, i) => {
            const f = proj.feet[i];
            const c = proj.centre[i];
            const pos = proj.tall
              ? {
                  left: Math.max(4, c.x - proj.radius * 1.15),
                  top: c.y,
                  transform: "translate(-100%, -50%)",
                  textAlign: "right" as const,
                }
              : {
                  left: f.x,
                  top: f.y + 16,
                  transform: "translateX(-50%)",
                  textAlign: "center" as const,
                };
            return (
              <li
                key={m.name}
                className="absolute whitespace-nowrap transition-opacity duration-500"
                style={{
                  ...pos,
                  opacity: ready ? 1 : 0,
                  transitionDelay: `${0.5 + i * 0.13}s`,
                }}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onPointerEnter={() => hopRef.current(i)}
                  onClick={() => hopRef.current(i)}
                  className={`pointer-events-auto rounded-full px-2.5 py-1 text-[13px] leading-tight transition-colors ${
                    active === i
                      ? "bg-surface text-ink shadow-[0_1px_0_var(--line)]"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: m.colour }}
                  />
                  <span className="font-semibold">{m.name}</span>
                  <span className="ml-1 text-ink-3">· {m.role}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {proj &&
        (() => {
          const m = mytes[active];
          const c = proj.centre[active];
          const W = wrapRef.current?.clientWidth ?? 0;
          const half = 150;
          const style = proj.tall
            ? { left: "50%", bottom: 0, transform: "translateX(-50%)" }
            : {
                left: Math.min(
                  Math.max(c.x, half + 8),
                  Math.max(half + 8, W - half - 8),
                ),
                top: c.y - proj.radius * 1.02 - (active === 1 ? 26 : 10),
                transform: "translate(-50%, -100%)",
              };
          const tail = proj.tall ? null : c.x - (style.left as number);
          return (
            <div
              className="pointer-events-none absolute z-10 w-[min(300px,calc(100%-16px))] transition-[left,top] duration-500 ease-out"
              style={{ ...style, opacity: ready ? 1 : 0 }}
            >
              <figure
                key={active}
                className="mytes-kept relative rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_1px_0_var(--line),0_18px_40px_-26px_rgba(31,30,29,0.45)]"
              >
                <figcaption className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: m.colour }}
                  />
                  Kept for{" "}
                  <span className="font-semibold text-ink-2">{m.name}</span>
                </figcaption>
                <blockquote className="mt-1 font-display text-[16.5px] leading-snug text-ink">
                  {m.kept}
                </blockquote>
                {tail !== null && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-[7px] h-3 w-3 rotate-45 border-b border-r border-line bg-surface"
                    style={{
                      left: `calc(50% + ${Math.max(-130, Math.min(130, tail)).toFixed(0)}px - 6px)`,
                    }}
                  />
                )}
              </figure>
            </div>
          );
        })()}
    </div>
  );
}
