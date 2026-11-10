/* The Mytheus mark - the clay tangle-into-line symbol, traced as a single
   continuous SVG stroke so it can DRAW ITSELF: `.logo-path` animates
   stroke-dashoffset from 1 → 0 (pathLength is normalized), which plays a
   live-drawing reveal on mount and replays on any ancestor `.group` hover
   (keyframes in globals.css, reduced-motion renders it fully drawn).
   The mark is landscape (~1.94:1), so `size` is its HEIGHT and the width is
   derived from the intrinsic aspect. The PNG originals (public/logo-mark*.png)
   are kept for the favicon / app icons only. */
export const MARK_ASPECT = 802 / 414; // intrinsic w/h of the tight-cropped mark

/* one continuous line: four tangled loops resolving into the rising zigzag */
export const MARK_PATH =
  "M 250 55 C 180 10 70 30 45 110 C 25 175 60 235 120 225 C 190 212 240 140 205 100 " +
  "C 165 55 90 110 85 180 C 80 255 135 300 200 285 C 265 268 285 205 245 172 " +
  "C 205 140 135 205 140 270 C 145 345 215 395 275 355 C 325 320 305 250 255 245 " +
  "C 290 245 330 240 365 235 C 410 228 465 130 510 82 C 528 65 545 90 570 155 " +
  "C 598 230 620 320 648 352 C 665 372 680 340 700 275 C 725 195 752 90 775 38";

export function LogoMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 802 414"
      width={Math.round(size * MARK_ASPECT)}
      height={size}
      fill="none"
      aria-hidden
      className={`logo-mark shrink-0 ${className}`}
    >
      <path
        className="logo-path"
        d={MARK_PATH}
        stroke="var(--signal-line)"
        strokeWidth={36}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  );
}
