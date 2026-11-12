/* The glass creature behind every agent's face, drawn with three.js. This module is the only one
   that imports three, and it is only ever loaded with a dynamic import() from AgentOrb, so pages
   that show no agent never download it.

   Ported from the approved prototype (glass-agents-prototype.html): the body shader marches
   through a smooth-union SDF for three wavy liquid layers, a darker core behind the face, a
   hue-coloured rim, light bounced from the bottom, a sharp highlight and curved edge highlights.
   Cloud and splat bodies get a thin outer glass membrane; all bodies use analytic SDF normals so
   the glass has no grain. Faces are flat white with a soft glow behind them. There is no bloom on
   purpose: it greyed the glass and blew out the faces.

   Two ways in:
   - createOrbView(canvas, seed, theme): one live creature on its own canvas (AgentOrb live).
   - renderOrbSnapshot(seed, size, theme): a PNG data URL from ONE shared offscreen renderer
     (AgentOrb still), so a list of twenty avatars costs one WebGL context, not twenty. */

import * as THREE from "three";
import { ORB_HUES, orbTraits, type OrbHue, type OrbState, type OrbTheme, type OrbTraits } from "@/lib/agent-orb";

/* ---------------- shaders (verbatim from the prototype) ---------------- */

const VS = `
uniform float t; uniform float wob;
varying vec3 vObj; varying vec3 vNo; varying vec3 vNv; varying vec3 vCam;
void main(){
  vec3 p = position;
  p += normal * (sin(p.x*3.1 + t*1.3) * cos(p.y*2.7 + t*1.1) + sin(p.z*3.3 - t*0.9)) * wob;
  vObj = p; vNo = normal; vNv = normalize(normalMatrix * normal);
  vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FS = `
