"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { plushBucket, plushSpec, type PlushBucket } from "@/lib/plush";
import { PlushFallback, PlushPlaceholder } from "./PlushFallback";
import { cachedPlushStill, requestPlushStill } from "./stills";

/* A plush still: the character a seed draws, as a picture.

   It never owns a canvas. The picture comes from the one shared renderer (stills.ts), cached per
   seed and size bucket, and is shown in an <img>. On the server, and until the picture is ready,
   a soft circle in the character's colour holds exactly the same box, so nothing shifts. If WebGL2
   is missing or its context is lost for good, the circle gains two simple eyes (SVG) and stays.

   The element fills whatever box its class gives it (`h-9 w-9`, `h-full w-full`). The picture is
   transparent, so it sits on any surface in either theme. */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* One observer for every still on the page: a face far down a long list is drawn when it nears
   the viewport, not on mount. */
const waiting = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | null = null;
function whenNear(el: Element, run: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    run();
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const go = waiting.get(e.target);
        waiting.delete(e.target);
        observer?.unobserve(e.target);
        go?.();
      }
    },
    { rootMargin: "400px" },
  );
  waiting.set(el, run);
  observer.observe(el);
  return () => {
    waiting.delete(el);
    observer?.unobserve(el);
  };
}

export function Plush({
  seed,
  size,
  title,
  className = "",
}: {
  seed: string;
  /** the box's width in CSS pixels, if known; otherwise it is measured */
  size?: number;
  /** accessible name; omit for a decorative face */
  title?: string;
  className?: string;
}) {
  const spec = useMemo(() => plushSpec(seed), [seed]);
  const wrap = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<{ seed: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useIsoLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setFailed(false);
    const px = size ?? (el.clientWidth || 48);
    const bucket: PlushBucket = plushBucket(px, window.devicePixelRatio || 1);
    const hit = cachedPlushStill(seed, bucket);
    if (hit) {
      setShown({ seed, url: hit });
      return;
    }
    let alive = true;
    const stop = whenNear(el, () => {
      requestPlushStill(seed, bucket).then(
        (url) => {
          if (alive) setShown({ seed, url });
        },
        () => {
          if (alive) setFailed(true);
        },
      );
    });
    return () => {
      alive = false;
      stop();
    };
  }, [seed, size]);

  const url = shown && shown.seed === seed ? shown.url : null;
  const state = url ? "still" : failed ? "fallback" : "pending";

  return (
    <span
      ref={wrap}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-plush={state}
      data-ready={state === "pending" ? undefined : ""}
      className={`plush ${className}`}
    >
      {url ? (
        // A data URL rendered on this page; next/image has nothing to optimise here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" draggable={false} decoding="sync" />
      ) : failed ? (
        <PlushFallback spec={spec} />
      ) : (
        <PlushPlaceholder spec={spec} />
      )}
    </span>
  );
}
