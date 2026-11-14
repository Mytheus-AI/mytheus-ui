---
name: Mytheus
description: Every meeting, on repeat.
colors:
  signal: "#c15f3c"
  signal-deep: "#a8472a"
  signal-line: "#d97757"
  signal-ink: "#a8472a"
  signal-bright: "#e0805f"
  signal-soft: "#f7e9e1"
  bg: "#f0eee6"
  bg-2: "#e8e5da"
  bg-3: "#ded9cb"
  surface: "#ffffff"
  surface-2: "#faf9f4"
  ink: "#1f1e1d"
  ink-2: "#3a352f"
  ink-3: "#6b645b"
  ink-4: "#8a8378"
  line: "#e6e2d6"
  line-2: "#d6d1c2"
  pill: "#262625"
  pill-2: "#33312f"
  pill-on: "#faf9f4"
  priority-high: "#b3402e"
  priority-high-soft: "#f6e0da"
  priority-medium: "#875d14"
  priority-medium-soft: "#f6ecd9"
  priority-low: "#4f6f84"
  priority-low-soft: "#e6eef2"
  ok: "#3f6a37"
  ok-soft: "#e4efe1"
  tint-peach: "#efcbb5"
  tint-ochre: "#ecd9ae"
  tint-sage: "#cfd8bf"
  tint-sky: "#c7d8e1"
  dark-bg: "#1a1816"
  dark-bg-2: "#302d2a"
  dark-surface: "#232120"
  dark-surface-2: "#2a2725"
  dark-ink: "#f3f0e8"
  dark-ink-2: "#d9d4c8"
  dark-ink-3: "#a9a296"
  dark-line: "#38342f"
  dark-signal: "#e0805f"
  dark-signal-soft: "#3a2a23"
  dark-pill: "#f3f0e8"
  dark-pill-on: "#1a1816"
typography:
  display:
    fontFamily: "Syne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 4.6vw, 3.5rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.022em"
  headline:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, 3vw, 34px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0em"
rounded:
  ctl: "12px"
  md: "16px"
  card: "20px"
  hero: "28px"
  full: "9999px"
spacing:
  card-x: "22px"
  card-x-mobile: "16px"
  card-y: "18px"
  stack: "20px"
  stack-xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.pill}"
    textColor: "{colors.pill-on}"
    rounded: "{rounded.ctl}"
    height: "44px"
    padding: "0 18px"
  button-primary-hover:
    backgroundColor: "{colors.pill-2}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    height: "44px"
    padding: "0 18px"
  button-outline-hover:
    backgroundColor: "{colors.surface-2}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.ctl}"
    height: "44px"
    padding: "0 18px"
  button-ghost-hover:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.priority-high}"
    textColor: "{colors.surface}"
    rounded: "{rounded.ctl}"
    height: "44px"
    padding: "0 18px"
  chip-neutral:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  chip-accent:
    backgroundColor: "{colors.signal-soft}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  chip-high:
    backgroundColor: "{colors.priority-high-soft}"
    textColor: "{colors.priority-high}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.card}"
    padding: "18px 22px"
  card-well:
    backgroundColor: "{colors.bg-2}"
    rounded: "{rounded.card}"
    padding: "18px 22px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    height: "44px"
    padding: "0 14px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.ctl}"
    height: "40px"
    padding: "0 14px"
  tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
---

# Design System: Mytheus

This file describes the system as the code implements it. Tokens live in `src/app/globals.css` (light) and `src/styles/app-theme.css` (dark), with Tailwind names in `tailwind.config.ts`. The kit is `src/components/ui/`. The working rules for page authors are in `docs/DESIGN-ONELINE.md`. Where this file and the code disagree, the code wins and this file gets fixed.

## Overview

**Creative North Star: "The One Line"**

The Mytheus mark is a single drawn stroke: a tangle that resolves into a rising line. The whole system extends that stroke. One coral line appears where something carries forward, joining what was said to what was kept, threading recent meetings on Home, marking the hero phrase on the marketing site, forming the drawing in an empty state. Everything around the line is quiet on purpose: a warm cream stage, white cards, dark controls, hairlines, and type that is aligned and plain.

The product is used by someone in or between meetings who needs to see what was decided and what they owe. So the interface is dense enough to scan, calm enough to read during a call, and consistent enough that a card, a chip and a button mean the same thing on every screen. Components are quiet and exact: feedback is a colour change, never a lift or a bounce.

The earlier look is retired and is not to be reintroduced: Geist type, 40px pill buttons, the `ConnectedGraph` canvas, mesh gradients, grain, gradient text, sheen, floating and drifting elements, marquees, and the page loader.

