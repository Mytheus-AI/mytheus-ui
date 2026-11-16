import type { CSSProperties } from "react";
import { HeroField } from "@/components/home/fx/HeroField";
import s from "@/components/home/home.module.css";

/* The home hero: the full first screen is React Bits GradientASCII (HeroField), edge to edge and
   running up under the floating nav, with the promise on top: "Every meeting, on repeat." and the
   lead. (The nav carries the one action.) Words arrive once, in order; reduced motion shows them in place. */

const d = (dl: string) => ({ ["--dl" as string]: dl }) as CSSProperties;

export function HomeHero() {
  return (
    <section
      id="hero"
      data-snap=""
      data-snap-label="Start"
      className="relative isolate -mt-[76px] flex min-h-[100svh] flex-col justify-center overflow-hidden pt-[76px]"
    >
      <div aria-hidden className={`${s.heroGround} absolute inset-0 -z-10`}>
        <HeroField />
      </div>

      <div data-snap-in="" className="mx-auto flex w-[min(1280px,100%-40px)] flex-col items-center py-[clamp(48px,8vh,96px)] text-center sm:w-[min(1280px,100%-80px)]">
        <h1 className={`${s.halo} display text-[clamp(3.4rem,9.4vw,8.6rem)] leading-[0.9] tracking-[-0.045em]`}>
          <span className={`${s.word} block`} style={d(".12s")}>
            Every meeting,
          </span>
          <span className={`${s.word} block text-signal-ink`} style={d(".3s")}>
            on repeat.
          </span>
        </h1>

        <p className={`${s.rise} ${s.halo} mt-[clamp(24px,3.6vh,40px)] max-w-[56ch] text-[clamp(1.1rem,1.6vw,1.3rem)] leading-relaxed text-ink-2`} style={d(".7s")}>
          Everyone gets their own Myte. It sits in the noise of every call, keeps the decisions that matter to you, and carries them into the
          next meeting, and the one after that.
        </p>
      </div>
    </section>
  );
}
