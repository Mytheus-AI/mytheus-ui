# The one-line redesign: rules for every page

Every page of `mytheus-ui` (marketing, auth, app, call, admin) is being redesigned in one visual
language. This file is the contract. If something here conflicts with older docs
(`docs/DESIGN-SYSTEM.md`, `design.md`, `system.md`, `LANDING.md`), this file wins.

## Where the look comes from

- **Marketing reference, approved by the owner:** `/Users/sushan/Projects/Mytheus/mytheus-marketing-oneline.html`
  (open it and read the CSS and markup; it is the visual source of truth for the marketing site:
  hero, notes window, room window, agent relay, how it works, week strip, FAQ, closing panel, footer).
- **App screen references in the same language:** `/Users/sushan/Projects/Mytheus/design-previews/*.html`
  (dashboard, meetings, meeting-detail, transcript, decisions, tasks, search, settings, prejoin, room)
  with their shared CSS in `design-previews/shared/tokens.css` and rules in `design-previews/DESIGN.md`.
  Follow DESIGN.md's rules 4 to 15 (tokens only, the radius rule, one accent, frozen priority
  colours, no dashes, no emoji, no decorative dots, plain copy, every state, responsive, both themes,
  no left accent bars).
- The product's own brand mark is `LogoMark` in `src/components/Logo.tsx` (a tangle resolving into
  a rising line). The signature of the whole system is that line.

## The idea: one coral line

The logo is a single drawn stroke. The design extends it: on the marketing site one unbroken coral
line circles the hero's key phrase, runs down the page margin as you scroll, crosses the page between
sections with a small loop, and ends in the tail of the footer mark. Inside the product the same line
appears only where it means "this carries forward": a thread joining what was said to what was kept,
the memory line across meetings, the active marker under navigation, empty states.

Spend the line sparingly. It is the one bold thing; everything around it is quiet, aligned and
disciplined. Never draw decorative connectors between loosely aligned items (the owner called that
ugly); if two columns relate, align them on a grid and join them with one straight vertical thread
and beads, as the notes window in the reference does.

## Tokens (CSS custom properties in `src/app/globals.css`, Tailwind names in `tailwind.config.ts`)

Never write a raw hex in a component. Use these:

| Role | CSS var | Tailwind |
| --- | --- | --- |
| Page stage | `--bg` #f0eee6 | `bg-bg` |
| Wells, tracks | `--bg-2`, `--bg-3` | `bg-bg-2`, `bg-bg-3` |
| Cards | `--surface` #fff | `bg-surface` |
| Raised on card, table heads, hover fills | `--surface-2` | `bg-surface-2` |
| Text | `--ink`, `--ink-2` (body), `--ink-3` (secondary), `--ink-4` (tertiary, large text and icons only) | `text-ink` ... `text-ink-4` |
| Hairlines | `--line`, `--line-2` | `border-line`, `border-line-2` |
| Accent fill and text | `--signal` | `bg-signal`, `text-signal` |
| The drawn line | `--signal-line` | `stroke-[var(--signal-line)]`, `decoration-signal-line` |
| Text on a soft coral chip | `--signal-ink` on `--signal-soft` | `text-signal-ink bg-signal-soft` |
| Dark controls | `--pill`, `--pill-2` (hover), `--pill-on` (text) | `bg-pill text-pill-on hover:bg-pill-2` |
| Priority (frozen) | red acts now `--priority-high(-soft)`, amber attention `--priority-medium(-soft)`, blue informs `--priority-low(-soft)`, `--ok(-soft)` done | `text-priority-high bg-priority-high-soft` etc, `text-ok bg-ok-soft` |
| Illustration fills | `--tint-peach`, `--tint-ochre`, `--tint-sage`, `--tint-sky` | `bg-tint-peach` ... |
| Stage washes | `--wash`, `--wash-ochre`, `--wash-glow` | `bg-wash`, `bg-wash-ochre` |
| Shadows (warm) | `--sh-1`, `--sh-2`, `--sh-3` | `shadow-warm-1/2/3` |
| Radii | controls 12 `rounded-ctl`, cards 20 `rounded-card`, stages and big panels 28 `rounded-hero`, chips/avatars `rounded-full`. Nothing else. |

Dark mode exists inside the app only (`.mx-app[data-theme="dark"]`, in `src/styles/app-theme.css`),
and every token above flips there. App, call and admin screens must look right in both themes:
use tokens, never `text-white`/`bg-white`/`text-black` (use `text-pill-on` on `bg-pill`).

## Type

- Hanken Grotesk for everything (`font-sans`, the default).
- Newsreader for display titles only: add the `display` class (`.display` sets the serif, weight
  500, tight tracking, balance) or `font-display`. Page titles, section titles, window titles,
  big numbers that are the point of a card. Italic Newsreader (`font-display italic`) is the quiet
  voice for captions and annotations ("what your agent keeps").
- The wordmark: `<Wordmark />` from `src/components/site/Wordmark.tsx`.
- Labels: `.kicker` is now sentence case, 13px, semibold, `--ink-3`. Never tracked uppercase, never
  monospace for labels or meta. `font-mono` is only for literal code.
- Scale: marketing hero 5 to 5.75rem, section titles `clamp(2.1rem,4.6vw,3.5rem)`, app page titles
  28 to 34px `display`, card titles 17 to 22px, body 16 to 17px, secondary 14 to 15px, nothing
  under 12.5px. Body line length under 75 characters.