**Key Characteristics:**
- One accent, coral, and one signature, the drawn line. Both are spent sparingly.
- Warm neutrals throughout: cream stage, white cards, warm ink, warm shadows.
- Primary actions are dark, not coral. One primary action per view.
- Three radii only: controls 12, cards 20, stages 28. Chips and avatars are full.
- Light and dark themes share every token name; components never write a raw colour.
- Meaning is carried by text and icon first; colour confirms it.

## Colors

A warm paper palette with a single coral accent and a frozen four-tone status language.

### Primary
- **Clay Coral** (`signal`): the accent for fills and text. The focus ring, the open-field border, the selected-option check, the active tab icon, a "ready" dot.
- **Drawn Coral** (`signal-line`): the lighter coral used only for the drawn line itself (logo stroke, hero loop, threads, empty-state drawings).
- **Burnt Coral** (`signal-deep`, `signal-ink`): text on a soft coral chip, and the deeper end of the accent.
- **Coral Wash** (`signal-soft`): the soft chip fill, text selection, and the 3 to 4px glow around a focused or open field.

### Neutral
- **Cream Stage** (`bg`): the page behind everything.
- **Well** (`bg-2`) and **Deep Well** (`bg-3`): inset areas, tracks, neutral chips, hover fill on ghost controls.
- **Card White** (`surface`) and **Raised Paper** (`surface-2`): cards, then table heads, card footers and hover fills that sit on a card.
- **Ink** (`ink`): titles and strong text. **Body Ink** (`ink-2`): body copy. **Secondary Ink** (`ink-3`): supporting text, 5.4:1 on white. **Tertiary Ink** (`ink-4`): large text and icons only, never body copy.
- **Hairline** (`line`) and **Strong Hairline** (`line-2`): card edges and row dividers, then control borders.
- **Dark Control** (`pill`, hover `pill-2`, label `pill-on`): primary buttons, the solid chip, the call bar.

### Status (frozen)
- **Act now** (`priority-high` on `priority-high-soft`): red. Conflicts, destructive actions, errors.
- **Attention** (`priority-medium` on `priority-medium-soft`): amber.
- **Informs** (`priority-low` on `priority-low-soft`): blue.
- **Done** (`ok` on `ok-soft`): green.

### Illustration
- **Paper tints** (`tint-peach`, `tint-ochre`, `tint-sage`, `tint-sky`): fills inside drawings and product visuals, one step deeper than the status softs. Not for interface chrome.
- **Stage washes** (`--wash`, `--wash-ochre`, `--wash-glow`): the peach and ochre gradients behind marketing product windows and the Home hero.

### Dark theme
`<html data-theme="dark">` flips every token for the app (`.mx-app`), auth (`.mx-auth`) and marketing (`.mx-site`). The stage becomes near-black warm brown (`dark-bg`), cards one step lighter (`dark-surface`), ink becomes cream (`dark-ink`), coral lightens (`dark-signal`), and the dark control inverts to cream with dark text (`dark-pill`, `dark-pill-on`). Wells, table heads and hairlines each have their own dark value so a well on a card stays visible.

### Named Rules
**The One Coral Rule.** Coral is the only hue used for emphasis. If two things on a screen are coral, one of them should not be.

**The Dark Primary Rule.** The primary button is the dark control, not coral. Coral marks state and the line, not the main action.

**The Frozen Priority Rule.** Red, amber, blue and green keep their meanings on every screen. They are never used decoratively, and a status is never shown by colour alone: it always has a text label and usually an icon.

**The No Raw Colour Rule.** Components use token classes. No hex, no `text-white`, `bg-white` or `text-black`; on a dark control the label is `text-pill-on`.

## Typography

**Display Font:** Syne (weights 400 and 500 only) on marketing and auth pages. Inter Tight (400 to 700) inside the app, the call and the admin consoles. Newsreader on the marketing home page only.
**Body Font:** Hanken Grotesk, for all interface and body text.
**Mono:** the system monospace, for literal code only. Inside the app `font-mono` resolves to Hanken with tabular figures.

**Character:** a plain, sturdy grotesk for everything you read, with a more characterful face reserved for titles. The app keeps its titles upright and close to the body face so screens stay calm; the public pages let the display face show more.

