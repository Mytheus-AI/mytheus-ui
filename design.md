# Mytheus — Design Principles (design.md)

> The single source of truth for *how Mytheus looks and moves*. It explains the
> intent behind every visual decision so anyone — human or agent — can extend the
> product without it drifting. Pair it with `PROGRESS.md` (what's built) and
> `LANDING.md` (start-here). The **code** is the implementation; this is the *why*.
>
> Tokens live in `src/app/globals.css` + `tailwind.config.ts`. Motion primitives
> live in `src/components/landing/motion.tsx`. Read those when in doubt — and if a
> value here ever disagrees with the code, the code wins; fix this doc.

---

## 0. The one rule

**Components read tokens, never raw values.** Every colour, radius, easing, and
type style is a named token surfaced as a CSS custom property and a Tailwind class.
A component that hard-codes `#c25c36` or `0.82` line-height is a bug, even if it
looks right today — it won't survive a theme change. The only sanctioned raw hex in
the whole UI are the **three macOS window-chrome dots** in mockups (`#ec6a5e` /
`#f4bf4f` / `#61c454`) and subtle multi-stop shadow `rgba()`s. Everything else is a token.

---

## 1. North star

Mytheus is an AI meeting platform where **every participant gets a personal agent**
that listens, captures decisions/actions, and carries context **across** meetings.
The design has to make an invisible, slightly magical idea (agents quietly doing
work and remembering) feel **calm, trustworthy, and alive** — never busy, never
gimmicky, never "AI-product-template."

Three adjectives drive every call:

1. **Warm** — this is software you trust with your conversations. Warm cream, warm
   inks, one warm signal. Never cold/grey/neon.
2. **Calm** — confidence through restraint. Generous space, one accent colour, one
   attention-grabbing motion at a time. The product looks like it's already working,
   not shouting for attention.
3. **Alive** — but quietly. Things breathe, drift, and respond to you. Motion is a
   *sign of life*, not decoration. If an element moves, it should mean something.

> Litmus test for any new element: *Does it feel warm, calm, and quietly alive — or
> does it feel like a generic SaaS section?* If the latter, it's wrong.

---

## 2. Brand & positioning (the design must never contradict these)

- **Name:** **Mytheus** (never "NEXUS" — that's an internal codename only).
- **Tagline / signature line:** *"Every meeting, on repeat."*
- **Mytheus is its OWN meeting platform.** It does **not** integrate with
  Zoom / Meet / Teams / Slack / Jira / calendars. Never draw integration logos,
  "works with…" rows, or bot-joins-your-call framing.
- **Differentiator to dramatize:** agents **collaborate across meetings** — *a
  decision on Monday is context on Friday.* The cross-meeting "memory" idea is the
  thing the visuals should keep returning to (hence the `ConnectedGraph`).
- **Trust posture is a design constraint:** the agent **never writes silently** —
  the user confirms. UI that shows captured items should read as *proposed/forming*,
  not silently saved. Don't imply certifications we don't hold ("working toward SOC 2").

---

## 3. Art direction

**"Claude.ai light, made physical."** A warm near-white canvas, one clay/coral
signal used surgically, all-grotesk tight display type, soft pills and big rounded
cards with warm shadows, and a faint paper grain. Visuals are **bespoke and living**
(canvas/SVG product demos), not stock illustration or glossy 3D.

What this look explicitly is **not** (all are prior, reverted directions — do not
reintroduce without a deliberate decision):
- ❌ Lilac/purple signal · ❌ lime/green (`#c8e44d`, `#dcefae`) · ❌ Fraunces serif
  display · ❌ glossy CSS `<Orb>` blobs · ❌ cold monochrome greys · ❌ stock hero images.

The signature is the **`<ConnectedGraph>`** — a small living network of nodes/edges
on a canvas that brightens near the cursor (a stand-in for the `nexus_knowledge`
graph). It replaced the old `Orb` and appears as a faint backdrop across the site.

---

## 4. Colour

Defined in `:root` in `globals.css`, surfaced as Tailwind colours in
`tailwind.config.ts`. **One canvas family, one ink family, one signal.**

### Surfaces (warm paper)
| Token | Value | Tailwind | Use |
| --- | --- | --- | --- |
| `--bg` | `#f6f2e9` | `bg-bg` | page canvas |
| `--bg-2` | `#eee7d9` | `bg-bg-2` | subtle fills, chips, inset rows |
| `--bg-3` | `#e4dcc9` | `bg-bg-3` | section bands / card fills |
| `--surface` | `#fffdf8` | `bg-surface` / `bg-white` | raised cards, app-window mockups |
| `--on-signal` | `#ffffff` | (in CSS) | type sitting on a signal fill |

### The mesh ground
The hero and the big stage panels are painted by `.mesh-field`, which reads these
and nothing else. They exist because the mesh used to hard-code its stops — which
meant a palette change repainted the type and left the canvas exactly as it was.
**No component may hard-code a ground colour.**

| Token | Value | Use |
| --- | --- | --- |
| `--mesh-1` | `#ece5d4` | warm pool, lower right |
| `--mesh-2` | `#e6ddc9` | deeper pool, lower left |
| `--mesh-signal` | `rgba(194,92,54,.13)` | the signal bloom, centre |
| `--mesh-top` | `#f6f2e9` | linear wash, top |
| `--mesh-bottom` | `#ece6d6` | linear wash, bottom |

### Inks (warm near-blacks — never pure black on text)
| Token | Value | Tailwind | Use |
| --- | --- | --- | --- |
| `--ink` | `#14120d` | `text-ink` | strongest — wordmark, key numerals |
| `--ink-display` | `#1c1913` | `text-ink-display` | big display headings |
| `--ink-2` | `#383328` | `text-ink-2` | strong body, nav |
| `--ink-3` | `#6a6355` | `text-ink-3` | muted body, captions, eyebrows |

### Hairlines
| Token | Value | Tailwind | Use |
| --- | --- | --- | --- |
| `--line` | `#ded5c0` | `border-line` | default warm hairline |
| `--line-2` | `#c9bfa6` | `border-line-2` / `bg-line-2` | stronger divider, dot separators |

### The ONE signal — deep clay
| Token | Value | Tailwind | Use |
| --- | --- | --- | --- |
| `--signal` | `#c25c36` | `bg-signal` / `text-signal` | the accent + primary CTA fill |
| `--signal-deep` | `#9f4526` | `text-signal-deep` | hover, accent text on light, gradient anchor |
| `--signal-bright` | `#e08f69` | `text-signal-bright` | gradient highlight, glints |
| `--signal-soft` | `#f1dfd2` | `bg-signal-soft` | tinted pills/tags, soft fills |
| `--signal-glow` | `rgba(194,92,54,.5)` | (in shadows) | glow halos |
| `--pill` | `#1c1913` | `bg-pill` | warm near-black dark chips / icon buttons |

### CTA shadows
Every primary CTA reads one of these rather than re-typing the clay rgba.

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-cta` | `0 20px 44px -18px rgba(159,69,38,.85)` | full-size CTA pills |
| `--shadow-cta-sm` | `0 16px 36px -18px rgba(159,69,38,.8)` | the compact header pill |

### Colour rules
1. **Single-signal discipline.** Clay is the *only* hue. It marks the one thing that
   matters in a view (the CTA, the live/active state, the accent word). If two things
   are clay, neither reads as special. Everything else is cream + ink + hairline.
2. **Primary CTA is always solid clay with white text.** Secondary actions are the
   soft bordered `pill-surface`. Dark `--pill` is for small icon buttons/tags only.
3. **No new colours.** Status/priority hues (red/yellow/blue) belong to the *app*
   tier per `CLAUDE.md`, not the marketing surface; don't invent greens, blues, etc.
4. **Never lime/green.** It's the single most common off-brand regression (leftover
   Granola styling). If you see `#c8e44d`/`#dcefae`, it's a bug.
5. **Re-theming is a token swap.** Returning to a lilac brand = changing the
   `--signal*` values only. So never bypass the token.

---

## 5. Typography

Three local faces (loaded in `src/app/layout.tsx`); the look is **all-grotesk**.

| Face | CSS var | Tailwind | Role |
| --- | --- | --- | --- |
| **Geist** (variable 100–900) | `--font-sans` | `font-sans` / `font-display` | Everything: display headings, nav, body. One engineered voice. |
| **Geist Mono** | `--font-mono` | `font-mono` | Micro-labels/eyebrows, timers, counters, code-ish chrome. |
| **Refinity** (single weight) | `--font-wordmark` | `.wordmark` | The "Mytheus" wordmark **only**. Never for numerals/body. |

> Fraunces serif was used and then **removed** — do not reintroduce serif display.

### Display type utilities (`globals.css`)
- **`.display`** — the signature heading: `font-weight: 550`, `letter-spacing:
  -0.035em`, `line-height: 0.92`, colour `--ink-display`. Huge and tight.
- **`.display-tight`** — even tighter for the biggest statements: `line-height:
  0.82`, `letter-spacing: -0.045em`. (Pair with `.display`.)
- **`.kicker`** — the eyebrow: Geist Mono, `0.7rem`, `letter-spacing: 0.24em`,
  uppercase, `--ink-3`. (Component wrapper: `<Eyebrow>`.)
- **`.wordmark`** — Refinity, for the logotype.
- **`.text-balance` / `.text-pretty`** — wrapping helpers for headings/paragraphs.

### Scale & rhythm
- Headings are **fluid** via `clamp(min, vw, max)` so one definition holds from 320px
  to ultrawide — e.g. hero `clamp(2.6rem,6vw,5.2rem)`, final statement
  `clamp(2.6rem,8vw,6.5rem)`. Always set a sane `min` so it fits at 320px.
- Constrain measure with `max-w-[NNch]` (e.g. `max-w-[16ch]` for punchy headlines,
  `~42–54ch` for body) rather than pixel widths.
- Body is ~`15–18px`, `leading-relaxed`, `--ink-3` for supporting copy / `--ink-2`
  for primary.

### The descender rule (learned the hard way)
At `display-tight` (line-height `0.82`), **descenders ("y", "g", "p") clip** inside
tight boxes — especially the masked `WordReveal`. `WordReveal` reserves `0.22em`
of descender room (padding-bottom + equal negative margin). If you build any
clipped/masked large-type effect, **reserve descender space the same way.**

---

## 6. Space, radius, layout

### Radius tokens
| Token | Value | Tailwind | Use |
| --- | --- | --- | --- |
| `--radius-pill` | `40px` | `rounded-pill` | buttons, nav, tags |
| `--radius-card` | `24px` | `rounded-card` | cards, bands, big stages |
| `--radius-md` | `16px` | (`rounded-2xl`≈) | inset panels |
| `--radius-sm` | `12px` | `rounded-xl` | small chips |

Big rounded stages often use `rounded-[28px]`. **Soft, generous corners** — never
sharp rectangles for primary surfaces.

### Layout system
- **Containers:** centre with `mx-auto` + `max-w-[1340px]` (full-bleed sections) or
  `max-w-[80rem]` (hero). Horizontal padding `px-6 sm:px-8` (or `sm:px-10` on the hero).
- **Section rhythm:** vertical breathing room is large and consistent — `py-20 sm:py-24`
  for standard sections, `py-24 sm:py-32` for feature sections, hero/closing stages
  larger. Whitespace is a feature; when unsure, add space.
- **Grids:** asymmetric two-column heroes (`lg:grid-cols-[0.95fr_1.05fr]`), bento/
  card grids (`md:grid-cols-2 lg:grid-cols-3`). Mobile = single column, visuals
  often `hidden lg:block`.
- **Edge-to-edge stages** (hero, final CTA, capture demo) are rounded cards inset
  from the page edge by a few px (`px-3 sm:px-5`) so the cream shows around them.

---

## 7. Surfaces, borders, elevation

- **Cards** = `bg-white` (or `bg-bg-3` for quiet bands) + `border border-line` +
  `rounded-card`. The default object.
- **Hairlines over heavy borders.** Separation is a 1px warm line, not a box shadow
  or a dark rule. `.hairline`, `border-line`, `bg-line-2` dividers.
- **Shadows are warm, soft, and directional** — long, low-opacity, *warm-brown/clay*
  tinted, never neutral grey. App-window mockups use a layered shadow with an inner
  top highlight for a glassy lift, e.g.
  `shadow-[0_50px_100px_-40px_rgba(40,30,20,0.55),inset_0_1px_0_rgba(255,255,255,0.85)]`.
- **`.pill-surface`** — the soft secondary-button/input surface: a subtle white→off-white
  vertical gradient + `--line` border.
- **`.card-interactive`** — the standard hover affordance for bordered cards: a small
  lift + a warm clay shadow on hover (reduced-motion → no transform).
- **Glassy mockups:** translucent white (`bg-white/95`) + `backdrop-blur-sm` + the
  warm layered shadow = the "real product window" feel used in hero/demos.

---

## 8. Iconography

- **Inline SVG**, drawn with `stroke="currentColor"` (1.3–1.6 stroke width, round
  caps/joins) so icons inherit ink/clay colour from context. A few filled glyphs
  (sparkle, play) use `fill="currentColor"`.
- Small, geometric, calm — matching Geist's engineered feel. Decorative icons get
  `aria-hidden`.
- Reusable glyphs live in `ui.tsx` (`ArrowRight`, `Plus`, `Play`); section-specific
  icons are defined locally in the component.

---

## 9. Motion & animation

Motion is core to Mytheus (it's how "alive" reads) — but it is **disciplined**.

### Principles
1. **One primary attention beat per view.** Many tiny ambient signs of life are fine
   (a breathing dot, a slow drift, a faint mesh) but only **one** thing should
   actively pull the eye. Competing animations = noise.
2. **Calm easing, no bounce.** Use the project easings:
   `--ease-out cubic-bezier(0.2,0.7,0.2,1)` and
   `--ease-soft cubic-bezier(0.16,1,0.3,1)`. Entrances ≈ 0.4–0.85s fade+rise. No
   spring-overshoot on UI (springs are reserved for magnetic/cursor toys).
3. **Scroll motion is scrubbed and reversible.** Scroll-driven effects (the hero
   choreography, parallax, scrubbed reveals) map to scroll position so they run
   *both ways* as the user scrolls up/down — never one-shot scroll-jacking.
4. **Reduced motion is a hard gate, not a nicety** (see §11).
5. **Loops are ambient and slow** (mesh drift ~18–24s, float ~8–12s, gradient pan 8s).
   Fast looping = anxious; keep it breathing-pace.
6. **Animate transform/opacity only** (GPU-friendly). Reserve min-heights so streaming
   text/cards append without layout shift.

### Motion primitives — `src/components/landing/motion.tsx`
All are `useReducedMotion`-guarded. Use these instead of hand-rolling framer-motion.

| Primitive | What it does |
| --- | --- |
| `Reveal` | fade+rise on scroll-into-view (the default entrance; takes `delay`). |
| `Stagger` / `StaggerItem` | a container that staggers its children's entrances. |
| `WordReveal` | the editorial headline reveal — each word lifts from a masked line, with an optional `accent` portion (`accentClass`, usually `text-gradient-signal`). Reserves descender space. |
| `MaskReveal` | a single block rising from behind a mask. |
| `ScrubReveal` | fade/rise/scale scrubbed to scroll position. |
| `Parallax` | scroll-linked translate (springed). |
| `Float` | gentle infinite bob (`amount`, `duration`). |
| `Magnetic` | element leans toward the cursor (wraps CTAs). |
| `Marquee` / `Tilt` / `CountUp` | ticker, hover-tilt, number roll-up. |
| `ScrollProgressBar` | the thin clay top scroll-progress bar. |

### CSS animation utilities (`globals.css`) & keyframes
Utilities: `.mesh-anim` (breathing gradient mesh, pair with `.mesh-field`),
`.text-gradient-signal` (animated clay gradient clipped to accent words),
`.sheen` (a light sweep across badges/bars), `.glow-pulse` (pulsing dot/halo),
`.floaty` / `.drift` / `.lift` / `.flow-dot` / `.arrow-nudge` / `.marquee-track` /
`.reveal`. Backing keyframes: `fadeUp`, `floaty`, `glowPulse`, `drift`, `marquee`,
`flowDot`, `arrowNudge`, `meshDrift`, `gradientPan`, `shimmer`.

---

## 10. Signature elements

- **`<ConnectedGraph>`** (`ConnectedGraph.tsx`) — the living node/edge canvas
  network; the brand's visual motif (the cross-meeting knowledge graph). Props:
  `className`, `signal` (clay vs neutral palette), `glow`, `float`, `nodeCount`,
  `interactive`. It **samples the CSS `--signal*` tokens at runtime** so it always
  matches the theme. Pointer-reactive (halo, node brightening, press-drag grab,
  click ripples). Reduced-motion → one static frame. *Used as a faint backdrop
  (`opacity-25/40`, `pointer-events-none`) across hero / final CTA / footer / 404 /
  Coming-soon / page heroes.* **No cursor "trail"** (removed by design — keep it out).
- **`.mesh-field` + `.mesh-anim` + `.grain`** — the warm gradient-mesh stage with a
  slow breathe and paper grain; the backdrop for hero, final CTA, page heroes.
- **Scripted product demos, not screenshots.** Sections *show the loop*: the hero
  live-capture card (agent listening, ticking timer, shorthand lines being tagged),
  the raw→enhanced `NotesWidget`, the in-the-room `LiveCapture` transcript→captures,
  the `MemoryTimeline` swimlanes. These are bespoke, token-styled, reduced-motion-safe.

---

## 11. Accessibility (a gate, not a courtesy)

- **`prefers-reduced-motion`** is honoured everywhere. CSS: a
  `@media (prefers-reduced-motion: reduce)` block in `globals.css` neutralises
  `.glow-pulse`, `.mesh-anim`, `.text-gradient-signal`, `.sheen`, `.card-interactive`,
  `.reveal`, floats/drifts. JS: every motion primitive and component branches on
  `useReducedMotion()` and renders a **settled final state** — no timers, loops, or
  rAF in the reduced path. New animated work **must** add this fast-path.
- **Decorative is `aria-hidden`.** The graph, mesh, orbs, waveforms, and chrome dots
  are decoration; real content stays in semantic tags.
- **Contrast:** warm inks on cream are chosen for legibility; keep body on `--ink-2`/
  `--ink-3`, never lighter, on `--bg`. Don't put `--ink-3` on `--signal`.
- **Targets & focus:** interactive elements ≥ ~40px touch target; keep visible focus
  states; real `<button>`/`<a>` (or `<Link>`), not div-clicks.
- **Headings** use real `<h1>/<h2>`; when a heading is rendered as animated per-letter
  spans, set `aria-label` on the heading and `aria-hidden` on the pieces.

---

## 12. Component architecture (compose, don't reinvent)

Layered, smallest-first:

1. **Tokens** — `globals.css` (`:root` vars + utility classes) and `tailwind.config.ts`.
   The visual vocabulary. Everything else reads from here.
2. **Atoms — `src/components/landing/ui.tsx`** (server-safe): `PillCTA` (the signature
   clay split-pill: text pill + detached circular arrow), `OutlinePill` (secondary),
   `IconCircle`, `IconChip`, `Eyebrow`, glyphs. Compose these; don't restyle ad-hoc.
3. **Motion primitives — `motion.tsx`** (§9).
4. **Signature visuals — `ConnectedGraph.tsx`** and the mesh utilities.
5. **Page scaffolding — `src/components/marketing/`**: `PageShell` (sticky wordmark
   header + shared `SiteFooter`), `PageHero` (eyebrow + grotesk title + blurb +
   optional `PillCTA` over mesh + faint graph), `Prose` (long-form legal/info
   typography). Secondary pages = `PageShell` → `PageHero` → token-styled sections.
6. **Sections — `src/components/landing/*`**: each is a self-contained client island
   owning its own motion/canvas (Hero, LiveCapture, Statement, Steps, MemoryTimeline,
   FAQ, FinalCTA, SiteHeader, SiteFooter, …).

**Client-island discipline:** add `"use client"` only where there's interactivity,
a browser API, or a live subscription; keep islands leaf-ward so server components
stay the default and the JS budget stays small.

---

## 13. Voice & copy (design includes words)

- **Confident, concrete, calm.** Short declaratives. Sentence case. The product is
  capable and quiet — copy matches.
- Lead with the **outcome** ("Your shorthand, returned as minutes."), not features.
- Keep the **claims discipline** (§2): own platform, no integrations, confirm-before-
  write, no unearned certifications.
- Punctuation: real typographic quotes/dashes in rendered copy (`&rsquo;`, `&mdash;`,
  `&ndash;`) — JSX text with raw `'` fails lint (`react/no-unescaped-entities`).

---

## 14. Do / Don't (quick conscience check)

**Do**
- Read tokens; compose atoms; reuse motion primitives.
- Keep one signal, one attention beat, generous space.
- Guard every animation with reduced-motion + a settled fallback.
- Make visuals *mean* something (show the product loop).
- Fluid `clamp()` type with a 320px-safe minimum.

**Don't**
- Hard-code hex/radii/easing, or introduce a second accent colour.
- Use lime/green, serif display, the old `Orb`, or cold greys.
- Add integration logos or imply third-party meeting integrations.
- Ship a loop with no reduced-motion path, or motion that competes for attention.
- Clip descenders in tight/masked large type (reserve `~0.22em`).

---

## 15. Adding something new — checklist

1. **Colour** only from `signal*` / `ink*` / `bg*` / `line*` tokens (Tailwind classes).
2. **Type** via `.display`/`.display-tight`/`.kicker` + `clamp()` + `max-w-[ch]`.
3. **Surface** = `bg-white`/`bg-bg-3` + `border-line` + `rounded-card` (+ `card-interactive` if hoverable).
4. **Motion** via a `motion.tsx` primitive or a guarded framer/CSS animation; one primary beat; `useReducedMotion` fallback.
5. **Decoration** `aria-hidden`; content semantic; targets ≥40px; focus visible.
6. **Responsive:** single-column mobile, visuals `hidden lg:block` if they don't fit; test 320px.
7. **Verify:** `npm run lint` + `tsc --noEmit` + `next build` clean before calling it done.

---

*Tokens: `src/app/globals.css`, `tailwind.config.ts` · Motion: `src/components/landing/motion.tsx` · Atoms: `src/components/landing/ui.tsx` · Living graph: `src/components/landing/ConnectedGraph.tsx` · Page shell: `src/components/marketing/`. When this doc and the code disagree, fix the doc.*
