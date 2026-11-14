/* ================================================================== */
/*  How a live plush moves: the approved prototype's animation system  */
/*  (design-previews/agent-plush-avatars.html), for one character.     */
/*                                                                     */
/*  A small state machine with a spring for squash. Each frame it      */
/*  turns what is happening (the agent's state, where the pointer,     */
/*  the caret or the speaker is, the audio level, how long since the   */
/*  last activity) into the pose the shader draws: hop, squash, tilt,  */
/*  the two lids, wink, eye size, where the eyes look, and how present */
/*  the thinking spark and the listening and speaking ripples are.     */
/*                                                                     */
/*  The maths is the prototype's frame loop, kept term for term, with  */
/*  its six-character grid reduced to one character: "look at a        */
/*  neighbour" becomes a glance toward nearby UI (or to one side).     */
/*                                                                     */
/*  Pure: no DOM and no clock of its own. Every method takes `now` in  */
/*  milliseconds, and randomness can be injected, so it is tested      */
/*  without a browser (tests/plush-motion.test.ts).                    */
/* ================================================================== */

export type PlushState = "idle" | "listening" | "speaking" | "thinking" | "happy";

export interface PlushPose {
  /** 0..1, how far through a hop's arc (the shader lifts the body by 0.34 of this) */
  hop: number;
  /** squash and stretch: positive is taller and narrower */
  sq: number;
  /** head tilt in radians, pivoting on the ground */
  tilt: number;
  /** 1 open, 0 closed */
  blinkL: number;
  blinkR: number;
  /** 0 bead eyes, 1 the left eye is a happy arc (wink), 2 both are (smile, celebrate) */
  wink: number;
  /** eye size, 1 at rest */
  eye: number;
  /** 0..1, the thinking spark's presence */
  think: number;
  /** 0..1, how present listening (floor ripples flowing in) is */
  listen: number;
  /** 0..1, how present speaking (the mouth and the sound arcs) is */
  speak: number;
  /** 0..1, the audio level driving the ripples, the sound arcs and the speaking pulse */
  level: number;
  /** 0..1, how open the mouth is; it exists while speaking, and while thinking out loud */
  mouth: number;
  /** where the eyes look, each about -1..1 (x right, y up) */
  look: [number, number];
}

/** The pose of a still: standing, eyes open, looking straight ahead. */
export const PLUSH_NEUTRAL_POSE: PlushPose = { hop: 0, sq: 0, tilt: 0, blinkL: 1, blinkR: 1, wink: 0, eye: 1, think: 0, listen: 0, speak: 0, level: 0, mouth: 0, look: [0, 0] };

export type PlushMood = "awake" | "drowsy" | "asleep";

export interface PlushMotionOptions {
  /** the prototype's cell index (0..6): offsets breathing, sway and the spark's orbit */
  phase?: number;
  /** which way the head leans a touch while listening */
  side?: 1 | -1;
  /** seconds without activity before the eyes half close (the prototype's 30) */
  drowsyAfter?: number;
  /** seconds without activity before it falls asleep (the prototype's 50) */
  asleepAfter?: number;
  /** how often a smile tick lands on this character; the prototype picks one of its six */
  smileChance?: number;
  /** the clock's reading when the character appears, in milliseconds */
  now?: number;
  /** 0..1 source for blinks, gaze and fidgets */
  random?: () => number;
}

export type LookTarget = readonly [number, number];

export interface PlushMotionInput {
  state: PlushState;
  /** where the pointer is, as a look target (-1..1 each), or null when it is away */
  pointer?: LookTarget | null;
  /** when the pointer last moved, on the same clock as `now` */
  pointerAt?: number;
  /** the pointer is over the character */
  hover?: boolean;
  /** where the caret of the field being typed in is, as a look target */
  caret?: LookTarget | null;
  /** while listening: where the person speaking is. Without one it looks at the viewer. */
  speaker?: LookTarget | null;
  /** an idle glance's target, toward nearby UI. Without one it glances to a side. */
  glance?: LookTarget | null;
  /** a real audio level, 0..1. Without one a simulated envelope stands in. */
  level?: number | null;
}

