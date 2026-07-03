# Design system

How the visual layer of `mytheus-ui` works: one token layer in CSS custom
properties, a small set of UI primitives that read those tokens, and a frozen
priority color language. Components never hold a raw hex value - if a color
is not a token, it does not ship.

## The token layer

All tokens live in `../src/app/globals.css` under `:root` and are mirrored
into Tailwind color names in `../tailwind.config.ts`. Read them as Tailwind
classes (`bg-signal`, `text-ink-3`, `border-line`) or as `var(--signal)` in
hand-written CSS.

### Canvas and ink

| Token | Tailwind | Use |
| --- | --- | --- |
| `--bg` | `bg` | page canvas (warm cream) |
| `--bg-2` | `bg-2` | raised fills, hover fills |
| `--bg-3` | `bg-3` | section bands, deep card fills |
| `--surface` | `surface` | white card surface |
| `--ink` | `ink` | strongest text, wordmark |
| `--ink-display` | `ink-display` | display headings |
| `--ink-2` | `ink-2` | nav and strong body |
| `--ink-3` | `ink-3` | muted body, captions |
| `--line` / `--line-2` | `line`, `line-2` | hairlines, stronger borders |
| `--pill` | `pill` | warm near-black fills (dark buttons, video tiles) |

### The one signal

Clay/coral is the only brand accent. Everything that glows, fills, or asks
for attention uses it.

| Token | Tailwind | Use |
| --- | --- | --- |
| `--signal` | `signal` | primary accent, CTAs, active states |
| `--signal-deep` | `signal-deep` | hover/pressed accent, accent text |
| `--signal-bright` | `signal-bright` | light accent fills |
| `--signal-soft` | `signal-soft` | soft accent wash (chips, highlights) |
| `--signal-glow` | n/a | radial glow gradients |

### Priority color language (frozen)

Red means act now. Yellow means attention. Blue means info. This mapping is
product law (it comes from the agent architecture docs) - never repurpose
these hues for anything else, and never invent a fourth priority color.

| Token | Tailwind | Meaning |
| --- | --- | --- |
| `--priority-high` / `--priority-high-soft` | `priority-high`, `priority-high-soft` | act now (conflict banners, over-capacity) |
| `--priority-medium` / `--priority-medium-soft` | `priority-medium`, `priority-medium-soft` | attention (dependency warnings, near-capacity) |
| `--priority-low` / `--priority-low-soft` | `priority-low`, `priority-low-soft` | info (suggestions, detected decisions) |

The `-soft` variants are the wash behind text set in the base color, tuned to
sit on the cream canvas with readable contrast.

### Radii and easing

| Token | Tailwind | Value |
| --- | --- | --- |
| `--radius-pill` | `rounded-pill` | 40px - buttons, nav pills |
| `--radius-card` | `rounded-card` | 24px - cards, panels |
| `--ease-out` / `--ease-soft` | n/a | the two easing curves every transition uses |

## UI primitives (`../src/components/ui/`)

The only visual vocabulary for app screens. Feature components compose these
and never add ad-hoc styling.

| Component | Props | Notes |
| --- | --- | --- |
| `Button` / `LinkButton` | `variant: primary, secondary, outline, ghost, danger`; `size: sm, md, lg` | `LinkButton` renders a Next `Link` with identical looks |
| `Card` | `priorityStrip?: high, medium, low` | white surface, 24px radius; the strip is a left edge bar in the frozen priority color |
| `Badge` | `tone: default, success, warning, danger, high, medium, low` | pill label; `high/medium/low` map to the priority tokens |
| `Avatar` | `name`, `size: sm, md, lg` | initials on a `--pill` disc |
| `Input` | `label?`, `error?` | labeled input with focus ring from `--signal` |
| `EmptyState` | `title`, `description?`, `action?` | dashed placeholder for empty lists |
| `Modal` | `open`, `onClose`, `title` | accessible dialog |

Landing/marketing pages have their own atoms in
`../src/components/landing/ui.tsx` (`PillCTA`, `OutlinePill`, `IconCircle`,
`Eyebrow`, `IconChip`) and mockup atoms in
`../src/components/landing/mockups.tsx` (`MockWindow`, `NoteLine`, `Avatar`,
`Chip`). Same rule: tokens only.

## Theming

Dark mode and per-tenant theming are a token swap: redefine the custom
properties under a scope class or media query and every component follows.
Nothing else changes because nothing reads a literal color.

## Adding a component

1. Check whether an existing primitive plus composition covers it. Most
   "new components" are a `Card` with content.
2. Put app-wide primitives in `../src/components/ui/`, feature compositions
   next to their feature (`../src/components/meeting/`,
   `../src/components/sidebar/`, `../src/components/marketing/`).
3. Read every color, radius, and easing from tokens. If a value you need is
   missing, add a token first, then use it.
4. Server component by default; add `"use client"` only for interactivity.
5. Keyboard and focus behavior are part of the component, not a follow-up:
   focus-visible rings come free from `globals.css`, but tab order, `aria-*`,
   and hit-target size (40px+) are yours.