uniform vec4 parts[8]; uniform int nParts; uniform float kS; uniform float t; uniform float lightBg;
uniform vec3 deep; uniform vec3 mid; uniform vec3 rim; uniform vec3 lite;
varying vec3 vObj; varying vec3 vNo; varying vec3 vNv; varying vec3 vCam;
float sdf(vec3 p){
  float d = 1e9;
  for (int i = 0; i < 8; i++) {
    if (i >= nParts) break;
    float e = length(p - parts[i].xyz) - parts[i].w;
    if (i == 0) { d = e; } else { float h = max(kS - abs(d - e), 0.0) / kS; d = min(d, e) - h * h * kS * 0.25; }
  }
  return d;
}
void main(){
  vec3 rd = normalize(vObj - vCam);
  vec3 n = normalize(vNo); vec3 nv = normalize(vNv);
  float fr = 1.0 - max(dot(n, -rd), 0.0);
  vec3 rr = normalize(mix(rd, refract(rd, n, 0.78), 0.8));
  vec3 col = vec3(0.0); float a = 0.0;
  vec3 p = vObj + rr * 0.03;
  for (int i = 0; i < 44; i++) {
    p += rr * 0.052;
    if (sdf(p) > 0.0) { if (i > 5) break; continue; }
    float w1 = 0.06 + 0.17 * sin(p.x * 2.2 + t * 0.9) + 0.09 * sin(p.z * 3.1 - t * 1.2) + 0.05 * sin((p.x - p.z) * 4.6 + t * 1.7) + 0.14 * p.x;
    float w2 = -0.28 + 0.15 * sin(p.x * 2.0 - t * 0.7 + 1.3) + 0.08 * sin(p.z * 2.9 + t) - 0.12 * p.x;
    float w3 = -0.58 + 0.11 * sin(p.x * 2.7 + t * 1.1 + 2.1) + 0.06 * sin(p.z * 3.9 - t * 0.8) + 0.06 * p.x;
    float f1 = smoothstep(0.035, -0.035, p.y - w1);
    float f2 = smoothstep(0.035, -0.035, p.y - w2);
    float f3 = smoothstep(0.035, -0.035, p.y - w3);
    vec3 c = mix(deep, mid, 0.22);
    c = mix(c, mid, f1); c = mix(c, mix(mid, lite, 0.6), f2); c = mix(c, mix(lite, rim, 0.12), f3);
    float dens = 0.018 + f1 * 0.04 + f2 * 0.03 + f3 * 0.03;
    float edge = exp(-abs(p.y - w1) * 26.0) + exp(-abs(p.y - w2) * 26.0) + exp(-abs(p.y - w3) * 26.0);
    c += rim * edge * 0.4; dens += edge * 0.025;
    float core = smoothstep(0.68, 0.46, length(p - vec3(0.0, 0.1, 0.0)));
    c = mix(c, deep, core * 0.8); dens = mix(dens, 0.12, core * 0.75);
    c *= 1.0 + 0.15 * smoothstep(0.2, -1.0, p.y);
    col += (1.0 - a) * c * dens; a += (1.0 - a) * dens;
  }
  float rimF = pow(fr, 2.8);
  vec3 rimC = mix(rim, mid, lightBg * 0.75);
  col += rimC * rimF * mix(1.25, 0.9, lightBg);
  a = max(a, rimF * mix(0.9, 1.0, lightBg));
  col += mix(lite, rim, 0.5) * smoothstep(0.1, -1.0, nv.y) * pow(fr, 1.4) * 0.5;
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 L1 = normalize(vec3(-0.55, 0.75, 0.55));
  float s1 = pow(max(dot(reflect(-L1, nv), v), 0.0), 110.0);
  float soft = pow(max(dot(reflect(-L1, nv), v), 0.0), 9.0);
  float ang = dot(normalize(nv.xy + 1e-4), normalize(vec2(-0.72, 0.7)));
  float arc = smoothstep(0.58, 0.68, fr) * smoothstep(0.86, 0.76, fr) * smoothstep(0.8, 0.97, ang);
  float ang2 = dot(normalize(nv.xy + 1e-4), normalize(vec2(0.75, -0.66)));
  float arc2 = smoothstep(0.66, 0.74, fr) * smoothstep(0.9, 0.82, fr) * smoothstep(0.86, 0.98, ang2);
  float spec = s1 * 1.5 + arc * 0.85 + arc2 * 0.3;
  col += vec3(1.0) * spec + rim * soft * 0.22;
  a = clamp(a + spec + soft * 0.1, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}`;

const FS_THIN = `
uniform vec3 mid; uniform vec3 rim; uniform float tint; uniform float lightBg;
varying vec3 vObj; varying vec3 vNo; varying vec3 vNv; varying vec3 vCam;
void main(){
  vec3 rd = normalize(vObj - vCam); vec3 n = normalize(vNo); vec3 nv = normalize(vNv);
  float fr = 1.0 - abs(dot(n, -rd));
  float rimF = pow(fr, 2.2);
  vec3 L1 = normalize(vec3(-0.55, 0.75, 0.55));
  float s1 = pow(max(dot(reflect(-L1, nv), vec3(0.0, 0.0, 1.0)), 0.0), 60.0);
  float a = clamp(tint + rimF * 0.85 + s1, 0.0, 1.0);
  vec3 col = mid * tint + mix(rim, mid, lightBg * 0.7) * rimF * 0.95 + vec3(1.0) * s1;
  gl_FragColor = vec4(col, a);
}`;

/* ---------------- shapes and geometry ---------------- */

type Part = readonly [number, number, number, number];

const SHAPES: Record<OrbTraits["shape"], readonly Part[]> = {
  ball: [[0, 0, 0, 1]],
  splat: [[0, 0, 0, 0.84], [0.6, 0.5, -0.1, 0.46], [-0.66, 0.4, -0.1, 0.44], [0.74, -0.28, -0.1, 0.42], [-0.7, -0.36, -0.1, 0.42], [-0.05, 0.76, -0.1, 0.4], [0.08, -0.72, -0.1, 0.4]],
  cloud: [[0, 0, 0, 0.86], [-0.76, -0.2, -0.1, 0.52], [0.78, -0.18, -0.1, 0.52], [-0.42, 0.5, -0.15, 0.5], [0.46, 0.46, -0.15, 0.48], [0, -0.56, -0.1, 0.5]],
};

function sdf(x: number, y: number, z: number, parts: readonly Part[], k: number): number {
  let d = 1e9;
  for (let i = 0; i < parts.length; i++) {
    const [px, py, pz, r] = parts[i];
    const e = Math.hypot(x - px, y - py, z - pz) - r;
    if (i === 0) {
      d = e;
      continue;
    }
    const h = Math.max(k - Math.abs(d - e), 0) / k;
    d = Math.min(d, e) - h * h * k * 0.25;
  }
  return d;
}

/* The surface of a smooth union, found by bisection along each direction of an icosphere, with
   normals from the SDF's gradient (analytic, so no faceting grain). The arrays are cached per
   shape and detail; each geometry wraps them and only its GPU buffers are freed on dispose. */
const surfaceCache = new Map<string, { pos: Float32Array; nrm: Float32Array }>();

function unionGeo(parts: readonly Part[], k: number, detail: number): THREE.BufferGeometry {
  const key = `${JSON.stringify(parts)}|${k}|${detail}`;
  let hit = surfaceCache.get(key);
  if (!hit) {
    const ico = new THREE.IcosahedronGeometry(1, detail);
    const src = ico.attributes.position;
    const pos = new Float32Array(src.count * 3);
    const nrm = new Float32Array(src.count * 3);
    const seen = new Map<string, number>();
    const e = 0.002;
    for (let i = 0; i < src.count; i++) {
      let dx = src.getX(i);
      let dy = src.getY(i);
      let dz = src.getZ(i);
      const id = `${dx.toFixed(5)},${dy.toFixed(5)},${dz.toFixed(5)}`;
      const prev = seen.get(id);
      if (prev !== undefined) {
        pos.copyWithin(i * 3, prev * 3, prev * 3 + 3);
        nrm.copyWithin(i * 3, prev * 3, prev * 3 + 3);
        continue;
      }
      seen.set(id, i);
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l;
      dy /= l;
      dz /= l;
      let lo = 0;
      let hi = 2.6;
      for (let it = 0; it < 26; it++) {
        const m = (lo + hi) / 2;
        if (sdf(dx * m, dy * m, dz * m, parts, k) < 0) lo = m;
        else hi = m;
      }
      const x = dx * lo;
      const y = dy * lo;
      const z = dz * lo;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      const gx = sdf(x + e, y, z, parts, k) - sdf(x - e, y, z, parts, k);
      const gy = sdf(x, y + e, z, parts, k) - sdf(x, y - e, z, parts, k);
      const gz = sdf(x, y, z + e, parts, k) - sdf(x, y, z - e, parts, k);
      const gl = Math.hypot(gx, gy, gz) || 1;
      nrm[i * 3] = gx / gl;
      nrm[i * 3 + 1] = gy / gl;
      nrm[i * 3 + 2] = gz / gl;
    }
    ico.dispose();
    hit = { pos, nrm };
    surfaceCache.set(key, hit);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(hit.pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(hit.nrm, 3));
  return g;
}

function starGeo(r: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const q = i % 2 ? r * 0.28 : r;
    if (i) s.lineTo(Math.cos(a) * q, Math.sin(a) * q);
    else s.moveTo(Math.cos(a) * q, Math.sin(a) * q);
  }
  return new THREE.ShapeGeometry(s);
}

/* ---------------- materials ---------------- */

const hex = (c: string) => new THREE.Color(c);

function bodyMat(h: OrbHue, parts: readonly Part[], k: number, lightBg: number): THREE.ShaderMaterial {
  const arr: THREE.Vector4[] = [];
  for (let i = 0; i < 8; i++) {
    const q = parts[i] ?? [0, 0, 0, 0];
    arr.push(new THREE.Vector4(q[0], q[1], q[2], q[3]));
  }
  return new THREE.ShaderMaterial({
    uniforms: {
      parts: { value: arr },
      nParts: { value: parts.length },
      kS: { value: k },
      t: { value: 0 },
      wob: { value: 0.012 },
      lightBg: { value: lightBg },
      deep: { value: hex(h.deep) },
      mid: { value: hex(h.mid) },
      rim: { value: hex(h.rim) },
      lite: { value: hex(h.lite) },
    },
    vertexShader: VS,
    fragmentShader: FS,
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
  });
}

function thinMat(h: { mid: string; rim: string }, lightBg: number, tint = 0.1, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, wob: { value: 0 }, tint: { value: tint }, lightBg: { value: lightBg }, mid: { value: hex(h.mid) }, rim: { value: hex(h.rim) } },
    vertexShader: VS,
    fragmentShader: FS_THIN,
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
    side,
  });
}

let softTexture: THREE.CanvasTexture | null = null;
function softMap(): THREE.CanvasTexture {
  if (softTexture) return softTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,0.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  softTexture = new THREE.CanvasTexture(c);
  return softTexture;
}
const soft = (c: string | number, o: number) =>
  new THREE.MeshBasicMaterial({ color: c, map: softMap(), transparent: true, opacity: o, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
const flat = (c: string | number) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true });

/* ---------------- the creature ---------------- */

export interface Creature {
  root: THREE.Group;
  /** advance the motion: `t` seconds of wall clock, `dt` since the last frame */
  update(t: number, dt: number, state: OrbState, still?: boolean): void;
  setTheme(theme: OrbTheme): void;
  dispose(): void;
}

const ease = (from: number, to: number, dt: number, rate = 6) => from + (to - from) * (1 - Math.exp(-rate * dt));

export function buildCreature(traits: OrbTraits, theme: OrbTheme, detail: number, opts: { sparks?: boolean } = {}): Creature {
  const showSparks = opts.sparks !== false;
  const h = ORB_HUES[traits.hue];
  const k = traits;
  const parts = SHAPES[k.shape];
  const lb = theme === "light" ? 1 : 0;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shaders: THREE.ShaderMaterial[] = [];
  const ks = k.shape === "splat" ? 0.3 : 0.4;

  // The halo and the floor glow only on dark: on the light cream page they read as grey haze.
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), soft(h.mid, 0.3));
  halo.position.z = -1.4;
  halo.renderOrder = 0;
  root.add(halo);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.7), soft(h.mid, 0.75));
  floor.position.set(0, -1.55, 0);
  floor.renderOrder = 0;
  root.add(floor);

  if (k.shape !== "ball") {
    const memParts = parts.map(([x, y, z, r], j) => (j ? ([x * 1.2, y * 1.2, z - 0.25, r] as const) : ([x, y, z - 0.2, r * 0.95] as const)));
    const mat = thinMat(h, lb, 0.2);
    mat.uniforms.wob.value = 0.02;
    const mem = new THREE.Mesh(unionGeo(memParts, 0.6, detail), mat);
    mem.rotation.z = k.shape === "splat" ? 0.5 : -0.3;
    mem.renderOrder = 1;
    shaders.push(mat);
    body.add(mem);
  }
  const bm = bodyMat(h, parts, ks, lb);
  shaders.push(bm);
  const blob = new THREE.Mesh(unionGeo(parts, ks, detail), bm);
  blob.renderOrder = 3;
  body.add(blob);

  const fz = parts[0][3] + 0.03;
  const face = new THREE.Group();
  face.position.set(0, 0.02, fz);
  face.scale.setScalar(2.1);
  root.add(face);
  const white = flat(0xffffff);
  const eyes: THREE.Mesh[] = [];
  const fglow = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.5), soft(h.rim, 0.3));
  fglow.renderOrder = 9;
  face.add(fglow);
  for (const s of [-1, 1]) {
    const arc = k.eyes === "happy" || (k.eyes === "wink" && s === 1);
    const e = arc
      ? new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.021, 10, 28, Math.PI), white)
      : new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.07, 6, 14), white);
    e.position.set(s * 0.19, arc ? 0.06 : 0.09, 0);
    e.renderOrder = 10;
    face.add(e);
    eyes.push(e);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.019, 10, 28, Math.PI), white);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.07, 0);
  smile.renderOrder = 10;
  face.add(smile);
  const open = new THREE.Mesh(new THREE.CircleGeometry(0.075, 28, Math.PI, Math.PI), white);
  open.position.set(0, -0.06, 0);
  open.renderOrder = 10;
  face.add(open);
  smile.visible = k.mouth === "smile";
  open.visible = k.mouth === "open";

  const acc = new THREE.Group();
  root.add(acc);
  const orbiters: THREE.Object3D[] = [];
  if (k.accessory === "headphones") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.085, 18, 72, Math.PI), thinMat(h, lb, 0.3));
    band.renderOrder = 4;
    acc.add(band);
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 1.06, -0.04, 0.12);
      g.rotation.y = -s * 0.75;
      acc.add(g);
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.3, 48),
        new THREE.MeshStandardMaterial({ color: 0x2a2470, roughness: 0.35, emissive: 0x1a1650, emissiveIntensity: 0.8 }),
      );
      cup.rotation.z = Math.PI / 2;
      g.add(cup);
      const pad = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 14, 48), thinMat(h, lb, 0.35));
      pad.rotation.y = Math.PI / 2;
      pad.position.x = s * 0.1;
      pad.renderOrder = 5;
      g.add(pad);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.04, 12, 40), flat(0x8fe6ff));
      ring.rotation.y = Math.PI / 2;
      ring.position.x = s * 0.16;
      ring.renderOrder = 11;
      g.add(ring);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), flat(0x5ad8ff));
      dot.rotation.y = (s * Math.PI) / 2;
      dot.position.x = s * 0.16;
      dot.renderOrder = 11;
      g.add(dot);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), soft(0x5ad8ff, 0.45));
      gl.rotation.y = (s * Math.PI) / 2;
      gl.position.x = s * 0.17;
      gl.renderOrder = 10;
      g.add(gl);
    }
  }
  if (k.accessory === "glasses") {
    const gm = flat(h.rim);
    for (const s of [-1, 1]) {
      const g = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.028, 10, 48), gm);
      g.position.set(s * 0.4, 0.2, fz + 0.02);
      g.renderOrder = 11;
      acc.add(g);
    }
    const br = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 20, Math.PI), gm);
    br.position.set(0, 0.22, fz + 0.02);
    br.renderOrder = 11;
    acc.add(br);
    const orbit = new THREE.Group();
    orbit.rotation.set(Math.PI / 2.35, 0.2, 0);
    acc.add(orbit);
    const tube = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.035, 12, 140), thinMat(h, lb, 0.55));
    tube.renderOrder = 6;
    orbit.add(tube);
    for (const a of [0, 2.7]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), thinMat(h, lb, 0.75));
      b.userData.a = a;
      b.renderOrder = 7;
      orbit.add(b);
      orbiters.push(b);
    }
  }
  if (k.accessory === "visor") {
    const ring = new THREE.Group();
    ring.rotation.set(0.32, 0, -0.1);
    ring.position.y = -0.22;
    acc.add(ring);
    const hv = { mid: "#6fb8ff", rim: "#d4efff" };
    for (let j = 0; j < 10; j++) {
      const a0 = (j / 10) * Math.PI * 2;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(1.36, 1.36, 0.3, 14, 1, true, a0, ((Math.PI * 2) / 10) * 0.72),
        thinMat(hv, lb, 0.34, THREE.DoubleSide),
      );
      seg.renderOrder = Math.cos(a0 + 0.2) > 0 ? 8 : 1;
      ring.add(seg);
    }
    for (const y of [0.17, -0.17]) {
      const edge = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.014, 6, 140), thinMat(hv, lb, 0.7));
      edge.rotation.x = Math.PI / 2;
      edge.position.y = y;
      edge.renderOrder = 8;
      ring.add(edge);
    }
  }
  if (k.accessory === "beanie") {
    const knit = new THREE.MeshStandardMaterial({ color: 0x6a52e0, roughness: 1, emissive: 0x3c28a8, emissiveIntensity: 0.55 });
    const hat = new THREE.Group();
    hat.position.set(-0.06, 0.42, 0);
    hat.rotation.z = 0.26;
    acc.add(hat);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2), knit);
    dome.scale.set(1, 0.9, 1);
    hat.add(dome);
    const ribGeo = new THREE.CapsuleGeometry(0.075, 0.14, 6, 10);
    for (let j = 0; j < 26; j++) {
      const a = (j / 26) * Math.PI * 2;
      const rib = new THREE.Mesh(ribGeo, knit);
      rib.position.set(Math.cos(a) * 0.9, 0.02, Math.sin(a) * 0.9);
      hat.add(rib);
    }
  }
  if (showSparks && k.sparks === "lines") {
    for (let j = 0; j < 3; j++) {
      const sp = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.17, 4, 8), flat(0x8fe9ff));
      const a = 0.5 + j * 0.3;
      sp.position.set(Math.cos(a) * 1.62, Math.sin(a) * 1.62, 0.2);
      sp.rotation.z = a - Math.PI / 2;
      sp.renderOrder = 11;
      acc.add(sp);
    }
  }
  if (showSparks && k.sparks === "dot") {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), flat(h.lite));
    d.position.set(1.42, 0.92, 0.2);
    d.renderOrder = 11;
    acc.add(d);
  }
  if (showSparks && k.sparks === "stars") {
    for (const [x, y, r] of [
      [1.5, 1.0, 0.2],
      [1.72, 0.62, 0.13],
    ] as const) {
      const st = new THREE.Mesh(starGeo(r), flat(0xffd36e));
      st.position.set(x, y, 0.2);
      st.renderOrder = 11;
      acc.add(st);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(r * 4, r * 4), soft(0xffc24a, 0.5));
      gl.position.set(x, y, 0.19);
      gl.renderOrder = 10;
      acc.add(gl);
    }
  }

  const setTheme = (next: OrbTheme) => {
    const v = next === "light" ? 1 : 0;
    for (const m of shaders) m.uniforms.lightBg.value = v;
    acc.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (m && "uniforms" in m && m.uniforms?.lightBg) m.uniforms.lightBg.value = v;
    });
    halo.visible = next === "dark";
    floor.visible = next === "dark";
  };
  setTheme(theme);

  // Motion state, eased so a change of state never snaps.
  let liquid = 0;
  let speed = 1;
  let wob = 0.012;
  let tilt = 0;
  let eyeOpen = 1;
  let blinkT = 0;
  let blinkNext = 2 + traits.hue * 0.4;
  const ph = traits.hue * 1.3;

  const update = (time: number, dt: number, state: OrbState, still = false) => {
    const t = time + ph;
    const talking = state === "speaking";
    const listening = state === "listening";
    if (still) {
      liquid = t;
      speed = 1;
      wob = 0.012;
      tilt = 0;
      eyeOpen = 1;
    } else {
      speed = ease(speed, talking ? 1.8 : 1, dt, 4);
      liquid += dt * speed;
      wob = ease(wob, talking ? 0.03 : listening ? 0.02 : 0.012, dt, 5);
      tilt = ease(tilt, listening ? 0.13 : 0, dt, 5);
      eyeOpen = ease(eyeOpen, listening ? 1.25 : 1, dt, 8);
    }
    for (const m of shaders) m.uniforms.t.value = liquid;
    bm.uniforms.wob.value = wob;
    root.position.y = still ? 0 : Math.sin(t * 1.1) * 0.09;
    root.rotation.y = Math.sin(t * 0.5) * 0.16;
    root.rotation.z = tilt + Math.sin(t * 0.7) * 0.03;
    const sq = talking && !still ? Math.abs(Math.sin(t * 9)) * 0.035 : 0;
    root.scale.set(1.28 * (1 + sq), 1.28 * (1 - sq), 1.28);
    let b = 1;
    if (!still) {
      blinkT += dt;
      if (blinkT > blinkNext) {
        const q = (blinkT - blinkNext) / 0.16;
        b = q < 1 ? Math.abs(1 - 2 * q) + 0.05 : 1;
        if (q >= 1) {
          blinkT = 0;
          blinkNext = 2 + Math.random() * 3.5;
        }
      }
    }
    for (const e of eyes) e.scale.y = eyeOpen * b;
    if (talking && !still) {
      smile.visible = false;
      open.visible = true;
      open.scale.y = 0.35 + Math.abs(Math.sin(t * 10) * Math.sin(t * 3.1)) * 1.1;
    } else {
      smile.visible = k.mouth === "smile";
      open.visible = k.mouth === "open";
      open.scale.y = 1;
    }
    for (const o of orbiters) {
      const a = (o.userData.a as number) + t;
      o.position.set(Math.cos(a) * 1.52, Math.sin(a) * 1.52, 0);
    }
  };

  const dispose = () => {
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) geos.add(m.geometry);
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x));
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  };

  return { root, update, setTheme, dispose };
}

/* ---------------- staging ---------------- */

/* World units visible above the centre: the body (radius 1.28) plus room for sparks and the
   glasses' orbit inside a round frame. The smaller the frame, the tighter the face is framed;
   at 48px and under the sparks, which would only be specks, are left off. */
const FOV = 22;
const SMALL_PX = 48;
const HALF_VIEW = 2.2;
function halfViewFor(px: number): number {
  if (px <= SMALL_PX) return 1.9;
  if (px <= 72) return 2.05;
  return HALF_VIEW;
}

function placeCamera(camera: THREE.PerspectiveCamera, half: number) {
  camera.position.set(0, 0, half / Math.tan(((FOV / 2) * Math.PI) / 180));
}

function stage(): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  placeCamera(camera, HALF_VIEW);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-3, 5, 6);
  scene.add(sun);
  return { scene, camera };
}

function newRenderer(canvas: HTMLCanvasElement, preserve: boolean): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: preserve });
  r.setClearColor(0x000000, 0);
  return r;
}

export interface OrbView {
  /** draw one frame; `t` is seconds since the view started */
  frame(t: number, dt: number, state: OrbState, still?: boolean): void;
  resize(cssPx: number): void;
  setTheme(theme: OrbTheme): void;
  dispose(): void;
}

/** A live creature on its own canvas. */
export function createOrbView(canvas: HTMLCanvasElement, seed: string, theme: OrbTheme, sizePx: number): OrbView {
  const renderer = newRenderer(canvas, false);
  const { scene, camera } = stage();
  const creature = buildCreature(orbTraits(seed), theme, 40, { sparks: sizePx > SMALL_PX });
  scene.add(creature.root);
  return {
    frame(t, dt, state, still) {
      creature.update(t, dt, state, still);
      renderer.render(scene, camera);
    },
    resize(cssPx) {
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(cssPx, cssPx, false);
      placeCamera(camera, halfViewFor(cssPx));
    },
    setTheme: creature.setTheme,
    dispose() {
      scene.remove(creature.root);
      creature.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/* Reading the WebGL canvas back with canvas.toDataURL() stalls for most of a second per call in
   Chromium; reading the few pixels with readPixels and encoding them from a 2D canvas is quick.
   The drawing buffer holds premultiplied alpha bottom-up; ImageData wants it straight, top-down. */
let encoder: HTMLCanvasElement | null = null;
function toDataUrl(renderer: THREE.WebGLRenderer, px: number): string {
  const gl = renderer.getContext();
  const buf = new Uint8Array(px * px * 4);
  gl.readPixels(0, 0, px, px, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  encoder ??= document.createElement("canvas");
  encoder.width = encoder.height = px;
  const g = encoder.getContext("2d")!;
  const img = g.createImageData(px, px);
  const row = px * 4;
  for (let y = 0; y < px; y++) {
    const src = (px - 1 - y) * row;
    const dst = y * row;
    for (let x = 0; x < row; x += 4) {
      const a = buf[src + x + 3];
      const k = a ? 255 / a : 0;
      img.data[dst + x] = Math.min(255, Math.round(buf[src + x] * k));
      img.data[dst + x + 1] = Math.min(255, Math.round(buf[src + x + 1] * k));
      img.data[dst + x + 2] = Math.min(255, Math.round(buf[src + x + 2] * k));
      img.data[dst + x + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  return encoder.toDataURL("image/png");
}

/* One shared offscreen renderer for every still avatar, its renders queued one at a time. */
let shared: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** A still snapshot of an agent's creature as a PNG data URL, `sizePx` CSS pixels square. */
export function renderOrbSnapshot(seed: string, sizePx: number, theme: OrbTheme, dpr: number): Promise<string> {
  const job = queue.then(() => {
    if (!shared) {
      const canvas = document.createElement("canvas");
      shared = { renderer: newRenderer(canvas, false), ...stage() };
    }
    const { renderer, scene, camera } = shared;
    const px = Math.max(16, Math.round(sizePx * dpr));
    renderer.setPixelRatio(1);
    renderer.setSize(px, px, false);
    const small = sizePx <= SMALL_PX;
    placeCamera(camera, halfViewFor(sizePx));
    const creature = buildCreature(orbTraits(seed), theme, sizePx > 72 ? 32 : 20, { sparks: !small });
    scene.add(creature.root);
    // A fixed moment: the liquid mid-wave, the body facing forward, eyes open.
    creature.update(0.9, 0, "idle", true);
    renderer.clear();
    renderer.render(scene, camera);
    const url = toDataUrl(renderer, px);
    scene.remove(creature.root);
    creature.dispose();
    return url;
  });
  queue = job.catch(() => undefined);
  return job;
}
