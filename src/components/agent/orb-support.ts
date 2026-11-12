/* The light half of AgentOrb: everything that must not pull three.js in. The renderer itself
   (orb-scene.ts, which imports three) is reached only through loadOrbScene(), a dynamic import,
   so it lands in its own async chunk and only pages that actually draw an orb download it. */

import { orbSnapshotKey, type OrbTheme } from "@/lib/agent-orb";

type SceneModule = typeof import("./orb-scene");

let scene: Promise<SceneModule> | null = null;
export function loadOrbScene(): Promise<SceneModule> {
  if (!scene) {
    scene = import("./orb-scene");
    scene.catch(() => {
      scene = null;
    });
  }
  return scene;
}

let webgl: boolean | null = null;
/** Whether this browser can draw WebGL at all. Checked once; without it, agents keep their doodle. */
export function webglAvailable(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement("canvas");
    const ctx = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    webgl = Boolean(ctx);
    ctx?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}
/** After a renderer failed to start (context limit, driver), stop trying for this page. */
export function markWebglBroken(): void {
  webgl = false;
}

/* Still snapshots, cached per seed, size, theme and pixel ratio for the life of the page. */
const done = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export function snapshotDpr(): number {
  return typeof window === "undefined" ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1));
}

export function cachedSnapshot(seed: string, sizePx: number, theme: OrbTheme): string | null {
  return done.get(orbSnapshotKey(seed, sizePx, theme, snapshotDpr())) ?? null;
}

export function orbSnapshot(seed: string, sizePx: number, theme: OrbTheme): Promise<string> {
  const dpr = snapshotDpr();
  const key = orbSnapshotKey(seed, sizePx, theme, dpr);
  const hit = done.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    p = loadOrbScene()
      .then((m) => m.renderOrbSnapshot(seed, sizePx, theme, dpr))
      .then((url) => {
        done.set(key, url);
        return url;
      })
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}

/* Live canvases each hold a WebGL context and browsers cap those (about 16). Past this many at
   once, a live orb draws as a still instead. */
const MAX_LIVE = 6;
let live = 0;
export function takeLiveSlot(): boolean {
  if (live >= MAX_LIVE) return false;
  live += 1;
  return true;
}
export function releaseLiveSlot(): void {
  live = Math.max(0, live - 1);
}
