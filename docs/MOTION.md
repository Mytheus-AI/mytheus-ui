# Motion

The motion language of the landing site and how to use the shared primitives
in `../src/components/landing/motion.tsx`. The app screens use a much
calmer subset (150ms fades, no scroll choreography) - this document is mostly
about the marketing surface.

## The language

- Calm-crazy: expressive, cinematic moves are welcome, but at most one
  attention motion plays at a time. If two things animate at once, one of
  them is wrong.
- Scroll is the camera. Big sequences (hero filmstrip, the pinned "How it
  works" scene) are driven by scroll position, springed so wheel steps read
  as one continuous camera move.
- Everything degrades. Every primitive checks `prefers-reduced-motion` and
  renders its final frame instantly (or falls back to opacity only). A
  reduced-motion user sees a complete, static page - never a broken one.
- Pointer effects (Magnetic, Tilt) disable themselves on coarse pointers.
- Never animate a layout-affecting property without reserving the space
  first (see `min-h` on the Steps stage). Off-screen loops pause via
  `useInView`. For panels that fill with streamed content, pre-lay every
  slot as a ghost placeholder and swap ghost ⇄ content with
  `AnimatePresence` so the container never changes height —
  `LiveCapture.tsx` is the reference (its panel is pixel-constant through
  a full loop).

## Smooth scroll (Lenis)

`../src/components/landing/SmoothScroll.tsx` mounts Lenis (lerp 0.11) on the
landing page only, and exports the live `lenis` instance so programmatic
scrolls ride the same easing - `PinnedScene`'s `goTo` uses it. Lenis is
skipped entirely under reduced motion. If you add an in-page anchor, plain
`href="#id"` works; Lenis intercepts it (`anchors: true`).

## Primitive catalog

All from `../src/components/landing/motion.tsx`. "RM" is the
reduced-motion behavior.

### Entrances

| Primitive | Props | Use when | RM |
| --- | --- | --- | --- |
| `Reveal` | `delay`, `y` | one block fades and lifts in on view | instant |
| `Stagger` + `StaggerItem` | none | lists and grids revealing in sequence | instant |
| `WordReveal` | `text`, `accent`, `as`, `delay`, `accentClass` | display headings; words lift out of a mask; `accent` is a trailing colored phrase | plain text |
| `MaskReveal` | `delay`, `y` | a block rising out of the page (cards, giant footer wordmark) | plain block |

### Scroll-linked

| Primitive | Props | Use when | RM |
| --- | --- | --- | --- |
| `ScrubReveal` | none | big statements that develop as you scroll through them | static |
| `Parallax` | `distance` | layered background drift | static |
| `ScrollScale` | `from`, `to`, `exitTo` | the camera push: a panel or mockup scaling in as it enters (and optionally easing out as it leaves) | static |
| `ScrollProgressBar` | none | the 3px top-of-page progress bar | keeps working (it is information) |
| `Sticky` | `top` | a header that hangs while content scrolls past, with intro/outro fade | sticky without fade |

### Pinned scenes

| Primitive | Props | Use when | RM |
| --- | --- | --- | --- |
| `PinnedScene` | `count`, render prop `{ index, progress, goTo }` | a section that pins for `count` viewport-heights and swaps stages with scroll; `progress` is a MotionValue (no per-frame re-render), `goTo(i)` glides to a stage through Lenis | renders children once, unpinned - callers should branch to a static layout |
| `StageSwitch` | `index` | the standard in-place content swap (exit up + shrink + blur, enter from below); keyed remount restarts the incoming stage's inner animations | plain swap |

Two reference implementations, two flavors:

- `Steps.tsx` — the **staged** flavor: `PinnedScene` outside, `StageSwitch`
  for discrete stage swaps, a spine driven by the `progress` MotionValue,
  and a fully separate static stack for mobile and reduced motion.
- `Statement.tsx` (THE RELAY) — the **continuous scroll-scrubbed** flavor:
  no stage swaps; every element maps windows of the single `progress`
  MotionValue through `useTransform` (packet position on bezier arcs, the
  `LoadTrend` chart's draw, overlay fades), so scrolling backwards reverses
  the story frame-perfectly.

Rules every pinned scene must follow (learned the hard way):

- **The section heading lives INSIDE the pin.** Eyebrow + h2 + sub must fit
  in the pinned viewport together with the stage — never leave the heading
  above the pin where it scrolls away. Pattern: the `SceneHeading` block in
  `Statement.tsx` (flex column, heading on top, stage `min-h-0 flex-1`,
  heading scales down slightly once the story starts).
- **Clear the fixed header.** The pinned viewport sits under the fixed
  `SiteHeader`; pad the scene (`pt-[92px]` in `Statement.tsx`) or docked
  content will collide with it.
- **Always spring `progress` before deriving anything from it — never feed
  the raw `PinnedScene` progress straight into `useTransform`.** Discovered
  the hard way building (then rebuilding) a section between Hero and
  FeatureCards: a component that re-renders on `index` changes (any
  `StageSwitch` consumer does) and derives `useTransform(progress, ...)`
  directly off the raw value can visibly desync from it — confirmed via a
  live on-screen numeric readout of the raw value next to the actual
  DOM-computed opacity, which disagreed by a wide, consistent margin at
  exactly the scroll position where two overlapping fades should have
  handed off cleanly. `Statement.tsx`'s `RelayScene` already does this
  right (`const cam = useSpring(progress, {...})`, every transform derives
  from `cam`) — that's the pattern to copy, not a stylistic choice.
- **A `height: count*100vh` pinned container's scroll-driven progress spans
  only `(count-1)` viewport-heights of real scroll, not `count`** — the
  sticky child un-sticks and rides out normally for the final viewport
  before the wrapper's true DOM bottom. Anything OUTSIDE the scene that
  needs to know "has this pinned section visually finished" (e.g. a shared
  header's light/dark mode) must account for that extra viewport, or it
  will act as if the section is still active a full screen-height after it
  visually isn't. `SiteHeader.tsx`'s `overDark` threshold logic has the
  worked formula and the reasoning in its own comment.
- **Consider skipping `PinnedScene` entirely for shorter sections.** It's
  the right tool for a true cinematic set-piece (Statement, Steps), but it
  is scroll-jacking with real geometry to get right, as above. A short
  sequence (a handful of scroll-revealed panels, say) is often better served
  by a NORMAL, natural-height section: independent `whileInView` reveals per
  item (what `Reveal`/`MaskReveal` already do) plus, if something needs to
  visually connect across the whole section, a single `useScroll({ target,
  offset: ["start center", "end center"] })` progress (the same
  non-pinned pattern `Parallax`/`ScrollScale` already use) driving ONE
  derived value — never a cascade of interdependent transforms. See
  `NetworkFlow.tsx` for a worked example: it deliberately has zero
  `PinnedScene` usage.

### Continuous and pointer

| Primitive | Props | Use when | RM |
| --- | --- | --- | --- |
| `Float` | `amount`, `duration` | a gentle bob for "live" elements | off |
| `Magnetic` | `strength` | CTAs drifting toward the cursor | off (also off on touch) |
| `Tilt` | `max` | pointer-driven 3D tilt on cards/mockups | off (also off on touch) |
| `Marquee` | `reverse` | infinite ribbons; pauses on hover | CSS-disabled |
| `CountUp` | `to`, `suffix`, `prefix`, `duration` | honest figures counting up in view | jumps to final |

### Misc

| Primitive | Notes |
| --- | --- |
| `CTAButton` | legacy magnetic CTA (marketing pages use `PillCTA` from `ui.tsx`) |
| `MotionDiv` | bare `motion.div` re-export for one-offs |

## CSS-side motion

`globals.css` carries the non-React motion: `.mesh-anim` (breathing gradient
mesh), `.sheen` (light sweep), `.card-interactive` (hover lift),
`.text-gradient-signal` (panning clay gradient), the logo animations
(`logoSpin` on `.group:hover .logo-mark`, `logoBreathe` for the loader), and
the scroll-progress keyframes. All are disabled inside the global
`prefers-reduced-motion` block at the bottom of the file.

## App-screen motion

Authenticated screens do not import the landing primitives. They use CSS
transitions (150-300ms color/transform) and the priority rule: the red
conflict banner is the only element allowed to demand attention, and even it
pulses at most once.