## Components to use

- `src/components/ui/*`: `Button` / `LinkButton` (variants `primary` dark, `outline`, `ghost`,
  `danger`; `secondary` is an alias of primary), `Badge` (chips, frozen tones), `Card`, `Input`,
  `Select`, `Modal`, `EmptyState` (draws a small line), `Avatar`. These are FROZEN for page agents:
  restyle around them, do not edit them. If one truly needs a change, say so in your report.
- `src/components/site/*` (marketing): `Wrap`, `Section` (`cross` lets the page line cross at its
  top edge), `SectionHead` (serif title left, lead right), `Stage` (peach or ochre wash, optional
  glow), `Win` + `WinBar` (product window), `Chip`, `Live`, `Loop` (the hero loop; once per page),
  `InView` (adds `.in` once visible; `onEnter` for timed demos), `CloseCTA` (closing panel with the
  memory line; end every marketing page with it), `Wordmark`. The nav, page line (`Thread`) and
  footer come from `src/app/(marketing)/layout.tsx`; pages render only their sections.
- `src/components/marketing/PageHero.tsx`: centred hero for secondary marketing pages
  (`title` may contain `<Loop>phrase</Loop>`), with `ctaHref`, `secondaryHref/Label`, `children` for
  a visual. `PageShell` is now a pass-through; drop it from pages you touch.
- Drawn strokes: give an SVG path `className="line-stroke line-draw" pathLength={1}` and put it
  inside an `InView` (or any element that gets `.in`); `--du`/`--dl` style vars set duration/delay.
- Icons: `@phosphor-icons/react` (regular weight by default). No hand-drawn icon sets.

## Layout

- Marketing: content width 1120px (`Wrap`), section rhythm `py-[clamp(64px,9vw,120px)]`, sections
  open with `SectionHead`. Product visuals sit in a `Win` on a `Stage`. Alternate peach and ochre
  stages; do not put every section on a stage. Let 3 to 6 sections per page `cross`.
- App: the shell (sidebar + topbar) stays; pages are a title row (serif title, one line of context,
  the page's one primary action on the right) then content on the `--bg` stage in white cards.
  Tables and lists are aligned, scannable, with `--surface-2` heads and hairline rows.
- Responsive from 360px to 1600px. Declare the mobile collapse for every multi-column layout.
  No horizontal page scroll. Touch targets at least 40px.

## Motion

- One orchestrated moment per view (the hero loop drawing, a demo playing when it scrolls in).
  Drawn lines are the house motion. No fade-and-rise on every section, no hover lift on every card,
  no parallax, no marquee, no floating blobs, no gradient text, no grain.
- Motion that answers an action (confirming, expanding, switching tabs) is welcome: 150 to 250ms,
  `var(--ease-out)`. Honour `prefers-reduced-motion` (Tailwind `motion-safe:` / `motion-reduce:`,
  or the media query) by making everything appear in its final state.
- Retire the old "Playex" utilities wherever you touch: `mesh-field`, `mesh-anim`, `grain`,
  `sunburst`, `orb-glow`, `text-gradient-signal`, `sheen`, `floaty`, `drift`, `glow-pulse`,
  `marquee-track`, `card-interactive`, `lift`, `FlowField`, `WordReveal`, Lenis smooth scroll, the
  page `Loader`, the scroll progress bar.

## Copy

- Plain, specific, sentence case, active voice. Say what things do for the user.
- No em dashes or en dashes in visible copy (use a comma, colon, full stop or hyphen).
- No emoji, no tracked-caps eyebrows, no "A · B · C" meta strings, no arrows appended to buttons,
  no fake version labels, no decorative status dots (a red dot only for something actually live).
- Buttons say exactly what happens ("Confirm decision", "Start meeting"); the resulting toast uses
  the same verb ("Decision confirmed").
- Organic sample numbers (47.2%, 6 of 9). Sample people: Maya, Raj, Priya, Sarah, Diego,
  Sushan Shetty, Yash Maurya, Samar Rihan, Tomas Ferreira, Aiko Tanaka, Daniel Okafor.
- Keep every factual product claim already in the code (features.ts, pricing, security) unless it
  contradicts the reference. Do not invent integrations, certifications, prices or customers.

## Engineering rules (from CLAUDE.md, unchanged)

- Presentation only. Keep data fetching, Server Actions, API calls, props contracts, auth, realtime
  and state logic exactly as they are. Never touch `src/lib/api/**`, `src/lib/realtime/**`,
  `src/middleware.ts`, server actions under `src/app/actions/**`.
- Server components by default; `"use client"` only for interaction, leaf-ward.
- Accessibility is a gate: semantic headings in order, labels on controls, visible focus, keyboard
  paths, contrast AA in both themes, `aria-hidden` on decorative SVG.
- TypeScript strict, no `any`.
- Verify with `npx tsc --noEmit -p .` and `npx next lint --file <each file you changed>` from the
  repo root. A dev server already runs on http://localhost:3400 (do not start another, do not run
  `next build`): `curl -s -o /dev/null -w "%{http_code}" http://localhost:3400/<route>` must be 200
  for public routes (app routes redirect to sign-in with 307, which is expected).
- Do not commit, do not touch files outside your assignment, do not delete shared files. If you
  stop using an old component that other areas may still import, leave it; the integrator prunes.
