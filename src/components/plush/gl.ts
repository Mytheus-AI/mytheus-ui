/* The plush program on one WebGL2 context: compile once, then draw any character in any pose.
   Used by the shared still renderer (stills.ts) and by each live canvas (PlushLive). No React. */

import { PLUSH_FIT, type PlushSpec, type PlushView } from "@/lib/plush";
import type { PlushPose } from "@/lib/plush-motion";
import { PLUSH_FS, PLUSH_VS } from "./shader";

const UNIFORMS = [
  "uShape",
  "uEyeY",
  "uEye",
  "uArc",
  "uLook",
  "uRes",
  "uView",
  "uTime",
  "uPhase",
  "uAcc",
  "uCol",
  "uPhones",
  "uSprout",
  "uHop",
  "uSq",
  "uTilt",
  "uBlinkL",
  "uBlinkR",
  "uWink",
  "uThink",
  "uListen",
  "uSpeak",
  "uLevel",
  "uMouth",
  "uGround",
  "uPaper",
  "uStage",
] as const;
type UniformName = (typeof UNIFORMS)[number];

export interface PlushDraw {
  spec: PlushSpec;
  pose: PlushPose;
  view: PlushView;
  /** seconds on the clock the pose was stepped with (the thinking spark orbits on it) */
  time: number;
  /** drawing buffer size in pixels */
  width: number;
  height: number;
  /** the shadow and colour bounce under the character */
  ground: boolean;
  /** on a light surface the shadow keeps the prototype's warm cast */
  paper: boolean;
  /** the listening ripples and the speaking arcs, which need a frame large enough to hold them */
  stage?: boolean;
}

export interface PlushProgram {
  draw(d: PlushDraw): void;
  dispose(): void;
}

/** The context attributes every plush canvas uses: transparent, premultiplied, no MSAA (the felt
    fringe softens the edge, and stills are supersampled). */
export const PLUSH_CONTEXT: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: "low-power",
};

/** A program that is still compiling. `ready()` never blocks; `finish()` blocks until it is done. */
export interface PlushProgramBuild {
  ready(): boolean;
  /** Throws if the context cannot run the shader. */
  finish(): PlushProgram;
}

/**
 * Starts compiling the plush shader on `gl`. Where the browser can compile in the background
 * (KHR_parallel_shader_compile, which Chrome, Safari and Firefox have), nothing here blocks the
 * main thread: poll `ready()` each frame, then `finish()`. The raymarcher takes a quarter of a
 * second to compile on a fast GPU, so a page with four live faces would otherwise freeze for one.
 */
export function startPlushProgram(gl: WebGL2RenderingContext): PlushProgramBuild {
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const make = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error("plush: could not create a shader");
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const vs = make(gl.VERTEX_SHADER, PLUSH_VS);
  const fs = make(gl.FRAGMENT_SHADER, PLUSH_FS);
  const program = gl.createProgram();
  if (!program) throw new Error("plush: could not create a program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return {
    ready: () => !parallel || gl.isContextLost() || Boolean(gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)),
    finish: () => finishPlushProgram(gl, program, vs, fs),
  };
}

/** Compiles the plush shader on `gl` and waits for it. Throws if the context cannot run it. */
export function createPlushProgram(gl: WebGL2RenderingContext): PlushProgram {
  return startPlushProgram(gl).finish();
}

function finishPlushProgram(gl: WebGL2RenderingContext, program: WebGLProgram, vs: WebGLShader, fs: WebGLShader): PlushProgram {
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    const log = gl.getProgramInfoLog(program) || gl.getShaderInfoLog(vs) || gl.getShaderInfoLog(fs);
    throw new Error(`plush: the shader did not build: ${log}`);
  }
  gl.useProgram(program);

  // one triangle that covers the viewport
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  const u = {} as Record<UniformName, WebGLUniformLocation | null>;
  for (const name of UNIFORMS) u[name] = gl.getUniformLocation(program, name);

  return {
    draw({ spec, pose, view, time, width, height, ground, paper, stage = true }) {
      const fit = PLUSH_FIT[spec.shape];
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.uniform1i(u.uShape, spec.shapeIndex);
      gl.uniform1i(u.uAcc, spec.accessoryIndex);
      gl.uniform1f(u.uArc, spec.eyes === "happy" ? 1 : 0);
      gl.uniform3f(u.uCol, spec.colour.rgb[0], spec.colour.rgb[1], spec.colour.rgb[2]);
      gl.uniform1f(u.uEyeY, fit.eyeY);
      gl.uniform4f(u.uPhones, fit.phones.x, fit.phones.y, fit.phones.top, fit.phones.square);
      gl.uniform2f(u.uSprout, fit.sprout.x, fit.sprout.y);
      gl.uniform1f(u.uPhase, spec.phase * 6);
      gl.uniform2f(u.uRes, width, height);
      gl.uniform3f(u.uView, view.cx, view.cy, view.span);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uHop, pose.hop);
      gl.uniform1f(u.uSq, pose.sq);
      gl.uniform1f(u.uTilt, pose.tilt);
      gl.uniform1f(u.uBlinkL, pose.blinkL);
      gl.uniform1f(u.uBlinkR, pose.blinkR);
      gl.uniform1f(u.uWink, pose.wink);
      gl.uniform1f(u.uEye, pose.eye);
      gl.uniform1f(u.uThink, pose.think);
      gl.uniform1f(u.uListen, pose.listen);
      gl.uniform1f(u.uSpeak, pose.speak);
      gl.uniform1f(u.uLevel, pose.level);
      gl.uniform1f(u.uMouth, pose.mouth);
      gl.uniform2f(u.uLook, pose.look[0], pose.look[1]);
      gl.uniform1f(u.uGround, ground ? 1 : 0);
      gl.uniform1f(u.uPaper, paper ? 1 : 0);
      gl.uniform1f(u.uStage, stage ? 1 : 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
