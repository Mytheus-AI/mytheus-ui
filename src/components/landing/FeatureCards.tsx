import { LiveCapture } from "./LiveCapture";

/* The "in the room" section. LiveCapture owns the whole composition: a
   scroll-driven, pinned demo that distills one spoken line into one structured
   capture at a time, with a legend of the full range. It renders its own
   <section id="product"> (tall, so the pin has room to scrub), so this is just
   a thin passthrough kept for the page's import structure. */

export function FeatureCards() {
  return <LiveCapture />;
}