### Hierarchy
- **Display** (Syne 500, `clamp(2.1rem, 4.6vw, 3.5rem)`, line-height 1.04, tracking -0.022em): marketing section titles. `.display-tight` (line-height 0.96, tracking -0.03em) is for the largest statements.
- **Headline** (Inter Tight 600, `clamp(28px, 3vw, 34px)`, line-height 1.08, tracking -0.015em): the app page title in `PageHead`. One per page.
- **Title** (Hanken Grotesk 600, 17px, snug): card titles. Side-column explainers use a 22px display title.
- **Body** (Hanken Grotesk 400, 16px, line-height 1.55): body copy in `ink-2`. Secondary text is 14 to 15px in `ink-3`. Keep lines under about 68 to 75 characters.
- **Label** (Hanken Grotesk 600, 13px, no tracking, sentence case): `.kicker`, form labels at 14px, chips at 12.5px.

### Named Rules
**The Sentence Case Rule.** Labels are sentence case at normal tracking. No tracked capitals, no monospace labels.

**The Real Faces Rule.** `font-synthesis: none` is set on the body. Syne ships only 400 and 500 and has no italic, so do not ask it for bold or italic. Inside the app, emphasis is weight and colour, never italic.

**The Floor Rule.** Nothing is set below 12.5px.

## Layout

**App.** A sidebar and top bar frame every signed-in page. The sidebar is 252px open and collapses to a 76px icon rail that expands on hover or keyboard focus. Content sits in `Page`: up to 1320px wide, or held to 880px (`width="read"`) for forms and long reading, aligned to the same left edge so titles do not jump between page types. Each page opens with `PageHead`: the title, one line of context, and the page's one primary action on the right, which drops under the title below 640px. `PageColumns` gives a main column and a 340px side column (360px from xl) that drops underneath below lg. `PageGrid` is one column, two from md, optionally three from xl.

**Rhythm.** Sections and cards stack at 20px (24px between columns from xl). A card pads 16px across on a phone, 22px from sm, and 18px down. Lists and tables run edge to edge inside a flush card with hairline rows.

**Marketing.** Content is 1120px wide. Sections use `py-[clamp(64px, 9vw, 120px)]` and open with a display title held to about 17 characters wide beside a lead of about 52. Product visuals sit in a window on a peach or ochre stage; not every section gets a stage.

**Responsive.** 360px to 1600px with no horizontal page scroll. Tables stack into label and value cards below 640px. Dropdowns open as a bottom sheet on a phone. Touch targets are at least 40px.

## Elevation & Depth

Depth is mostly tonal: a cream stage, white cards on it, wells cut into cards. Shadows are warm brown, never neutral black, and they are structural, not decorative. A card rests with the faintest shadow and a hairline; larger shadows are reserved for things that float above the page.

### Shadow Vocabulary
- **Rest** (`--sh-1`, `shadow-warm-1`): `0 1px 2px rgba(60,45,35,.06), 0 1px 1px rgba(60,45,35,.04)`. Every card.
- **Raised** (`--sh-2`, `shadow-warm-2`): `0 6px 14px rgba(60,45,35,.08), 0 1px 3px rgba(60,45,35,.05)`. Small floating elements.
- **Overlay** (`--sh-3`, `shadow-warm-3`): `0 18px 40px -8px rgba(60,45,35,.22), 0 4px 10px rgba(60,45,35,.08)`. Dropdown panels, dialogs, the expanded sidebar rail.

In the dark theme the same three steps use black at higher opacity.

### Named Rules
**The No Lift Rule.** Cards and buttons do not rise on hover. Hover is a colour change; a press settles by 2% when motion is allowed.

## Shapes

One radius rule: controls 12px, cards 20px, stages and large panels 28px, chips and avatars fully round. Nothing else. A dropdown panel uses the 20px card radius with an 8px inset so its 12px rows sit concentric in the corners.

Edges are 1px hairlines. There are no coloured side bars on cards: priority is shown by a chip or icon in the content. Icons are Phosphor, regular weight by default, filled for the active navigation item.

The drawn line is a 2.2px coral stroke with round caps and joins, drawn by animating a normalized path length. It is the system's only ornament.

## Components

Quiet and exact. Every component reads tokens, keeps one job, and gives feedback through colour.

### Buttons
- **Shape:** 12px corners. Three heights only: 36, 44 and 52px. Semibold label, 14 to 15px. Icon-only buttons are squares at the same heights and need an `aria-label`.
- **Primary:** dark control fill with a cream label; hover lightens the fill. One per view.
- **Outline:** white surface, strong hairline border, ink label; hover moves to raised paper.
- **Ghost:** no edge until hover, then a well fill.
- **Danger and danger-outline:** solid red with a surface-coloured label, or red text and edge with a soft red wash on hover.
- **States:** 150ms colour transition, press scales to 0.98 under `motion-safe`, disabled is 50% opacity. Focus is a 2px coral outline offset by 2px.