/* The prototype's numbers. */
export const WINK_SECONDS = 0.55;
export const SMILE_SECONDS = 0.9;
export const CELEBRATE_MS = 1300;
export const TYPING_MS = 1200;
export const POINTER_FOLLOW_MS = 2500;
export const FIDGET_MIN_MS = 3500;
export const FIDGET_SPREAD_MS = 4500;
export const SMILE_MIN_MS = 7000;
export const SMILE_SPREAD_MS = 7000;
/** A frame never advances the simulation by more than this, so a stalled tab cannot fling it. */
export const MAX_DT = 0.05;

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/** The prototype's stand-in for a voice: syllables inside phrase swells, with pauses for breath. */
export function simulatedLevel(t: number): number {
  return Math.pow(Math.abs(Math.sin(t * 8.5)), 0.7) * (0.45 + 0.55 * (Math.sin(t * 2.1 + 1) * 0.5 + 0.5)) * (Math.sin(t * 0.9) > -0.75 ? 1 : 0.08);
}

export interface PlushMotion {
  /** Any activity: resets the sleep timers and, if it was drowsy or asleep, startles it awake. */
  act(now: number): void;
  /** A click: a wink and a squash-bounce. */
  click(now: number): void;
  /** A double click: a full hop. */
  doubleClick(now: number): void;
  /** A key pressed in the field it follows: a tiny bob; Enter celebrates. */
  key(now: number, enter?: boolean): void;
  /** Both eyes become happy arcs and it hops. */
  celebrate(now: number): void;
  /** Advances to `now` and returns the pose to draw. The returned object is reused. */
  step(now: number, input: PlushMotionInput): PlushPose;
  mood(now: number): PlushMood;
  /** Seconds on the shader's clock at the last step (the spark and the ripples run on it). */
  readonly time: number;
}

