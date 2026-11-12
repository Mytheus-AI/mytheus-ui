/* Plush stills: one hidden WebGL2 context for the whole page.

   Browsers cap WebGL contexts at about 16, so a list of faces can never be a list of canvases.
   Instead every still in the app is drawn here, once per seed and size bucket, on one shared
   offscreen canvas, copied to a small PNG data URL, and shown in a plain <img>. The cache lives
   for the page, so the same person in the sidebar, a list and a picker costs one render.

   Renders are queued and drained in idle time, a few milliseconds at a go, so a page of fifty
   people fills in over a few frames without blocking the main thread. Each still is drawn at
   twice its bucket size and scaled down, which is what smooths the felt at 24 px.

   If WebGL2 is missing, or the shared context is lost and cannot be rebuilt, requests reject and
   the component draws its SVG fallback. No React here. */

import { plushSpec, plushStillKey, plushStillView, type PlushBucket } from "@/lib/plush";
import { PLUSH_NEUTRAL_POSE } from "@/lib/plush-motion";
import { PLUSH_CONTEXT, startPlushProgram, type PlushProgram, type PlushProgramBuild } from "./gl";

/** Stills are drawn at this multiple of their bucket and scaled down. */
const SUPERSAMPLE = 2;
/** How long one drain of the queue may run before yielding, in milliseconds. */
const BUDGET_MS = 6;
/** Cached stills kept for the page (a small one is about 15 KB as a data URL). */
const CACHE_LIMIT = 400;
/** After the shared context could not be made, wait this long before trying again. */
const RETRY_MS = 5000;

interface Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  /** set once the shader has finished compiling (in the background where the browser can) */
  program: PlushProgram | null;
  build: PlushProgramBuild;
  lost: boolean;
}
type ReadyRenderer = Renderer & { program: PlushProgram };

interface Job {
  key: string;
  seed: string;
  bucket: number;
  resolve: (url: string) => void;
  reject: (err: unknown) => void;
}

let renderer: Renderer | null = null;
let retryAt = 0;
let scratch: HTMLCanvasElement | null = null;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const queue: Job[] = [];
let scheduled = false;

/** What the shared renderer has cost so far, for measuring. */
export const plushStillStats = { count: 0, totalMs: 0, lastMs: 0, maxMs: 0, contexts: 0 };

/** The shared renderer, or null while its shader is still compiling. `wait` blocks for it. Throws
    when WebGL2 cannot be had. */
function getRenderer(wait: boolean): ReadyRenderer | null {
  if (renderer && (renderer.lost || renderer.gl.isContextLost())) renderer = null;
  if (typeof document === "undefined") throw new Error("plush: no document");
  try {
    if (!renderer) {
      if (retryAt && performance.now() < retryAt) throw new Error("plush: WebGL2 is unavailable");
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2", { ...PLUSH_CONTEXT, preserveDrawingBuffer: false });
      if (!gl) throw new Error("plush: WebGL2 is unavailable");
      const made: Renderer = { canvas, gl, program: null, build: startPlushProgram(gl), lost: false };
      // A lost context (too many canvases on the page, a driver reset) is rebuilt on the next request.
      canvas.addEventListener("webglcontextlost", () => {
        made.lost = true;
        if (renderer === made) renderer = null;
      });
      plushStillStats.contexts += 1;
      renderer = made;
    }
    const r = renderer;
    if (!r.program) {
      if (!wait && !r.build.ready()) return null;
      r.program = r.build.finish();
      retryAt = 0;
    }
    return r as ReadyRenderer;
  } catch (err) {
    renderer = null;
    retryAt = performance.now() + RETRY_MS;
    throw err;
  }
}

