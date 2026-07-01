# Mytheus — Landing Page (start here)

This is the **actual state** README for the `web/` app as it exists today: a standalone
Next.js 14 marketing **landing page** for Mytheus. If you're a new session or teammate picking
this up, read this first, then `PROGRESS.md` for the full detail.

> Two other docs in this folder — `README.md` and `system.md` — describe the *full* `reprise-ui`
> product (meeting room, agent sidebar, dashboards, billing, admin). That is the **spec / future
> phases**, NOT what's built here yet. This `web/` app is the landing page only.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000   (predev auto-cleans a stale prod .next)
npm run build    # production build (15 static routes)
npm run lint
npm run clean    # manually clear a stale prod .next if dev 404s on chunks
```

Requires Node 20+. Stack: **Next.js 14.2.35** (App Router, TypeScript) · **Tailwind 3.4** ·
**framer-motion 12** · React 18. No Clerk / TanStack / Zustand / shadcn yet — those arrive with
the authenticated app.

## Status

✅ **Complete and shipping-green.** `tsc --noEmit` clean, `next lint` clean, `next build` clean
(15 static pages, `/` = 168 kB First Load JS), every animation reduced-motion-guarded, no dead
links. As of 2026-06-30 the 8 secondary marketing/legal pages are **real** (no longer "Coming
soon") and the hero live-capture card was redesigned. Details + build-gotchas in `PROGRESS.md`.

## The 30-second map

- **Design:** warm **"Claude light"** palette (cream `#faf9f5` base + clay/coral `#d97757`
  signal), **all-grotesk tight type** (Geist; Fraunces serif was dropped), soft pills + big
  rounded cards. The signature visual is an interactive **`<ConnectedGraph>`** (a canvas
  knowledge-graph that brightens near the pointer) — it **replaced** the old static glossy
  `<Orb>`. Several sections are bespoke scripted demos of the product loop. All tokens live in
  `src/app/globals.css`.
- **Positioning (locked):** Mytheus is its OWN meeting platform — no Zoom/Meet/Teams/Slack/Jira
  integrations. Sells: own meetings · a personal AI agent per participant · **agents that
  collaborate across meetings** (the differentiator).
- **Page:** `src/app/(marketing)/page.tsx` composes the sections (two-act hero → in-the-room
  capture → statement → steps → memory timeline → FAQ → CTA → footer). The hero is a pinned two-act
  stage: a live "Q3 GTM sync" capture card gathers + exits left, then page two assembles "Your
  shorthand, returned as minutes." letter-by-letter with the live `NotesWidget` (the old
  notes-enhance section now lives inside the hero). Atoms (`PillCTA`, `OutlinePill`, icons) in
  `src/components/landing/ui.tsx`; living graph in `ConnectedGraph.tsx`; motion in `motion.tsx`.
- **Routes:** grouped into `(marketing)` / `(auth)`, with empty `(app)`/`(admin)`/`api`
  placeholders for the future authenticated shell. The secondary marketing/legal routes
  (enterprise, students + verify, blog, careers, privacy, terms, security) are **real pages** built
  on a shared `src/components/marketing/` shell (`PageShell` / `PageHero` / `Prose`); only the two
  auth routes are still "Coming soon" (`ComingSoon.tsx`). Plus a real on-brand `not-found.tsx`.
- **Orphaned:** six old "hand-set machine" components (`ColorBlocks`, `LiveSimulation`,
  `LogoGrid`, `ScrollStory`, `TypographyBreak`, `WorksEverywhere`) are kept but no longer
  imported — see `PROGRESS.md`.

## Where to look

| You want… | Go to |
| --- | --- |
| **Design principles (the why — colour, type, motion, components)** | **`design.md`** |
| Full progress log, decisions, what's next | `PROGRESS.md` |
| Design tokens / colors / fonts | `src/app/globals.css`, `src/app/layout.tsx` |
| Page composition | `src/app/(marketing)/page.tsx` |
| A specific section | `src/components/landing/*` (table in `PROGRESS.md`) |
| The product spec (future phases) | `README.md`, `system.md`, `../reprise-docs/20-frontend-architecture.md` |

## Conventions

Brand name is **Mytheus** (never "NEXUS" in copy — that's only the PDF codename). When this lands
in the `reprise-ui` repo, commits/PRs must **NOT** carry a `Co-Authored-By` footer; use
conventional commits.