### Chips
- **Style:** fully round, 12.5px semibold, 3px by 10px padding. Always carries text, usually an icon.
- **Tones:** neutral (well), accent (soft coral), high, medium, low, ok (the frozen status pairs), solid (dark control), outline (inset hairline ring), glass (translucent surface, for chips on a wash).

### Cards / Containers
- **Corner Style:** 20px, clipped.
- **Background:** white surface with a hairline border and the rest shadow. `tone="well"` is a borderless inset block for side-column explainers. `tone="danger"` tints the border red for destructive sections.
- **Structure:** a plain card pads its content. A flush card takes a `CardHead` (17px title, optional description, a control on the right), rows divided by hairlines, and an optional `CardFoot` on raised paper.

### Inputs / Fields
- **Style:** 44px tall, 12px corners, strong hairline border on white, 15px text, placeholder in secondary ink. Label above at 14px semibold.
- **Hover / Focus:** border darkens on hover; on focus the border turns coral with a soft coral glow, plus the global coral outline.
- **Error:** red border and a 14px red message under the field.
- **Dropdown:** every choice from a list uses `Dropdown`, never a native select. The trigger matches the field (44, 40 or 36px; `round` for toolbar pills); the panel is a card with the overlay shadow, 40px rows, a coral check on the selected option, and a bottom sheet with 52px rows on a phone.

### Navigation
- **Sidebar:** icon and label rows; the current item is a white card with a coral filled icon. Collapses to a 76px rail.
- **Tabs (`TabNav`):** route links, not ARIA tabs. 40px tall, 12px corners, 14px semibold. Idle is secondary ink with a well hover; current is a white card, ink label and coral filled icon. Counts sit in a soft coral pill. Scrolls sideways when it runs out of room.

### Empty and error states
- **EmptyState:** a small coral line drawing specific to the screen, drawn once on mount, with a plain sentence and the next action.
- **ErrorState:** a frayed line and a Retry button.
- **Skeletons:** built from the same page frame, hidden for the first 150ms, then a gentle pulse. They hold the final size so nothing jumps.

### The line (signature)
A coral stroke that appears only where it means "this carries forward": the logo, the hero loop on the marketing home, the page thread between marketing sections, the memory thread joining recent meetings on Home, empty-state drawings. When two columns relate, align them on a grid and join them with one straight vertical thread and beads. Draw timing uses `--ease-draw` over about 1.1s.

### Motion
One orchestrated moment per view, usually a line drawing itself. Motion that answers an action (opening a menu, switching a tab, confirming) runs 150 to 250ms on `--ease-out`. Overlays settle 4px with a slight scale, never a bounce. Under `prefers-reduced-motion` everything appears in its final state.

## Do's and Don'ts

### Do:
- **Do** use token classes for every colour, radius and shadow, so both themes work without extra code.
- **Do** keep one dark primary button per view and put it on the right of the page title.
- **Do** show status with a chip that has a text label, and usually an icon, in the frozen tones.
- **Do** use the three radii (12, 20, 28) and full rounding for chips and avatars.
- **Do** compose `Page`, `PageHead`, `Card`, `Chip`, `Button`, `Dropdown`, `TabNav`, `EmptyState` and `ErrorState` from `src/components/ui/` before writing new markup.
- **Do** design every state: empty, loading, error, offline and reconnecting.
- **Do** give every animation a reduced-motion path that shows the final state.
- **Do** write labels in plain sentence case, with buttons that say exactly what happens.

### Don't:
- **Don't** use coral for a primary button, or for more than one point of emphasis on a screen.
- **Don't** add a coloured bar to the edge of a card to show priority.
- **Don't** add hover lift, parallax, marquees, floating shapes, gradient text, grain or mesh backgrounds.
- **Don't** draw decorative connectors between loosely aligned items. The line is for things that carry forward.
- **Don't** use a native `<select>`; the lint rule and `tests/no-native-select.test.ts` fail on one.
- **Don't** use tracked uppercase labels, monospace for labels or meta, or text under 12.5px.
- **Don't** use `ink-4` for body-sized text; it is for large text and icons only.
- **Don't** use em or en dashes, emoji, or decorative status dots in visible copy. A red dot is only for something that is live.
- **Don't** reintroduce Geist, the 40px pill radius, `ConnectedGraph`, or the `Orb`.