function remember(key: string, url: string) {
  cache.set(key, url);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/** Draws one still to a 2D canvas `px` square. Synchronous; throws without WebGL2. */
export function drawPlushStill(seed: string, px: number, target?: HTMLCanvasElement): HTMLCanvasElement {
  const r = getRenderer(true)!;
  const spec = plushSpec(seed);
  const size = Math.round(px * SUPERSAMPLE);
  if (r.canvas.width !== size || r.canvas.height !== size) {
    r.canvas.width = size;
    r.canvas.height = size;
  }
  r.program.draw({ spec, pose: PLUSH_NEUTRAL_POSE, view: plushStillView(spec), time: 0, width: size, height: size, ground: false, paper: true });
  if (r.lost || r.gl.isContextLost()) {
    renderer = null;
    throw new Error("plush: the WebGL context was lost");
  }
  const out = target ?? document.createElement("canvas");
  out.width = px;
  out.height = px;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("plush: no 2D canvas");
  ctx.clearRect(0, 0, px, px);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // must happen in the same task as the draw: the GL buffer is not preserved
  ctx.drawImage(r.canvas, 0, 0, px, px);
  return out;
}

function renderJob(job: Job): string {
  const start = performance.now();
  scratch = drawPlushStill(job.seed, job.bucket, scratch ?? undefined);
  const url = scratch.toDataURL("image/png");
  const ms = performance.now() - start;
  plushStillStats.count += 1;
  plushStillStats.totalMs += ms;
  plushStillStats.lastMs = ms;
  plushStillStats.maxMs = Math.max(plushStillStats.maxMs, ms);
  return url;
}

function drain(deadline?: IdleDeadline) {
  scheduled = false;
  // the shader compiles in the background; until it is ready, look again next frame
  try {
    if (queue.length && !getRenderer(false)) {
      scheduled = true;
      setTimeout(drain, 16);
      return;
    }
  } catch {
    // no WebGL2: each job below fails the same way and its face falls back
  }
  const start = performance.now();
  let done = 0;
  while (queue.length) {
    // always one; then as many as fit in the idle period or the budget
    if (done > 0) {
      const left = deadline && !deadline.didTimeout ? deadline.timeRemaining() : BUDGET_MS - (performance.now() - start);
      if (left < Math.max(1.5, plushStillStats.lastMs)) break;
    }
    const job = queue.shift()!;
    try {
      const url = renderJob(job);
      remember(job.key, url);
      job.resolve(url);
    } catch (err) {
      job.reject(err);
    }
    done += 1;
  }
  if (queue.length) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  if (typeof requestIdleCallback === "function") requestIdleCallback(drain, { timeout: 120 });
  else setTimeout(drain, 16);
}

/** A still that is already rendered, or null. */
export function cachedPlushStill(seed: string, bucket: PlushBucket): string | null {
  return cache.get(plushStillKey(seed, bucket)) ?? null;
}

/** Queues a still and resolves with its data URL. Rejects when WebGL2 cannot draw it. */
export function requestPlushStill(seed: string, bucket: PlushBucket): Promise<string> {
  const key = plushStillKey(seed, bucket);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    p = new Promise<string>((resolve, reject) => {
      queue.push({ key, seed, bucket, resolve, reject });
      schedule();
    }).finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}

/** A still as a PNG file, for the profile picture Clerk stores. Rejects without WebGL2. */
export function plushStillBlob(seed: string, px = 512): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      drawPlushStill(seed, px).toBlob((b) => (b ? resolve(b) : reject(new Error("plush: could not encode the picture"))), "image/png");
    } catch (err) {
      reject(err);
    }
  });
}

let software: boolean | null = null;
/**
 * Whether WebGL here is drawn by the CPU (SwiftShader, llvmpipe: a machine with no usable GPU, or
 * headless Chromium in CI). The shader costs about 0.8 s to start and 90 ms a frame there, against
 * 4 ms on a GPU, so stills are still drawn (once each, in idle time) but nothing runs live.
 */
export function plushSoftwareRendering(): boolean {
  if (software !== null) return software;
  try {
    const { gl } = getRenderer(true)!;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    software = true;
  }
  return software;
}

/* Live canvases each hold a WebGL context of their own. Past this many at once, a live plush
   shows its still instead. */
export const MAX_LIVE = 4;
let live = 0;
export function takeLiveSlot(): boolean {
  if (live >= MAX_LIVE) return false;
  live += 1;
  return true;
}
export function releaseLiveSlot(): void {
  live = Math.max(0, live - 1);
}