export function createPlushMotion(options: PlushMotionOptions = {}): PlushMotion {
  const i = options.phase ?? 0;
  const side = options.side ?? 1;
  const drowsyAfter = options.drowsyAfter ?? 30;
  const asleepAfter = Math.max(drowsyAfter, options.asleepAfter ?? 50);
  const smileChance = options.smileChance ?? 0.35;
  const random = options.random ?? Math.random;
  const t0 = options.now ?? 0;

  const s = {
    look: [0, 0] as [number, number],
    tgt: [0, 0] as [number, number],
    wt: 0,
    blink: 1,
    bt: 0,
    bn: 1 + i * 0.5,
    dbl: false,
    wink: 0,
    hop: 0,
    amp: 1,
    sq: 0,
    sqV: 0,
    tilt: 0,
    eye: 1,
    boost: 0,
    wig: 0,
    think: 0,
    fast: 7,
    bd: 0.15,
    nod: 0,
    nn: 1,
    smile: 0,
    li: 0,
    sp: 0,
    mouth: 0,
    pk: false,
  };
  let last = t0;
  let time = 0;
  let lastAct = t0;
  let lastKey = -1e9;
  let happyUntil = 0;
  let nextFid = t0 + 4000;
  let nextSmile = t0 + 6000;
  let prevState: PlushState | null = null;
  const pose: PlushPose = { ...PLUSH_NEUTRAL_POSE, look: [0, 0] };

  const act = (now: number) => {
    // the startle: a little bounce and wide eyes
    if (now - lastAct > drowsyAfter * 1000) {
      s.sqV += 1.4;
      s.boost = 0.6;
    }
    lastAct = now;
  };
  const celebrate = (now: number) => {
    happyUntil = now + CELEBRATE_MS;
    s.hop = 1;
    s.amp = 0.8;
    act(now);
  };
  const mood = (now: number): PlushMood => {
    const idleFor = (now - lastAct) / 1000;
    return idleFor > asleepAfter ? "asleep" : idleFor > drowsyAfter ? "drowsy" : "awake";
  };

  return {
    act,
    celebrate,
    mood,
    get time() {
      return time;
    },
    click(now) {
      s.wink = WINK_SECONDS;
      s.sqV -= 1.8;
      act(now);
    },
    doubleClick(now) {
      s.hop = 1;
      s.amp = 1;
      act(now);
    },
    key(now, enter = false) {
      lastKey = now;
      act(now);
      s.sqV -= 0.35 + random() * 0.5;
      if (enter) celebrate(now);
    },
    step(now, input) {
      const dt = Math.max(0, Math.min(MAX_DT, (now - last) / 1000));
      last = now;
      const t = (now - t0) / 1000;
      time = t;
      const mode = input.state;
      const hover = Boolean(input.hover);

      // A new state is activity; "happy" is a celebration on arrival. An agent that is listening,
      // speaking or thinking is at work, so it does not nod off part way through.
      if (mode !== prevState) {
        if (prevState !== null) act(now);
        if (mode === "happy" && prevState !== null) celebrate(now);
        prevState = mode;
      }
      if (mode === "listening" || mode === "speaking" || mode === "thinking") lastAct = now;

      const idleFor = (now - lastAct) / 1000;
      const typing = now - lastKey < TYPING_MS;
      const drowsy = idleFor > drowsyAfter;
      const asleep = idleFor > asleepAfter;
      const happy = now < happyUntil;
      const resting = mode === "idle" || mode === "happy";
      const level = Math.max(0, Math.min(1, input.level ?? simulatedLevel(t)));

      // the content smile: a brief happy-arc smile with a tiny bounce
      if (now > nextSmile && resting && !drowsy) {
        nextSmile = now + SMILE_MIN_MS + random() * SMILE_SPREAD_MS;
        if (random() < smileChance) {
          s.smile = SMILE_SECONDS;
          s.sqV += 0.7;
        }
      }
      // idle fidgets: a small hop, a wiggle, or a glance
      if (now > nextFid && !drowsy && !typing && resting) {
        nextFid = now + FIDGET_MIN_MS + random() * FIDGET_SPREAD_MS;
        const r = random();
        if (r < 0.35) {
          s.hop = 1;
          s.amp = 0.4;
        } else if (r < 0.7) {
          s.wig = 1;
        } else {
          s.tgt = input.glance ? [clamp1(input.glance[0]), clamp1(input.glance[1])] : [random() < 0.5 ? -1 : 1, 0];
          s.wt = 1.6;
        }
      }

      // where the eyes want to be
      let tx: number;
      let ty: number;
      if (asleep || drowsy) {
        tx = 0;
        ty = -0.35;
      } else if (mode === "thinking") {
        // the spark's orbit angle, on the same clock the shader uses
        const th = t * 2.6 + i * 1.7;
        tx = clamp1(Math.cos(th) * 1.05);
        ty = clamp1(0.45 + Math.sin(th) * 0.55);
      } else if (typing && input.caret) {
        tx = clamp1(input.caret[0]);
        ty = clamp1(input.caret[1]);
      } else if (mode === "listening") {
        // a steady gaze on whoever is speaking (the viewer, when the room does not say), with
        // micro-saccades, and a nod now and then
        const sp = input.speaker ?? [0, 0.05];
        tx = clamp1(sp[0]) + Math.sin(t * 13 + i) * 0.03;
        ty = clamp1(sp[1]);
        s.fast = 9;
        s.nn -= dt;
        if (s.nn <= 0) {
          s.nn = 1.5 + random() * 2.2;
          s.nod = 1;
          s.sqV -= 0.85;
        }
      } else if (mode === "speaking") {
        // mostly on the viewer, with a glance away now and then, and a bounce on each voice peak
        s.wt -= dt;
        if (s.wt <= 0) {
          s.wt = 0.9 + random() * 2;
          s.fast = 18;
          s.tgt = random() < 0.65 ? [0, 0.05] : [(random() * 2 - 1) * 0.8, (random() * 2 - 1) * 0.4];
        }
        tx = s.tgt[0];
        ty = s.tgt[1];
        if (level > 0.62 && !s.pk) {
          s.pk = true;
          s.sqV += 0.95;
        }
        if (level < 0.4) s.pk = false;
      } else if (input.pointer && now - (input.pointerAt ?? now) < POINTER_FOLLOW_MS) {
        tx = clamp1(input.pointer[0]);
        ty = clamp1(input.pointer[1]);
        s.fast = 9;
      } else {
        // idle gaze: a fast saccade to a new target, then a hold
        s.wt -= dt;
        if (s.wt <= 0) {
          const r = random();
          s.wt = 0.7 + random() * 2.3;
          s.fast = 22;
          if (r < 0.28) s.tgt = [0, 0.05];
          else if (r < 0.52) s.tgt = input.glance ? [clamp1(input.glance[0]), clamp1(input.glance[1])] : [random() < 0.5 ? -1 : 1, 0];
          else s.tgt = [random() * 2 - 1, (random() * 2 - 1) * 0.7];
        }
        tx = s.tgt[0];
        ty = s.tgt[1];
      }
      s.nod = Math.max(0, s.nod - dt * 3.2);
      ty -= Math.sin(s.nod * Math.PI) * 0.7;
      const k = Math.min(1, dt * (typing ? 14 : s.fast));
      s.look[0] += (tx - s.look[0]) * k;
      s.look[1] += (ty - s.look[1]) * k;

      // blinks: single, double (22%) and slow; slower while listening
      s.bt += dt;
      if (s.bt > s.bn) {
        const q = (s.bt - s.bn) / s.bd;
        s.blink = q < 1 ? Math.abs(1 - 2 * q) : 1;
        if (q >= 1) {
          s.bt = 0;
          const r = random();
          const slow = mode === "listening" ? 1.5 : 1;
          if (s.dbl) {
            s.dbl = false;
            s.bn = (1.8 + random() * 3.4) * slow;
            s.bd = 0.15;
          } else if (r < 0.22) {
            s.dbl = true;
            s.bn = 0.1;
            s.bd = 0.14;
          } else {
            s.bn = (1.6 + random() * 3.6) * slow;
            s.bd = r > 0.88 ? 0.42 : 0.15;
          }
        }
      }
      const lid = asleep ? 0 : drowsy ? 0.5 : 1;
      const bl = Math.min(s.blink, lid);

      s.wink = Math.max(0, s.wink - dt);
      s.boost = Math.max(0, s.boost - dt);
      s.hop = Math.max(0, s.hop - dt * 1.9);
      s.wig = Math.max(0, s.wig - dt * 1.4);

      // squash: breathing, perking up under the pointer and the voice, on a spring
      const sqT =
        (asleep ? Math.sin(t * 0.9 + i) * 0.03 : Math.sin(t * 1.7 + i * 1.3) * 0.02) +
        (hover ? 0.035 : 0) +
        (mode === "speaking" ? Math.sin(t * 11 + i * 2) * 0.03 * level : 0) +
        (mode === "listening" ? level * 0.014 : 0);
      s.sqV += (-170 * (s.sq - sqT) - 13 * s.sqV) * dt;
      s.sq += s.sqV * dt;

      // the head leans a little with the gaze, and toward the speaker while listening
      const tiltT =
        -s.look[0] * 0.035 +
        (mode === "speaking" ? Math.sin(t * 2.3 + i) * 0.05 : 0) +
        (mode === "listening" ? -s.look[0] * 0.11 + 0.03 * side : mode === "thinking" ? Math.cos(t * 2.6 + i * 1.7) * 0.05 : 0) +
        (drowsy ? Math.sin(t * 0.5 + i) * 0.05 : Math.sin(t * 0.8 + i) * 0.022) +
        Math.sin(s.wig * 26) * 0.09 * s.wig;
      s.tilt += (tiltT - s.tilt) * Math.min(1, dt * 10);

      const eyeT = (mode === "listening" ? 1.14 + level * 0.05 : mode === "speaking" ? 1 + level * 0.07 : 1) * (hover ? 1.1 : 1) + (s.boost > 0 ? 0.22 : 0);
      s.eye += (eyeT - s.eye) * Math.min(1, dt * 12);

      const ease = Math.min(1, dt * 4);
      s.think += ((mode === "thinking" && !drowsy ? 1 : 0) - s.think) * ease;
      s.li += ((mode === "listening" && !drowsy ? 1 : 0) - s.li) * ease;
      // Thinking out loud (Talk mode's "Let me check."): the spark stays and the mouth moves with the sound.
      const voiced = mode === "speaking" || (mode === "thinking" && level > 0.02);
      s.sp += ((voiced && !drowsy ? 1 : 0) - s.sp) * ease;
      s.mouth += ((voiced ? Math.min(1, level * 1.3) : 0) - s.mouth) * Math.min(1, dt * 22);
      s.smile = Math.max(0, s.smile - dt);
      const squint = 1 - 0.1 * s.think;

      pose.hop = Math.sin(s.hop * Math.PI) * s.amp;
      pose.blinkL = Math.min(bl, squint);
      pose.blinkR = Math.min(bl, squint);
      pose.wink = happy || s.smile > 0 ? 2 : s.wink > 0 ? 1 : 0;
      pose.sq = s.sq;
      pose.tilt = s.tilt;
      pose.eye = s.eye;
      pose.think = s.think;
      pose.listen = s.li;
      pose.speak = s.sp;
      pose.level = level;
      pose.mouth = Math.max(0, s.mouth);
      pose.look[0] = s.look[0];
      pose.look[1] = s.look[1];
      return pose;
    },
  };
}
